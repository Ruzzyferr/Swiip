/**
 * `expo prebuild` çıktısına Play yükleme imzasını ekler.
 *
 * `android/` klasörü üretilen bir çıktı (gitignore'da) ve her prebuild'de sıfırlanıyor.
 * İmza yapılandırmasını oraya elle yazmak, bir sonraki prebuild'de sessizce kaybolur —
 * ve bunu ancak yayına çıkarken fark ederiz.
 *
 * Bu yüzden yapılandırma burada, depoda duruyor ve prebuild'den sonra uygulanıyor.
 * Parolalar `apps/mobile/imza.properties` içinde ve o dosya depoya girmiyor.
 *
 * Çalıştırma:
 *   node scripts/android-imza.mjs
 *
 * Anahtar yoksa betik sessizce çıkar: geliştirme derlemesi imzasız da çalışır ve
 * anahtarı olmayan bir geliştiriciyi durdurmanın anlamı yok.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const ozellikler = join(kok, 'apps', 'mobile', 'imza.properties');
const gradle = join(kok, 'apps', 'mobile', 'android', 'app', 'build.gradle');

if (!existsSync(ozellikler)) {
  console.log('imza.properties yok — imzasız devam ediliyor.');
  process.exit(0);
}

if (!existsSync(gradle)) {
  console.error('android/app/build.gradle yok. Önce `expo prebuild` çalıştır.');
  process.exit(1);
}

/** `anahtar=deger` biçimini okur; yorum ve boş satırları atlar. */
function ozellikleriOku(yol) {
  const sonuc = {};
  for (const satir of readFileSync(yol, 'utf8').split('\n')) {
    const temiz = satir.trim();
    if (temiz === '' || temiz.startsWith('#')) continue;
    const ayirac = temiz.indexOf('=');
    if (ayirac === -1) continue;
    sonuc[temiz.slice(0, ayirac).trim()] = temiz.slice(ayirac + 1).trim();
  }
  return sonuc;
}

const o = ozellikleriOku(ozellikler);
const gerekli = [
  'SWIIP_ANAHTAR_DOSYASI',
  'SWIIP_ANAHTAR_ALIAS',
  'SWIIP_ANAHTAR_PAROLA',
  'SWIIP_DEPO_PAROLA',
];
const eksik = gerekli.filter((a) => !o[a]);
if (eksik.length > 0) {
  console.error(`imza.properties eksik anahtar taşıyor: ${eksik.join(', ')}`);
  process.exit(1);
}

if (!existsSync(o.SWIIP_ANAHTAR_DOSYASI)) {
  console.error(`Anahtar dosyası bulunamadı: ${o.SWIIP_ANAHTAR_DOSYASI}`);
  process.exit(1);
}

let kaynak = readFileSync(gradle, 'utf8');

if (kaynak.includes('swiipYukleme')) {
  console.log('imza yapılandırması zaten uygulanmış.');
  process.exit(0);
}

/**
 * Expo'nun ürettiği dosyada `signingConfigs { debug { ... } }` bloğu var ve
 * `buildTypes.release` hata ayıklama anahtarıyla imzalanıyor — yayına çıkacak yapı
 * için kabul edilemez. İkisini de değiştiriyoruz.
 */
const imzaBlogu = `        swiipYukleme {
            storeFile file('${o.SWIIP_ANAHTAR_DOSYASI}')
            storePassword '${o.SWIIP_DEPO_PAROLA}'
            keyAlias '${o.SWIIP_ANAHTAR_ALIAS}'
            keyPassword '${o.SWIIP_ANAHTAR_PAROLA}'
        }
`;

const imzaYeri = kaynak.indexOf('signingConfigs {');
if (imzaYeri === -1) {
  console.error('build.gradle içinde signingConfigs bloğu bulunamadı.');
  process.exit(1);
}
const satirSonu = kaynak.indexOf('\n', imzaYeri) + 1;
kaynak = kaynak.slice(0, satirSonu) + imzaBlogu + kaynak.slice(satirSonu);

// Yayın yapısı artık hata ayıklama anahtarıyla değil, yükleme anahtarıyla imzalanıyor.
const eskiImza = 'signingConfig signingConfigs.debug\n            shrinkResources';
const yeniImza = 'signingConfig signingConfigs.swiipYukleme\n            shrinkResources';

if (kaynak.includes(eskiImza)) {
  kaynak = kaynak.replace(eskiImza, yeniImza);
} else {
  // Expo sürümleri arasında satır düzeni değişebiliyor; release bloğunu ayrıca ara.
  const yayin = kaynak.indexOf('release {');
  if (yayin === -1) {
    console.error('build.gradle içinde release bloğu bulunamadı.');
    process.exit(1);
  }
  const yayinSatirSonu = kaynak.indexOf('\n', yayin) + 1;
  kaynak =
    kaynak.slice(0, yayinSatirSonu) +
    '            signingConfig signingConfigs.swiipYukleme\n' +
    kaynak.slice(yayinSatirSonu);
}

// Artık kendi anahtarımız var; Expo'nun uyarı yorumu yanıltıcı kalıyor.
//
// Girinti [^\S\n]* ile eşleniyor, \s* ile değil: \s satır sonunu da kapsıyor ve yorumun
// bir üstündeki `release {` satırının sonunu yiyip iki satırı birleştiriyordu.
const UYARI = /[^\S\n]*\/\/ Caution! In production[^\n]*\n[^\S\n]*\/\/ see [^\n]*\n/g;
kaynak = kaynak.replace(UYARI, '');

writeFileSync(gradle, kaynak, 'utf8');
console.log('imza yapılandırması uygulandı: swiipYukleme');
