/**
 * Yeni bir App Store sürüm kaydı açar ve her dilin sürüm notunu ("What's New") yazar.
 *
 * Apple yeni sürüm açılınca açıklama, anahtar kelime ve URL'leri önceki sürümden
 * kopyalıyor; kopyalamadığı tek alan sürüm notu. 1.1.0'da 11 dilin notu elle tek tek
 * yazıldı. Kaynak artık depoda: `magaza/appstore/surum-notlari-<sürüm>.json`.
 *
 * Yazdıktan sonra her dili GERİ OKUYOR. Bu uçlarda yazma asenkron uygulanabiliyor
 * (bkz. CLAUDE.md, primaryLocale ve ülke açılışı); tek okuma yanlış negatif verir, o
 * yüzden okuma birkaç kez deneniyor.
 *
 * Build bağlamak ve incelemeye göndermek bu betiğin işi DEĞİL: `apple-gonder.mjs`.
 *
 *     node scripts/apple-surum-ac.mjs 1.2.0          # ne yapacağını gösterir
 *     node scripts/apple-surum-ac.mjs 1.2.0 --yaz
 */
import { readFileSync } from 'node:fs';
import { apple } from './apple-api.mjs';

const UYG = '6803979374';
const SURUM = process.argv[2];
const YAZ = process.argv.includes('--yaz');
if (!/^\d+\.\d+\.\d+$/.test(SURUM ?? '')) {
  console.error('kullanım: node scripts/apple-surum-ac.mjs <sürüm> [--yaz]');
  process.exit(2);
}

const notlar = JSON.parse(readFileSync(`magaza/appstore/surum-notlari-${SURUM}.json`, 'utf8'));
for (const [dil, metin] of Object.entries(notlar)) {
  // App Store sınırı 4.000 karakter.
  if (metin.length > 4000) throw new Error(`${dil}: ${metin.length} karakter > 4000`);
}

const uyu = (ms) => new Promise((coz) => setTimeout(coz, ms));

const surumler = await apple(
  `/apps/${UYG}/appStoreVersions?filter[platform]=IOS&limit=10&fields[appStoreVersions]=versionString,appStoreState`,
);
let kayit = surumler.data.find((v) => v.attributes.versionString === SURUM);
console.log(
  'Mevcut sürümler:',
  surumler.data.map((v) => `${v.attributes.versionString}=${v.attributes.appStoreState}`).join(' '),
);

if (!kayit) {
  if (!YAZ) {
    console.log(`${SURUM} yok; --yaz ile açılacak (releaseType AFTER_APPROVAL).`);
    process.exit(0);
  }
  kayit = (
    await apple('/appStoreVersions', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appStoreVersions',
          attributes: { platform: 'IOS', versionString: SURUM, releaseType: 'AFTER_APPROVAL' },
          relationships: { app: { data: { type: 'apps', id: UYG } } },
        },
      }),
    })
  ).data;
  console.log(`${SURUM} açıldı: ${kayit.id}`);
}

const yerellestirmeler = await apple(
  `/appStoreVersions/${kayit.id}/appStoreVersionLocalizations?limit=50&fields[appStoreVersionLocalizations]=locale,whatsNew`,
);
const mevcut = new Map(yerellestirmeler.data.map((y) => [y.attributes.locale, y]));
const eksik = Object.keys(notlar).filter((d) => !mevcut.has(d));
if (eksik.length) throw new Error(`Sürümde bu diller yok: ${eksik.join(', ')}`);

for (const [dil, metin] of Object.entries(notlar)) {
  const y = mevcut.get(dil);
  if (y.attributes.whatsNew === metin) {
    console.log(`  ${dil}: zaten güncel`);
    continue;
  }
  if (!YAZ) {
    console.log(`  ${dil}: yazılacak (${metin.length} karakter)`);
    continue;
  }
  await apple(`/appStoreVersionLocalizations/${y.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: 'appStoreVersionLocalizations', id: y.id, attributes: { whatsNew: metin } },
    }),
  });
  console.log(`  ${dil}: yazıldı`);
}

if (!YAZ) process.exit(0);

// Geri okuma: yazma asenkron uygulanabiliyor.
for (let deneme = 1; deneme <= 6; deneme++) {
  const okunan = await apple(
    `/appStoreVersions/${kayit.id}/appStoreVersionLocalizations?limit=50&fields[appStoreVersionLocalizations]=locale,whatsNew`,
  );
  const tutmayan = Object.entries(notlar)
    .filter(
      ([dil, metin]) =>
        okunan.data.find((y) => y.attributes.locale === dil)?.attributes.whatsNew !== metin,
    )
    .map(([dil]) => dil);
  if (tutmayan.length === 0) {
    console.log(`Doğrulandı: ${Object.keys(notlar).length} dilin notu geri okundu.`);
    process.exit(0);
  }
  console.log(`Okuma ${deneme}: tutmayan ${tutmayan.join(', ')}`);
  await uyu(10_000);
}
console.error('YAZILAMADI: notlar geri okunamadı.');
process.exit(1);
