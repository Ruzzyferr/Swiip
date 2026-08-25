/**
 * Yüklenen derlemenin TestFlight "Bu sürümde neler var" metnini yazar.
 *
 * `eas submit` derlemeyi yüklüyor ama bu alanı boş bırakıyor. Boş kalınca testçi
 * TestFlight'ta yalnızca bir sürüm numarası görüyor ve neye bakacağını bilmiyor —
 * kapalı testin bütün değeri testçinin doğru yere bakmasında.
 *
 * Apple derlemeyi yükledikten sonra birkaç dakika işliyor. `PROCESSING` durumundaki
 * derlemeye yerelleştirme eklenemiyor, o yüzden betik `VALID` olana kadar bekliyor.
 *
 *   node scripts/testflight-notlar.mjs <build-numarasi> <metin>
 *   node scripts/testflight-notlar.mjs --son "<metin>"     # en yeni derleme
 */
import { apple } from './apple-api.mjs';

const APP = '6803979374';
const DIL = 'tr-TR';
const SINIR = 4000;
const TUR_SAYISI = 40;
const BEKLEME_MS = 30_000;

const argumanlar = process.argv.slice(2);
const sonMu = argumanlar[0] === '--son';
const hedefNumara = sonMu ? null : argumanlar[0];
const metin = argumanlar[1] ?? '';

if (!metin.trim()) {
  console.error(
    'Metin boş; yazılacak bir şey yok. Kullanım: testflight-notlar.mjs --son "<metin>"',
  );
  process.exit(2);
}
if (metin.length > SINIR) {
  console.error(`Metin ${metin.length - SINIR} karakter fazla (sınır ${SINIR}). Yazılmadı.`);
  process.exit(1);
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** İşlenmesi bitmiş hedef derlemeyi bulur; `PROCESSING` ise bekler. */
async function derlemeyiBul() {
  for (let tur = 1; tur <= TUR_SAYISI; tur++) {
    const { data = [] } = await apple(
      `/builds?filter[app]=${APP}&fields[builds]=version,processingState&sort=-version&limit=20`,
    );
    const hedef = hedefNumara
      ? data.find((b) => b.attributes.version === String(hedefNumara))
      : data[0];
    const durum = hedef?.attributes.processingState ?? '(görünmüyor)';
    console.log(`tur ${tur}: build ${hedef?.attributes.version ?? hedefNumara} -> ${durum}`);
    if (durum === 'VALID') return hedef;
    if (durum === 'INVALID' || durum === 'FAILED') {
      throw new Error(`build ${hedef.attributes.version} ${durum}; not yazılmıyor.`);
    }
    await bekle(BEKLEME_MS);
  }
  throw new Error('derleme 20 dakikada VALID olmadı.');
}

const derleme = await derlemeyiBul();

const mevcut = await apple(
  `/builds/${derleme.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew&limit=20`,
);
const kayit = (mevcut.data ?? []).find((l) => l.attributes.locale === DIL);

if (kayit) {
  await apple(`/betaBuildLocalizations/${kayit.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: 'betaBuildLocalizations', id: kayit.id, attributes: { whatsNew: metin } },
    }),
  });
} else {
  await apple('/betaBuildLocalizations', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'betaBuildLocalizations',
        attributes: { locale: DIL, whatsNew: metin },
        relationships: { build: { data: { type: 'builds', id: derleme.id } } },
      },
    }),
  });
}

// Geri okuma: yazma isteğinin 2xx dönmesi, alanın metni tuttuğu anlamına gelmiyor.
const sonra = await apple(
  `/builds/${derleme.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew&limit=20`,
);
const yazilan = (sonra.data ?? []).find((l) => l.attributes.locale === DIL)?.attributes.whatsNew;
if (yazilan !== metin) {
  console.error('DOĞRULAMA BAŞARISIZ: alan yazılan metni tutmuyor.');
  process.exit(1);
}
console.log(`doğrulandı: build ${derleme.attributes.version} · ${DIL} · ${metin.length} karakter`);
