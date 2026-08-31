/**
 * Sürümü build'e bağlar ve App Review'a gönderir.
 *
 * Bu depoda gönderim akışı üç kez elle yürütüldü ve her seferinde aynı sıra
 * gerekti. Sıra yanlış olduğunda Apple sessiz değil, ama hata mesajları akışın
 * neresinde olduğunu söylemiyor:
 *
 *   1. Build'i sürüme bağla (`PATCH .../relationships/build`).
 *      YÜKLEMEK BAĞLAMAK DEĞİL: build 5-9 yüklenip hiçbiri bağlanmadığı için
 *      sürüm uzun süre build 4'ü gösterdi ve Apple onu inceledi.
 *   2. Açık bir `reviewSubmission` varsa onu kullan, yoksa aç.
 *   3. Sürüm ögesini ekle (`POST /reviewSubmissionItems`).
 *   4. `PATCH { submitted: true }`.
 *
 * Abonelikler ZATEN onaylıysa gönderime yalnızca sürüm ögesi girer; 3.1.2 turundaki
 * altı ögelik gönderim burada gerekmiyor.
 *
 *     node scripts/apple-gonder.mjs                 # ne yapacağını gösterir
 *     node scripts/apple-gonder.mjs --yaz
 *     node scripts/apple-gonder.mjs --yaz --build=32
 */
import { apple } from './apple-api.mjs';

const UYG = '6803979374';
const YAZ = process.argv.includes('--yaz');
const ISTENEN_BUILD = (process.argv.find((a) => a.startsWith('--build=')) ?? '').slice(8);

const surumler = await apple(
  `/apps/${UYG}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState`,
);
const hedef = surumler.data.find((s) => s.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
if (!hedef) {
  console.log('Gönderilecek sürüm yok (PREPARE_FOR_SUBMISSION durumunda kayıt bulunamadı).');
  process.exit(1);
}
console.log(`sürüm       : ${hedef.attributes.versionString} (${hedef.id})`);

/* Yüklenmiş ve İŞLENMİŞ build'ler; PROCESSING olan bağlanamaz. */
const buildler = await apple(
  `/builds?filter[app]=${UYG}&limit=10&sort=-uploadedDate&fields[builds]=version,processingState`,
);
const uygun = buildler.data.filter((b) => b.attributes.processingState === 'VALID');
const build = ISTENEN_BUILD
  ? uygun.find((b) => String(b.attributes.version) === ISTENEN_BUILD)
  : uygun[0];
if (!build) {
  console.log(
    `Uygun build yok${ISTENEN_BUILD ? ` (${ISTENEN_BUILD} bulunamadı ya da VALID değil)` : ''}.`,
  );
  process.exit(1);
}
console.log(`build       : ${build.attributes.version} (${build.attributes.processingState})`);

const bagli = await apple(`/appStoreVersions/${hedef.id}/build?fields[builds]=version`).catch(
  () => null,
);
console.log(`şu an bağlı : ${bagli?.data?.attributes?.version ?? '(yok)'}`);

if (!YAZ) {
  console.log('\n--yaz ile bağlanır ve incelemeye gönderilir.');
  process.exit(0);
}

/* 1) Build'i sürüme bağla. */
await apple(`/appStoreVersions/${hedef.id}/relationships/build`, {
  method: 'PATCH',
  body: JSON.stringify({ data: { type: 'builds', id: build.id } }),
});
console.log(`  build ${build.attributes.version} sürüme bağlandı`);

/* 2) Açık gönderim var mı — yoksa aç. */
const gonderimler = await apple(
  `/apps/${UYG}/reviewSubmissions?limit=5&fields[reviewSubmissions]=state,platform`,
);
let gonderim = (gonderimler.data ?? []).find((g) =>
  ['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES'].includes(g.attributes.state),
);

if (gonderim) {
  console.log(`  mevcut gönderim kullanılıyor: ${gonderim.id} (${gonderim.attributes.state})`);
} else {
  const yeni = await apple('/reviewSubmissions', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: UYG } } },
      },
    }),
  });
  gonderim = yeni.data;
  console.log(`  yeni gönderim açıldı: ${gonderim.id}`);
}

/* 3) Sürüm ögesi zaten ekli mi? */
const ogeler = await apple(
  `/reviewSubmissions/${gonderim.id}/items?limit=20&fields[reviewSubmissionItems]=state`,
).catch(() => ({ data: [] }));
console.log(`  gönderimdeki öge sayısı: ${(ogeler.data ?? []).length}`);

if ((ogeler.data ?? []).length === 0) {
  await apple('/reviewSubmissionItems', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: gonderim.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: hedef.id } },
        },
      },
    }),
  });
  console.log('  sürüm ögesi eklendi');
}

/* 4) Gönder. */
await apple(`/reviewSubmissions/${gonderim.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: { type: 'reviewSubmissions', id: gonderim.id, attributes: { submitted: true } },
  }),
});
console.log('  gönderildi');

/*
 * Geri okumadan "oldu" denmez — ve bu uçta hemen okumak da yeterli değil.
 * `primaryLocale` ve ülke açılışında ölçüldü: yazma asenkron uygulanabiliyor.
 */
for (let i = 1; i <= 5; i++) {
  await new Promise((c) => setTimeout(c, i === 1 ? 3000 : 8000));
  const s = await apple(
    `/apps/${UYG}/appStoreVersions?limit=3&fields[appStoreVersions]=versionString,appStoreState`,
  );
  const guncel = s.data.find((x) => x.id === hedef.id);
  const durum = guncel?.attributes.appStoreState;
  console.log(`  ${i}. okuma: ${durum}`);
  if (durum === 'WAITING_FOR_REVIEW' || durum === 'IN_REVIEW') {
    const b = await apple(`/appStoreVersions/${hedef.id}/build?fields[builds]=version`).catch(
      () => null,
    );
    console.log(
      `\nDOĞRULANDI: ${guncel.attributes.versionString} ${durum}, build ${b?.data?.attributes?.version}`,
    );
    process.exit(0);
  }
}
console.log('\nDurum henüz WAITING_FOR_REVIEW değil — konsoldan bakılmalı.');
process.exit(1);
