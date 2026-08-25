/**
 * `App Review Information → Notes` alanını depodaki kaynaktan yükler.
 *
 * Neden betik: alan 4.000 karakterle sınırlı ve konsolda sessizce kırpılıyor. Elle
 * yapıştırılan metin bir kez sınıra dayandı ve sonraki düzenlemede sona eklenen cümle
 * hiç kaydedilmedi — kimse fark etmedi çünkü konsol hata vermiyor. Burada sınır
 * yazmadan ÖNCE kontrol ediliyor: aşarsa hiçbir şey yazılmıyor.
 *
 * Kaynak `magaza/appstore/inceleme-notlari.md` içindeki ```notlar bloğu. Tek kaynak
 * orası; konsolda elle düzenlenirse bir sonraki çalıştırma üzerine yazar.
 *
 *   node scripts/apple-notlar.mjs
 *   node scripts/apple-notlar.mjs --kayit "<url>" --cihazlar "iPhone 15 Pro (iOS 26.0)"
 *
 * Apple'ın sekiz sorusundan 3–8'i gövdede duruyor. `--kayit` ve `--cihazlar` verilirse
 * 1. ve 2. sorular metnin BAŞINA ekleniyor; inceleyenin ilk gördüğü şey istediği iki
 * cevap oluyor.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apple } from './apple-api.mjs';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = join(KOK, 'magaza/appstore/inceleme-notlari.md');
const INCELEME_DETAYI = '31422b95-9d10-44a1-8c17-cb7efa09e443';
const SINIR = 4000;

function argAl(ad) {
  const i = process.argv.indexOf(`--${ad}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

// Satır sonu \r\n olabilir: dosya Windows'ta düzenleniyor, desen buna takılmasın.
const kaynakMetni = readFileSync(KAYNAK, 'utf8').replace(/\r\n/g, '\n');
const govde = /```notlar\n([\s\S]*?)```/.exec(kaynakMetni)?.[1]?.trim();
if (!govde) {
  console.error(`${KAYNAK} içinde \`\`\`notlar bloğu bulunamadı.`);
  process.exit(2);
}

const kayit = argAl('kayit');
const cihazlar = argAl('cihazlar');

const bolumler = [];
if (kayit) bolumler.push(`SCREEN RECORDING\n${kayit}`);
if (cihazlar) bolumler.push(`DEVICES AND OS VERSIONS TESTED\n${cihazlar}`);
bolumler.push(govde);
const metin = bolumler.join('\n\n');

console.log(`gövde ${govde.length} · toplam ${metin.length} / ${SINIR}`);
if (!kayit || !cihazlar) {
  console.log(
    'UYARI: --kayit ve --cihazlar verilmedi. Apple’ın 1. ve 2. soruları cevapsız kalıyor;\n' +
      '       eksik cevapla yeniden göndermek bir inceleme turu daha harcar.',
  );
}

// `--dene` yalnızca ölçer, yazmaz: sınıra sığıp sığmadığını canlı alanı riske
// atmadan görmek için.
if (process.argv.includes('--dene')) {
  console.log('--- yazılacak metin ---');
  console.log(metin);
  console.log(`\n--- deneme; hiçbir şey yazılmadı (${metin.length}/${SINIR}) ---`);
  process.exit(metin.length > SINIR ? 1 : 0);
}

if (metin.length > SINIR) {
  console.error(
    `Metin ${metin.length - SINIR} karakter fazla. Hiçbir şey yazılmadı — ` +
      'yarım yüklenmiş not, boş nottan kötüdür. Gövdeyi kısalt.',
  );
  process.exit(1);
}

await apple(`/appStoreReviewDetails/${INCELEME_DETAYI}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: { type: 'appStoreReviewDetails', id: INCELEME_DETAYI, attributes: { notes: metin } },
  }),
});

// Geri okuma: "PATCH 200 döndü" ile "alan bu metni tutuyor" ayrı şeyler.
const sonra = await apple(`/appStoreReviewDetails/${INCELEME_DETAYI}`);
const yazilan = sonra.data.attributes.notes ?? '';
if (yazilan !== metin) {
  console.error(
    `DOĞRULAMA BAŞARISIZ: alan ${yazilan.length} karakter tutuyor, beklenen ${metin.length}.`,
  );
  process.exit(1);
}
console.log('doğrulandı: alan yazılan metni tutuyor.');
