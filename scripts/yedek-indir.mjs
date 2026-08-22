/**
 * Yedeği sunucudan bu makineye çeker — üç katmanın ikincisi (F0.4).
 *
 * Sunucudaki `scripts/yedek-al.sh` her gece dump alıyor ama dump sunucunun kendi
 * diskinde duruyor. Sunucu tümden kaybedilirse yedek de kaybedilir; "yedeğim var"
 * sanmak, yedeği olmamaktan daha tehlikeli.
 *
 * Nesne deposu (DigitalOcean Spaces) aylık ücretli. Kullanıcı sayısı henüz sıfırken
 * bunun için ödeme yapmak yerine kopya bu makineye çekiliyor. Şart karşılanıyor:
 * kopya sunucunun DIŞINDA.
 *
 * Dürüst sınır: bu makine kapalıysa o gece çekilmez. Betik bunu telafi ediyor —
 * her çalıştığında YERELDE OLMAYAN bütün dump'ları indiriyor, yalnızca sonuncuyu değil.
 * Bir hafta kapalı kalan bilgisayar, açıldığında haftanın hepsini alır.
 *
 * Kullanım:
 *   node scripts/yedek-indir.mjs                 # eksikleri indir
 *   node scripts/yedek-indir.mjs --liste         # yalnızca durumu yaz
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUNUCU = process.env.SWIIP_SUNUCU ?? 'root@157.230.118.230';
const ANAHTAR = process.env.SWIIP_SSH_ANAHTARI ?? join(homedir(), '.ssh', 'made2fit_deploy');
const UZAK_DIZIN = '/opt/swiip/yedekler';

/**
 * Yerel hedef bilinçli olarak OneDrive'ın dışında.
 *
 * Dump şifresiz ve içinde sağlık verisi var. Bulut eşitlemesine bırakmak, ürünün
 * kendi gizlilik duruşuyla çelişirdi: fotoğrafı sunucuya bile yazmayan bir uygulamanın
 * tüm veritabanını kişisel bir buluta kopyalaması tutarsız olur.
 */
const YEREL_DIZIN = process.env.SWIIP_YEDEK_DIZINI ?? join(homedir(), 'Swiip-yedekler');

/** Yerelde bu günden eskiler siliniyor. Sunucudaki saklama süresiyle aynı. */
const SAKLAMA_GUN = Number(process.env.SWIIP_YEDEK_SAKLAMA_GUN ?? 30);

/** Bundan küçük dosya dump değildir; pg_dump yarıda kesilmiş demektir. */
const ASGARI_BAYT = 4096;

const SADECE_LISTE = process.argv.includes('--liste');

function calistir(komut, argumanlar, secenekler = {}) {
  const sonuc = spawnSync(komut, argumanlar, { encoding: 'utf8', ...secenekler });
  if (sonuc.error) throw sonuc.error;
  return sonuc;
}

function uzakDosyalar() {
  const sonuc = calistir('ssh', [
    '-i',
    ANAHTAR,
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=15',
    SUNUCU,
    `ls -1 ${UZAK_DIZIN} 2>/dev/null || true`,
  ]);

  if (sonuc.status !== 0) {
    throw new Error(`Sunucuya bağlanılamadı (${sonuc.status}): ${sonuc.stderr.trim()}`);
  }

  return sonuc.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.endsWith('.dump'));
}

function yerelDosyalar() {
  mkdirSync(YEREL_DIZIN, { recursive: true });
  return new Set(readdirSync(YEREL_DIZIN).filter((d) => d.endsWith('.dump')));
}

function indir(ad) {
  const hedef = join(YEREL_DIZIN, ad);
  const sonuc = calistir('scp', [
    '-i',
    ANAHTAR,
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=15',
    `${SUNUCU}:${UZAK_DIZIN}/${ad}`,
    hedef,
  ]);

  if (sonuc.status !== 0) {
    throw new Error(`İndirilemedi: ${ad} — ${sonuc.stderr.trim()}`);
  }

  // Boyut kontrolü: yarım inen dosya, olmayan yedekten kötüdür — var sanılır.
  const boyut = statSync(hedef).size;
  if (boyut < ASGARI_BAYT) {
    unlinkSync(hedef);
    throw new Error(`${ad} yalnızca ${boyut} bayt indi; silindi.`);
  }

  return boyut;
}

/** Saklama süresini geçen yerel kopyaları siler. */
function eskileriTemizle() {
  const sinir = Date.now() - SAKLAMA_GUN * 24 * 60 * 60 * 1000;
  let silinen = 0;

  for (const ad of readdirSync(YEREL_DIZIN)) {
    if (!ad.endsWith('.dump')) continue;
    const yol = join(YEREL_DIZIN, ad);
    if (statSync(yol).mtimeMs < sinir) {
      unlinkSync(yol);
      silinen += 1;
    }
  }

  return silinen;
}

const damga = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

try {
  const uzak = uzakDosyalar();
  const yerel = yerelDosyalar();
  const eksik = uzak.filter((ad) => !yerel.has(ad));

  console.log(`[${damga()}] sunucuda ${uzak.length} dump, yerelde ${yerel.size}`);
  console.log(`hedef: ${YEREL_DIZIN}`);

  if (uzak.length === 0) {
    console.error('Sunucuda hiç dump yok. Gece işi çalışmamış olabilir.');
    process.exit(1);
  }

  if (SADECE_LISTE) {
    console.log(eksik.length === 0 ? 'Eksik yok.' : `Eksik ${eksik.length}: ${eksik.join(', ')}`);
    process.exit(0);
  }

  let toplamBayt = 0;
  for (const ad of eksik) {
    const boyut = indir(ad);
    toplamBayt += boyut;
    console.log(`  indi  ${ad}  ${(boyut / 1024 / 1024).toFixed(1)} MB`);
  }

  const silinen = eskileriTemizle();

  if (eksik.length === 0) {
    console.log('Eksik yok; yerel kopya güncel.');
  } else {
    console.log(`${eksik.length} dosya indi (${(toplamBayt / 1024 / 1024).toFixed(1)} MB).`);
  }
  if (silinen > 0) console.log(`${silinen} eski kopya silindi (${SAKLAMA_GUN} gün).`);

  // En yeni kopyanın yaşı: sessizce eskiyen bir yedek, yedek değildir.
  const enYeni = [...yerelDosyalar()].sort().pop();
  if (enYeni) {
    const yas = (Date.now() - statSync(join(YEREL_DIZIN, enYeni)).mtimeMs) / 3_600_000;
    console.log(`en yeni yerel kopya: ${enYeni} (${yas.toFixed(1)} saat önce)`);
    if (yas > 48) {
      console.error('UYARI: en yeni kopya 48 saatten eski. Gece işi ya da bu betik çalışmıyor.');
      process.exit(2);
    }
  }
} catch (hata) {
  console.error(`HATA: ${hata instanceof Error ? hata.message : String(hata)}`);
  process.exit(1);
}
