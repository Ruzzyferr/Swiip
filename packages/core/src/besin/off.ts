/**
 * Open Food Facts ürün dönüşümü (F5.5).
 *
 * OFF halka açık ve kullanıcı katkılı bir veritabanı: içinde "100 g'da 5000 kalori" gibi
 * kayıtlar var. Bu değerler kullanıcının günlük toplamını sessizce mahveder ve
 * "aynı girdi aynı çıktı" sözümüzü değil, ondan daha temel bir şeyi bozar — doğruluğu.
 *
 * Bu yüzden dönüşüm iyimser değil. Makul aralığın dışındaki kayıt alınmaz; barkod
 * "veritabanımızda yok" der. Yanlış besin değeri, besin değeri olmamasından kötüdür.
 *
 * Saf ve deterministik: ağ erişimi bir üst katmanda (API) yapılır.
 *
 * Lisans notu: OFF verisi ODbL. Kaynak alanı `openfoodfacts` olarak yazılır ve
 * uygulamada gösterilir; toplu içe aktarmanın share-alike sonuçları için docs/durum.md.
 */

/** 100 gram başına makul aralıklar. İçe aktarma betiği de bunları kullanır. */
export const MAKUL_ARALIKLAR = {
  kalori: [0, 900],
  protein_g: [0, 100],
  yag_g: [0, 100],
  karbonhidrat_g: [0, 100],
  lif_g: [0, 80],
} as const;

/**
 * Makro toplamı için üst sınır.
 *
 * Teorik tavan 100 g ama gerçek etiketlerde yuvarlamadan 101-103 g çıkabiliyor.
 * 105'te kesiyoruz: ölçüm payını kabul eder, bozuk kaydı yakalar.
 */
const MAKRO_TOPLAM_TAVANI = 105;

/** kJ → kcal. Uluslararası tanım: 1 kcal = 4,184 kJ. */
const KJ_KCAL = 4.184;

const AD_UST_SINIRI = 120;

export interface BesinDegerleri {
  kalori: number;
  protein_g: number;
  yag_g: number;
  karbonhidrat_g: number;
  lif_g: number;
}

export interface Porsiyon {
  id: string;
  ad: string;
  gram: number;
}

export interface IthalBesin {
  name_tr: string;
  name_en: string | null;
  per_100g: BesinDegerleri;
  portions: Porsiyon[];
  barcode: string;
  brand: string | null;
  source: 'openfoodfacts';
}

/** OFF ürün gövdesinden okuduğumuz alanlar. Fazlası bizi ilgilendirmiyor. */
export interface OffUrun {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, unknown>;
}

export function besinDegerleriMakulMu(degerler: BesinDegerleri): boolean {
  for (const [alan, [alt, ust]] of Object.entries(MAKUL_ARALIKLAR)) {
    const deger = degerler[alan as keyof BesinDegerleri];
    if (typeof deger !== 'number' || !Number.isFinite(deger)) return false;
    if (deger < alt || deger > ust) return false;
  }

  const toplam = degerler.protein_g + degerler.yag_g + degerler.karbonhidrat_g;
  return toplam <= MAKRO_TOPLAM_TAVANI;
}

function sayi(deger: unknown): number {
  const cevrilen = typeof deger === 'string' ? Number(deger) : deger;
  return typeof cevrilen === 'number' && Number.isFinite(cevrilen) ? cevrilen : 0;
}

function kaloriCikar(nutriments: Record<string, unknown>): number | null {
  const kcal = nutriments['energy-kcal_100g'];
  if (typeof kcal === 'number' && Number.isFinite(kcal)) return Math.round(kcal);

  const kj = nutriments.energy_100g;
  if (typeof kj === 'number' && Number.isFinite(kj)) return Math.round(kj / KJ_KCAL);

  return null;
}

/**
 * OFF ürününü bizim besin kaydımıza çevirir. Kullanılamaz kayıt için `null` döner.
 *
 * `null` dönmesi hata değil, karar: bu kaydı göstermemek doğru davranış.
 */
export function offUrunuCevir(urun: OffUrun): IthalBesin | null {
  const barkod = (urun.code ?? '').trim();
  if (barkod === '') return null;

  const ad = (urun.product_name_tr || urun.product_name || '').trim();
  if (ad === '' || ad.length > AD_UST_SINIRI) return null;

  const nutriments = urun.nutriments ?? {};
  const kalori = kaloriCikar(nutriments);
  if (kalori === null) return null;

  const per_100g: BesinDegerleri = {
    kalori,
    protein_g: sayi(nutriments.proteins_100g),
    yag_g: sayi(nutriments.fat_100g),
    karbonhidrat_g: sayi(nutriments.carbohydrates_100g),
    lif_g: sayi(nutriments.fiber_100g),
  };

  if (!besinDegerleriMakulMu(per_100g)) return null;

  const porsiyonGrami = sayi(urun.serving_quantity);
  const portions: Porsiyon[] =
    porsiyonGrami > 0
      ? [{ id: 'porsiyon', ad: urun.serving_size || '1 porsiyon', gram: porsiyonGrami }]
      : [];

  return {
    name_tr: ad,
    name_en: urun.product_name?.trim() || null,
    per_100g,
    portions,
    barcode: barkod,
    brand: (urun.brands ?? '').split(',')[0]?.trim() || null,
    source: 'openfoodfacts',
  };
}

/**
 * EAN-13 / EAN-8 kontrol hanesi doğrulaması.
 *
 * Elle girilen barkodda tek haneli yazım hatası sık görülür. Kontrol hanesi bunu istek
 * gönderilmeden yakalar: kullanıcı "bulunamadı" yerine "bu barkod hatalı görünüyor"
 * mesajını alır — birincisi kaynağı suçlar, ikincisi çözümü gösterir.
 *
 * Diğer barkod aileleri (UPC-A zaten 13 haneye tamamlanır, ITF vb.) kapsam dışı;
 * gıda ambalajında pratikte EAN kullanılıyor.
 */
export function barkodGecerliMi(barkod: string): boolean {
  const temiz = barkod.trim();
  if (!/^\d+$/.test(temiz)) return false;
  if (temiz.length !== 8 && temiz.length !== 13) return false;

  const haneler = [...temiz].map(Number);
  const kontrol = haneler.pop()!;

  // EAN'de ağırlıklar sondan başa doğru 3, 1, 3, 1… şeklinde gider.
  const toplam = haneler.reverse().reduce((t, hane, i) => t + hane * (i % 2 === 0 ? 3 : 1), 0);

  return (10 - (toplam % 10)) % 10 === kontrol;
}
