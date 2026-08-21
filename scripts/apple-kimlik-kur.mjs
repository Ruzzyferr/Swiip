/**
 * iOS dağıtım kimlik bilgilerini üretir ve EAS'in okuyacağı `credentials.json`'ı yazar.
 *
 * Neden elle: `eas build --platform ios` ilk kez çalışırken sertifikayı etkileşimli
 * onayla kuruyor; `--non-interactive` ve `--freeze-credentials` bunu atlatmıyor. Bu
 * ortamda etkileşimli komut yok. O yüzden sertifika ve profil Apple'ın API'siyle burada
 * üretiliyor ve EAS'e dosya olarak veriliyor.
 *
 * Özel anahtar BURADA üretiliyor ve burada kalıyor. Apple'daki mevcut sertifika
 * (EAS'in ürettiği) kullanılamaz: onun özel anahtarı Expo'nun sunucusunda ve indirilemez.
 * Sertifika özel anahtarsız imzalamaya yaramaz.
 *
 * Üretilen dosyalar `apps/mobile/kimlik/` altında ve .gitignore'da.
 *
 *   node scripts/apple-kimlik-kur.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apple } from './apple-api.mjs';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const dizin = join(kok, 'apps', 'mobile', 'kimlik');
const BUNDLE = 'app.swiip';
const PROFIL_ADI = 'Swiip App Store';
/** .p12 parolası: EAS'e credentials.json ile birlikte veriliyor, gizli değil ama boş da olamaz. */
const P12_PAROLA = 'swiip-uretim';

mkdirSync(dizin, { recursive: true });

const anahtarYolu = join(dizin, 'dagitim.key');
const csrYolu = join(dizin, 'dagitim.csr');
const cerYolu = join(dizin, 'dagitim.cer');
const p12Yolu = join(dizin, 'dagitim.p12');
const profilYolu = join(dizin, 'swiip-appstore.mobileprovision');

function openssl(...argumanlar) {
  return execFileSync('openssl', argumanlar, { encoding: 'utf8' });
}

// --- 1. Özel anahtar ve CSR ---
if (!existsSync(anahtarYolu)) {
  openssl('genrsa', '-out', anahtarYolu, '2048');
  console.log('  özel anahtar üretildi');
} else {
  console.log('  özel anahtar zaten var, korunuyor');
}

openssl(
  'req',
  '-new',
  '-key',
  anahtarYolu,
  '-out',
  csrYolu,
  '-subj',
  '/CN=Swiip Distribution/O=Ruzgar Bulut/C=TR',
);
console.log('  CSR hazır');

const csr = readFileSync(csrYolu, 'utf8');

// --- 2. Sertifika ---
let sertifikaId;
let sertifikaIcerik;

/**
 * "Bizim" sertifikayı ADIYLA aramak yanlış: Apple ona sahibin adını veriyor
 * ("Apple Distribution: Ruzgar Bulut"), uygulamanın adını değil. Ada bakınca kendi
 * sertifikamızı bulamayıp yenisini istiyorduk ve Apple 409 dönüyordu:
 *   "You already have a current Distribution certificate or a pending certificate request."
 *
 * Doğru ölçüt: hangi sertifikanın açık anahtarı bizim özel anahtarımıza ait. Sertifika
 * ancak eşleşen özel anahtarla imzalayabilir; kimliği belirleyen şey bu.
 */
const bizimAcikAnahtar = openssl('rsa', '-in', anahtarYolu, '-pubout').trim();

function acikAnahtarEsler(base64Sertifika) {
  const gecici = join(dizin, '_aday.cer');
  writeFileSync(gecici, Buffer.from(base64Sertifika, 'base64'));
  try {
    const pem = openssl('x509', '-inform', 'DER', '-in', gecici, '-pubkey', '-noout').trim();
    return pem === bizimAcikAnahtar;
  } catch {
    return false;
  }
}

const mevcut = await apple('/certificates?limit=200');
const bizimki = (mevcut.data ?? []).find(
  (c) =>
    /DISTRIBUTION/i.test(c.attributes?.certificateType ?? '') &&
    c.attributes?.certificateContent &&
    acikAnahtarEsler(c.attributes.certificateContent),
);

