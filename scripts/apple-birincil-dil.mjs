/**
 * Birincil dili (`primaryLocale`) değiştirir.
 *
 * NE İŞE YARIYOR: App Store, kendi dilinde yerelleştirmesi olmayan bir mağazada
 * İngilizceye DEĞİL **birincil dile** düşüyor. Birincil dil `tr` iken 175 ülke
 * açıldığında, 11 dilimizin hiçbirini konuşmayan ~160 mağaza Türkçe bir ürün
 * sayfası gördü. Ölçüldü (2026-08-31, ABD mağazası):
 *
 *     ad       : Swiip
 *     açıklama : "Çoğu uygulama sekiz soru sorup program üretir…"   <-- Türkçe
 *
 * Yani bu tek alan, "kalan ~160 mağazanın yedeği" meselesinin tamamı.
 *
 * APPLE'IN İKİ KISITI — betik ikisini de yazmadan ÖNCE kontrol ediyor:
 *
 *  1. Hedef dilin ekran görüntüleri olmalı, yoksa 409
 *     `MISSING_SCREENSHOTS_PRIMARY_LOCALE`. Kontrol düzenlenebilir sürümde
 *     yapılıyor; canlı sürüme yerelleştirme EKLENEMİYOR
 *     ("Cannot create localization after the app version has...").
 *
 *  2. Sürüm incelemedeyken App Information kilitli. Bu yüzden birincil dil ancak
 *     11 dilli 1.0.1 yayına girdikten SONRA çevrilebiliyor.
 *
 * Sıra bilerek böyle: `tr` birincilken ülkeleri açmak bilinen bir bedeldi ve
 * kabul edildi; 1.0.1 onaylandığı anda 11 dil devreye giriyor, bu betik de
 * kalan mağazaların yedeğini İngilizce yapıyor.
 *
 *     node scripts/apple-birincil-dil.mjs            # yalnızca durumu gösterir
 *     node scripts/apple-birincil-dil.mjs --yaz
 *     node scripts/apple-birincil-dil.mjs --yaz --dil=de-DE
 *
 * Yazdıktan sonra alanı geri okuyup doğruluyor — bu depoda "yapıldı sanılan ama
 * yapılmayan" sınıfı kusur dört kez yakalandı.
 */
import { apple } from './apple-api.mjs';

const UYG = '6803979374';
const YAZ = process.argv.includes('--yaz');
const HEDEF = (process.argv.find((a) => a.startsWith('--dil=')) ?? '--dil=en-US').slice(6);

const uyg = await apple(`/apps/${UYG}?fields[apps]=primaryLocale`);
const simdiki = uyg.data.attributes.primaryLocale;
console.log(`birincil dil : ${simdiki}`);
console.log(`hedef        : ${HEDEF}`);

if (simdiki === HEDEF) {
  console.log('Zaten hedef dilde — yapılacak bir şey yok.');
  process.exit(0);
}

/* KISIT 2 — sürüm incelemedeyse App Information kilitli. */
const bilgiler = await apple(`/apps/${UYG}/appInfos`);
const kilitli = bilgiler.data.filter((b) => /REVIEW/.test(b.attributes.state));
for (const b of bilgiler.data) console.log(`appInfo      : ${b.attributes.state}`);

/* KISIT 1 — hedef dilin ekran görüntüsü var mı? Düzenlenebilir sürümde bakılır. */
const surumler = await apple(
  `/apps/${UYG}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState`,
);
const duzenlenebilir = surumler.data.find((s) => s.attributes.appStoreState !== 'READY_FOR_SALE');
const surum = duzenlenebilir ?? surumler.data[0];
console.log(`sürüm        : ${surum.attributes.versionString} ${surum.attributes.appStoreState}`);

const yereller = await apple(
  `/appStoreVersions/${surum.id}/appStoreVersionLocalizations?limit=50&fields[appStoreVersionLocalizations]=locale`,
);
const yerel = yereller.data.find((y) => y.attributes.locale === HEDEF);
console.log(`diller       : ${yereller.data.map((y) => y.attributes.locale).join(' ')}`);

if (!yerel) {
  console.log(
    `\nDURDU: ${surum.attributes.versionString} sürümünde "${HEDEF}" yerelleştirmesi yok.`,
  );
  console.log('Apple birincil dil için o dilin ekran görüntülerini şart koşuyor.');
  process.exit(1);
}

const kumeler = await apple(
  `/appStoreVersionLocalizations/${yerel.id}/appScreenshotSets?limit=20&fields[appScreenshotSets]=screenshotDisplayType`,
);
const turler = kumeler.data.map((k) => k.attributes.screenshotDisplayType);
console.log(`ekran setleri: ${turler.length ? turler.join(' ') : '(yok)'}`);

if (turler.length === 0) {
  console.log(
    `\nDURDU: "${HEDEF}" için ekran görüntüsü yok — 409 MISSING_SCREENSHOTS_PRIMARY_LOCALE gelir.`,
  );
  process.exit(1);
}

if (kilitli.length > 0) {
  console.log(
    `\nDURDU: App Information incelemede (${kilitli.map((b) => b.attributes.state).join(', ')}).`,
  );
  console.log('Sürüm incelemedeyken birincil dil değiştirilemiyor; onay bekleniyor.');
  process.exit(1);
}

if (!YAZ) {
  console.log('\nHer şey hazır. Yazmak için: --yaz');
  process.exit(0);
}

await apple(`/apps/${UYG}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: { type: 'apps', id: UYG, attributes: { primaryLocale: HEDEF } },
  }),
});

/* Geri okumadan "oldu" denmez. */
const sonra = await apple(`/apps/${UYG}?fields[apps]=primaryLocale`);
const son = sonra.data.attributes.primaryLocale;
console.log(`\nDOĞRULAMA: birincil dil = ${son}`);
if (son !== HEDEF) {
  console.log('YAZILAMADI — alan eski değerinde.');
  process.exit(1);
}
console.log(`Tamam. Kendi dili olmayan mağazalar artık ${HEDEF} görecek.`);
