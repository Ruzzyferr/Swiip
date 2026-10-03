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
if (cihazlar) bolumler.push(`DEVICES TESTED\n${cihazlar}`);
bolumler.push(govde);
const metin = bolumler.join('\n\n');

console.log(`gövde ${govde.length} · toplam ${metin.length} / ${SINIR}`);
if (!kayit || !cihazlar) {
  /**
   * İki başlık metnin BAŞINA ekleniyor, yani gövde sınırın tamamını yiyemez.
   *
   * Gövde tek başına sığıyor diye rahatlamak yanlış: `--kayit` uzun bir imzalı
   * bağlantıysa (Drive, S3) tek başına 150 karakteri geçebiliyor. Pay burada,
   * ekleme yapılmadan önce ölçülüyor — sonra ölçmek "hiçbir şey yazılmadı" hatasını
   * ancak Apple'a yazmaya kalkarken görmek demek.
   */
  const pay = SINIR - govde.length;
  console.log(
    `UYARI: --kayit ve --cihazlar verilmedi. Apple'ın 1. ve 2. soruları cevapsız kalıyor;\n` +
      '       eksik cevapla yeniden göndermek bir inceleme turu daha harcar.\n' +
      `       İki başlığa kalan pay: ${pay} karakter` +
      (pay < 220 ? ' — DAR. Uzun bir kayıt bağlantısı sığmayabilir; gövdeyi kısalt.' : '.'),
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

/**
 * Hedef: DÜZENLENEBİLİR sürümün inceleme kaydı.
 *
 * Burada 1.0'ın kayıt kimliği sabit yazılıydı. Her sürümün kendi inceleme kaydı var ve
 * Apple yeni sürüme öncekinin notlarını KOPYALIYOR; sabit kimliğe yazmak, yayındaki eski
 * sürümün notunu değiştirip incelemeye giden sürümü eski metinle bırakmak demekti.
 */
const UYG = '6803979374';
const surumler = await apple(
  `/apps/${UYG}/appStoreVersions?filter[platform]=IOS&limit=10&fields[appStoreVersions]=versionString,appStoreState`,
);
const duzenlenebilir = surumler.data.find((v) =>
  ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
    v.attributes.appStoreState,
  ),
);
if (!duzenlenebilir) {
  console.error('Düzenlenebilir sürüm yok (hepsi incelemede ya da yayında).');
  process.exit(1);
}
const detay = await apple(`/appStoreVersions/${duzenlenebilir.id}/appStoreReviewDetail`);
const INCELEME_DETAYI = detay.data.id;
console.log(`Hedef: ${duzenlenebilir.attributes.versionString} (${INCELEME_DETAYI})`);

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