if (bizimki) {
  sertifikaId = bizimki.id;
  sertifikaIcerik = bizimki.attributes.certificateContent;
  console.log(`  mevcut Swiip sertifikası kullanılıyor: ${sertifikaId}`);
} else {
  const olusan = await apple('/certificates', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'certificates',
        attributes: { csrContent: csr, certificateType: 'DISTRIBUTION' },
      },
    }),
  });
  sertifikaId = olusan.data.id;
  sertifikaIcerik = olusan.data.attributes.certificateContent;
  console.log(`  sertifika üretildi: ${sertifikaId} (${olusan.data.attributes.name})`);
}

writeFileSync(cerYolu, Buffer.from(sertifikaIcerik, 'base64'));

// --- 3. .p12 (sertifika + özel anahtar) ---
const pemYolu = join(dizin, 'dagitim.pem');
openssl('x509', '-inform', 'DER', '-in', cerYolu, '-out', pemYolu);
openssl(
  'pkcs12',
  '-export',
  '-legacy',
  '-out',
  p12Yolu,
  '-inkey',
  anahtarYolu,
  '-in',
  pemYolu,
  '-passout',
  `pass:${P12_PAROLA}`,
);
console.log('  .p12 paketlendi');

// --- 4. Kimlik yetkileri ---
const kimlikler = await apple('/bundleIds?limit=200');
const bundle = (kimlikler.data ?? []).find((b) => b.attributes?.identifier === BUNDLE);
if (!bundle) throw new Error(`Bundle kimliği bulunamadı: ${BUNDLE}`);

/**
 * Push Notifications yetkisi.
 *
 * Uygulama `expo-notifications` kullanıyor. Yetki kimlikte açık değilse Xcode derlemesi
 * şu hatayla düşüyor ve sebebi ancak derleme günlüğünde görünüyor:
 *   Provisioning profile "Swiip App Store" doesn't support the Push Notifications
 *   capability … doesn't include the aps-environment entitlement
 *
 * Yetki eklendikten sonra profil YENİDEN üretilmeli; eski profil yetkiyi taşımıyor.
 */
const mevcutYetkiler = await apple(`/bundleIds/${bundle.id}/bundleIdCapabilities?limit=50`).catch(
  () => ({ data: [] }),
);
const pushVar = (mevcutYetkiler.data ?? []).some(
  (y) => y.attributes?.capabilityType === 'PUSH_NOTIFICATIONS',
);

if (pushVar) {
  console.log('  push yetkisi zaten açık');
} else {
  await apple('/bundleIdCapabilities', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'bundleIdCapabilities',
        attributes: { capabilityType: 'PUSH_NOTIFICATIONS' },
        relationships: { bundleId: { data: { id: bundle.id, type: 'bundleIds' } } },
      },
    }),
  });
  console.log('  push yetkisi açıldı');
}

// --- 5. Sağlama profili ---

const profiller = await apple('/profiles?limit=200');
const eskiProfil = (profiller.data ?? []).find((p) => p.attributes?.name === PROFIL_ADI);
if (eskiProfil) {
  await apple(`/profiles/${eskiProfil.id}`, { method: 'DELETE' });
  console.log('  eski profil silindi (sertifika değişmiş olabilir)');
}

const profil = await apple('/profiles', {
  method: 'POST',
  body: JSON.stringify({
    data: {
      type: 'profiles',
      attributes: { name: PROFIL_ADI, profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { id: bundle.id, type: 'bundleIds' } },
        certificates: { data: [{ id: sertifikaId, type: 'certificates' }] },
      },
    },
  }),
});
writeFileSync(profilYolu, Buffer.from(profil.data.attributes.profileContent, 'base64'));
console.log(`  profil üretildi: ${profil.data.id}`);

// --- 6. EASin okuyacağı yapılandırma ---
writeFileSync(
  join(kok, 'apps', 'mobile', 'credentials.json'),
  JSON.stringify(
    {
      ios: {
        provisioningProfilePath: 'kimlik/swiip-appstore.mobileprovision',
        distributionCertificate: {
          path: 'kimlik/dagitim.p12',
          password: P12_PAROLA,
        },
      },
    },
    null,
    2,
  ) + '\n',
);
console.log('  credentials.json yazıldı');
console.log(
  '\nHazır. `eas build --platform ios --profile uretim --local-credentials` ile kullanılır.',
);
