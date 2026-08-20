/**
 * Site tipografi ölçeği ve satır uzunluğu ölçümü.
 *
 * Kullanıcının kuralı: *"her genişlikte sağda solda boşluk kalmayacak, sayfa PDF gibi
 * ortaya dizilmiş görünmeyecek."* Yatay taşma taraması bunu ölçmez — taşma temiz olsa da
 * içerik dar bir sütunda kalıp sağda yüzlerce piksel boşluk bırakabilir.
 *
 * Ölçülenler, genişlik başına:
 *   - başlık ve gövde punto (tipografi büyüyor mu, yoksa boşluk mu büyüyor)
 *   - gövde metninin SATIR UZUNLUĞU (karakter) — okunabilirlik 45-85 arası ister
 *   - metin bloğunun sağında kalan boşluğun görünüme oranı
 *
 * Çalıştırma:
 *   npx serve -l 8090 -s apps/site
 *   node scripts/site-tipografi.mjs [adres]
 */
import { chromium } from 'playwright-core';

const ADRES = process.argv[2] ?? 'http://127.0.0.1:8090';
const CDP = process.env.KONTRAST_CDP ?? 'http://127.0.0.1:9333';
const GENISLIKLER = [320, 390, 768, 1024, 1280, 1440, 1920, 2560, 3440];

/**
 * Okunabilir satır uzunluğu aralığı — tipografi literatüründe yerleşik.
 *
 * Alt sınır yalnızca geniş ekranlarda anlamlı: 320 piksellik bir telefonda okunabilir
 * punto ile 45 karakter fiziksel olarak sığmaz. Dar ekranda bunu bulgu saymak, aracı
 * her koşuda kırmızı gösterip güvenilmez kılardı.
 */
const SATIR_ALT = 45;
const SATIR_UST = 85;
const SATIR_ALT_ESIK_PX = 700;
/** Metin bloğunun sağında bu orandan fazla boşluk kalırsa sayfa "ortaya dizilmiş" görünür. */
const BOSLUK_TAVANI = 0.4;

const tarayici = await chromium.connectOverCDP(CDP);
const baglam = tarayici.contexts()[0] ?? (await tarayici.newContext());
const sayfa = await baglam.newPage();
/**
 * Önbellek CDP ile kapatılır, HTTP başlığıyla değil.
 *
 * Önce `Cache-Control: no-cache` başlığı gönderiliyordu; bu, Google Fonts'a giden
 * istekleri CORS ön kontrolünde düşürüyor ve sayfa YEDEK FONTLA ölçülüyordu. Yani
 * ölçüm aracı, ölçtüğü şeyi değiştiriyordu.
 */
const onbellekCdp = await baglam.newCDPSession(sayfa);
await onbellekCdp.send('Network.setCacheDisabled', { cacheDisabled: true });

const satirlar = [];
const bulgular = [];

for (const g of GENISLIKLER) {
  await sayfa.setViewportSize({ width: g, height: 900 });
  await sayfa.goto(`${ADRES}/index.html`, { waitUntil: 'load' });
  await sayfa.waitForTimeout(250);

  const olcum = await sayfa.evaluate(() => {
    const kok = document.documentElement.clientWidth;

    /** Bir ögenin ortalama satır uzunluğu: karakter sayısı / satır sayısı. */
    const satirUzunlugu = (el) => {
      const metin = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const s = getComputedStyle(el);
      const satirYuksekligi = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4;
      const satirSayisi = Math.max(
        1,
        Math.round(el.getBoundingClientRect().height / satirYuksekligi),
      );
      return { karakter: Math.round(metin.length / satirSayisi), satirSayisi };
    };

    const bolum = document.getElementById('nasil');
    const baslik = bolum?.querySelector('h2');

    /**
     * Gövde paragrafı EN UZUN paragraftır, ilk paragraf değil.
     *
     * İlk hâli `querySelector('p')` diyordu ve bölümün üstündeki "02 — Sonra
     * hesaplıyoruz" etiketini ölçüyordu: tek satır, 23 karakter. Ölçüm her genişlikte
     * aynı sayıyı verdiği için sahte bir bulgu üretiyordu. Ölçüm aracının kendisi de
     * yanılabilir; her genişlikte değişmeyen bir sayı, ölçmediğinin işaretidir.
     */
    const govde = [...(bolum?.querySelectorAll('p') ?? [])].sort(
      (a, b) => (b.textContent ?? '').length - (a.textContent ?? '').length,
    )[0];
    if (!baslik || !govde) return null;

    const gr = govde.getBoundingClientRect();
    const { karakter } = satirUzunlugu(govde);

    return {
      kok,
      baslikPt: Math.round(parseFloat(getComputedStyle(baslik).fontSize)),
      govdePt: Math.round(parseFloat(getComputedStyle(govde).fontSize)),
      karakter,
      metinSagi: Math.round(gr.right),
      metinGenisligi: Math.round(gr.width),
      // Metin bloğunun sağında kalan boşluk / görünüm genişliği
      sagBosluk: Math.round(((kok - gr.right) / kok) * 100) / 100,
    };
  });

  if (!olcum) continue;

  satirlar.push(
    `${String(g).padStart(4)}px · başlık ${String(olcum.baslikPt).padStart(3)}px · ` +
      `gövde ${String(olcum.govdePt).padStart(2)}px · sütun ${String(olcum.metinGenisligi).padStart(4)}px · ` +
      `satır ${String(olcum.karakter).padStart(3)} karakter · ` +
      `sağda boşluk %${Math.round(olcum.sagBosluk * 100)}`,
  );

  const altSinirGecerli = g >= SATIR_ALT_ESIK_PX;
  if ((altSinirGecerli && olcum.karakter < SATIR_ALT) || olcum.karakter > SATIR_UST) {
    bulgular.push(
      `SATIR UZUNLUGU ${g}px: ${olcum.karakter} karakter (okunabilir aralik ${SATIR_ALT}-${SATIR_UST})`,
    );
  }
  if (olcum.sagBosluk > BOSLUK_TAVANI) {
    bulgular.push(
      `SAG BOSLUK ${g}px: metin ${olcum.metinSagi}px'de bitiyor, gorunum ${olcum.kok}px — ` +
        `sagda %${Math.round(olcum.sagBosluk * 100)} bos`,
    );
  }
}

await tarayici.close();

console.log('Bölüm "Motor" (index.html #nasil) ölçümleri:');
console.log('');
for (const s of satirlar) console.log('  ' + s);
console.log('');
if (bulgular.length) {
  console.log(`BULGULAR (${bulgular.length}):`);
  for (const b of bulgular) console.log('  ' + b);
  process.exitCode = 1;
} else {
  console.log('Tipografi ölçeği ve satır uzunluğu her genişlikte aralıkta.');
}
