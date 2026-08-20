/**
 * Yayın öncesi paket denetimi.
 *
 * Play Console'a yüklenecek paketin **gerçekten çalışabilir** olduğunu doğrular.
 *
 * Neden var: 2026-08-20'de Play'e yükleme hazırlanırken derlenmiş release paketinde
 * API adresi olarak `http://127.0.0.1:3311` gömülü olduğu görüldü — geliştirme
 * makinesinin kendi adresi. Yayınlansaydı hiçbir kullanıcı kayıt bile olamazdı ve
 * uygulama herkeste "İnternet yok" derdi. Hata derleme sırasında hiçbir uyarı üretmiyor:
 * `EXPO_PUBLIC_API_URL` ne yazıyorsa o gömülüyor.
 *
 * Bu, gözle yakalanacak bir şey değil. Paketin içine bakmak gerekiyor.
 *
 * Çalıştırma:
 *   node scripts/yayin-denetimi.mjs
 *   node scripts/yayin-denetimi.mjs <paket-yolu>
 */
import { existsSync, readFileSync, statSync } from 'node:fs';

const VARSAYILAN_PAKET =
  'apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle';

const paketYolu = process.argv[2] ?? VARSAYILAN_PAKET;

/** Kullanıcının cihazından erişilemeyecek adresler. */
const YEREL_ADRESLER = [
  'localhost',
  '127.0.0.1',
  '10.0.2.2', // Android emülatöründen ana makineye
  '0.0.0.0',
  '192.168.',
  '::1',
];

/**
 * Gerekçeli muafiyetler.
 *
 * `guvenlik-denetimi.mjs` ile aynı desen: süresiz ve gerekçesiz muafiyet yok. Aranan şey
 * BİZİM API adresimiz; üçüncü taraf bir SDK'nın kendi geliştirme dizesi uygulamanın ağ
 * davranışını belirlemiyor ve onu kusur saymak aracı gürültüye boğar.
 */
const MUAFIYETLER = [
  {
    kalip: 'localhost:8081/rc-host',
    gerekce:
      'react-native-purchases SDK paywall gelistirme sunucusu referansi. Bizim kodumuz ' +
      'degil, calisma zamaninda kullanilmiyor, API adresimizle ilgisi yok.',
  },
];

const bulgular = [];
const gecenler = [];

if (!existsSync(paketYolu)) {
  console.error(`Paket bulunamadı: ${paketYolu}`);
  console.error('Önce release derlemesi yapılmalı (gradlew assembleRelease veya bundleRelease).');
  process.exit(2);
}

const boyut = statSync(paketYolu).size;
const paket = readFileSync(paketYolu, 'latin1');

console.log(`Paket: ${paketYolu}`);
console.log(`Boyut: ${(boyut / 1024 / 1024).toFixed(1)} MB`);
console.log('');

// --- 1. Yerel API adresi paketin içinde olamaz ---
for (const adres of YEREL_ADRESLER) {
  const kacisli = adres.replace(/\./g, '\\.');
  const isabetler = [...paket.matchAll(new RegExp(`.{0,45}${kacisli}.{0,45}`, 'g'))].map(
    (m) => m[0],
  );

  // Muaf bağlamlar elenir: aranan şey BİZİM API adresimiz.
  const gercek = isabetler.filter((baglam) => !MUAFIYETLER.some((m) => baglam.includes(m.kalip)));

  if (gercek.length > 0) {
    const ornek = gercek[0].replace(/[^\x20-\x7e]/g, '·');
    bulgular.push(
      `YEREL ADRES: "${adres}" pakette ${gercek.length} kez geçiyor — ör. ...${ornek}...`,
    );
  } else if (isabetler.length > 0) {
    gecenler.push(`"${adres}" yalnızca muaf bağlamda geçiyor (${isabetler.length} isabet)`);
  }
}
if (bulgular.length === 0) gecenler.push('Pakette bize ait yerel adres yok');

// --- 2. Bir üretim API adresi GERÇEKTEN olmalı ---
const httpsAdresler = [...new Set(paket.match(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])];
const kendiAdres = httpsAdresler.filter((u) => /made2fit/i.test(u));
if (kendiAdres.length === 0) {
  bulgular.push(
    'ÜRETİM ADRESİ YOK: pakette made2fit alan adına giden bir https adresi bulunamadı. ' +
      'EXPO_PUBLIC_API_URL boş bırakılmış olabilir.',
  );
} else {
  gecenler.push(`Üretim adresi var: ${kendiAdres.slice(0, 3).join(', ')}`);
}

// --- 3. Düz HTTP ile kendi sunucumuza gidilmiyor ---
const httpKendi = [...new Set(paket.match(/http:\/\/[a-z0-9.-]*made2fit[a-z0-9.-]*/gi) ?? [])];
if (httpKendi.length > 0) {
  bulgular.push(`ŞİFRESİZ: ${httpKendi.join(', ')} — sağlık verisi düz HTTP ile gitmez`);
} else {
  gecenler.push('Kendi sunucumuza düz HTTP yok');
}

console.log('GEÇENLER:');
for (const g of gecenler) console.log('  ✓ ' + g);
console.log('');

if (bulgular.length === 0) {
  console.log('Paket yayına uygun.');
} else {
  console.log(`BULGULAR (${bulgular.length}):`);
  for (const b of bulgular) console.log('  ✗ ' + b);
  console.log('');
  console.log("Bu paket Play Console'a YÜKLENMEMELİ.");
  process.exitCode = 1;
}
