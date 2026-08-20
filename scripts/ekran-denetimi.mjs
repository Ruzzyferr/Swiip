/**
 * Ekran denetimi — 32 ekranın tamamı, statik.
 *
 * Ekran görüntüsü bir ekranın o anki hâlini gösterir; bu denetim **kuralın her ekranda**
 * tutup tutmadığını gösterir. İkisi birbirinin yerine geçmez: görüntü "koyu temada bu
 * bant okunmuyor" der, denetim "on iki ekranda yükleniyor durumu yok" der.
 *
 * Aranan kusur sınıfı `docs/derin-inceleme-promptu.md` bölüm C'den:
 *
 *   1. Dokunma hedefi 44 px altında kalan var mı
 *   2. Etkileşimli ögede `accessibilityRole` / `accessibilityLabel` var mı
 *   3. Yükleniyor / boş / hata durumları tasarlanmış mı, yoksa boş ekran mı
 *   4. Oyunlaştırma sızmış mı (rozet, seri, konfeti, kutlama)
 *   5. Sabit renk kodu var mı (tema yerine)
 *
 * Çalıştırma: node scripts/ekran-denetimi.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const dosyalar = execSync('git ls-files "apps/mobile/app/*.tsx"', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.endsWith('_layout.tsx'));

/** Veri çeken ekranlar yükleniyor/hata durumu göstermek zorunda. */
const VERI_CEKEN = /\bistek(<|\()/;

/** Oyunlaştırma yasağı — `CLAUDE.md` kilitli kararı. */
const OYUNLASTIRMA =
  /\b(rozet|badge|streak|seri sayısı|konfeti|confetti|tebrikler|kutlama|elmas|madalya|puanın)\b/i;

/** Tema dışı sabit renk: koyu temada kırılır. */
const SABIT_RENK = /(?:color|backgroundColor|borderColor)\s*:\s*'#[0-9a-fA-F]{3,8}'/;

/**
 * Yükleniyor durumu gerekmeyen ekranlar — gerekçeli muafiyet.
 *
 * `guvenlik-denetimi.mjs` ile aynı desen: süresiz ve gerekçesiz muafiyet yok.
 * Boş bırakılan bir kural, hiç olmayan bir kuraldan tehlikelidir; ama her koşuda
 * kırmızı gösteren bir araç da kimsenin bakmadığı bir araç olur.
 */
const YUKLENIYOR_MUAF = {
  'ayarlar/bildirimler.tsx':
    'Tercihler cihazdaki önbellekten anında geliyor; ağdan gelen tek şey hangi günlere ' +
    'hatırlatma kurulacağı. Boş ekran göstermek yerine tercihleri hemen çizmek doğru. ' +
    'Ağ başarısız olursa kullanıcıya ayrıca söyleniyor (kaydedildiProgramYok).',
};

const bulgular = [];
const satirlar = [];

/**
 * Yorumlar taramanın dışında.
 *
 * İlk hâli ham kaynağı tarıyordu ve `blok-sonu.tsx` içindeki
 * "Kutlama yok, konfeti yok" YORUMUNU oyunlaştırma ihlali sandı. Kuralı anlatan
 * bir yorumu kuralın ihlali saymak, aracı güvenilmez yapar.
 */
function yorumlariAt(kaynak) {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

for (const yol of dosyalar) {
  const ham = readFileSync(yol, 'utf8');
  const kod = yorumlariAt(ham);
  const ad = yol.replace('apps/mobile/app/', '');
  const sorunlar = [];

  // --- 1 & 2: etkileşimli ögeler ---
  const pressableSayisi = (kod.match(/<Pressable\b/g) || []).length;
  const rolSayisi = (kod.match(/accessibilityRole=/g) || []).length;
  const etiketSayisi = (kod.match(/accessibilityLabel=/g) || []).length;

  if (pressableSayisi > 0 && rolSayisi < pressableSayisi) {
    sorunlar.push(
      `${pressableSayisi} Pressable ama ${rolSayisi} accessibilityRole — ekran okuyucu ne olduğunu söyleyemez`,
    );
  }

  /**
   * Ham Pressable'da dokunma hedefi: minHeight ya da tema.dokunmaHedefi olmalı.
   *
   * İlk hâli açılış etiketini `<Pressable\b[\s\S]{0,400}?>` ile kesiyordu. O regex
   * `onPress={() => ...}` içindeki `>` karakterinde duruyor, yani `style` bloğunu HİÇ
   * görmüyor ve on iki ekranı yanlışlıkla kusurlu gösteriyordu. Etiketi ayrıştırmaya
   * çalışmak yerine sabit bir pencereye bakmak burada hem yeterli hem güvenli.
   */
  for (const eslesme of kod.matchAll(/<Pressable\b/g)) {
    const pencere = kod.slice(eslesme.index, eslesme.index + 1200);
    const hedefVar = /dokunmaHedefi|minHeight|hitSlop|paddingVertical|height:/.test(pencere);
    if (!hedefVar) {
      const satir = kod.slice(0, eslesme.index).split('\n').length;
      sorunlar.push(`satır ${satir}: dokunma hedefi belirtilmemiş Pressable (44 px kuralı)`);
    }
  }

  // --- 3: durum kapsamı ---
  if (VERI_CEKEN.test(kod) && !YUKLENIYOR_MUAF[ad]) {
    if (!/Yukleniyor|yukleniyor/.test(kod)) sorunlar.push('veri çekiyor ama yükleniyor durumu yok');
  }
  if (VERI_CEKEN.test(kod)) {
    // "Bulunamadı" da bir boş durumdur; yalnızca BosDurum bileşenini aramak dar kalıyordu.
    if (!/BosDurum|bos[BG]|Uyari|hata|[Bb]ulunamadi|[Bb]ulunamadı/i.test(kod)) {
      sorunlar.push('veri çekiyor ama boş/hata durumu yok');
    }
  }

  // --- 4: oyunlaştırma ---
  const oyun = kod.match(OYUNLASTIRMA);
  if (oyun) sorunlar.push(`OYUNLAŞTIRMA: "${oyun[0]}"`);

  // --- 5: sabit renk ---
  const renk = kod.match(SABIT_RENK);
  if (renk) sorunlar.push(`sabit renk kodu: ${renk[0]} — koyu temada kırılır`);

  satirlar.push(
    `${ad.padEnd(34)} Pressable ${String(pressableSayisi).padStart(2)} · rol ${String(rolSayisi).padStart(2)} · etiket ${String(etiketSayisi).padStart(2)}${sorunlar.length ? '  <-- ' + sorunlar.length : ''}`,
  );
  for (const s of sorunlar) bulgular.push(`${ad}: ${s}`);
}

console.log(`Taranan ekran: ${dosyalar.length}`);
console.log('');
for (const s of satirlar) console.log('  ' + s);
console.log('');
if (bulgular.length === 0) {
  console.log('Ekran denetimi temiz.');
} else {
  console.log(`BULGULAR (${bulgular.length}):`);
  for (const b of bulgular) console.log('  - ' + b);
  process.exitCode = 1;
}
