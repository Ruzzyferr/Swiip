import type { BesinDegerleri } from './off';

/**
 * Bileşimden makro hesabı (F5.6, F8.2).
 *
 * Bir yemeğin makrosu elle yazılacak bir sayı değil, malzemelerinin toplamıdır. Elle
 * yazınca kütüphane büyüdükçe hata da büyür ve tek tek denetlenmesi gerekir; hesaplayınca
 * hata kaynağı tek bir yerde toplanır — ham gıda tablosunda.
 *
 * Ürünün sözü zaten bu: "besin değeri veritabanından gelir, biz uydurmayız." Pişmiş yemek
 * katmanı bu kuralın istisnası olmamalı.
 *
 * Saf ve deterministik: tablo erişimi dışarıdan bir arama işleviyle verilir.
 */

export interface BilesimKalemi {
  ad: string;
  gram: number;
}

export interface BilesimSonucu {
  /** Tarifin tamamı için toplam. */
  toplam: BesinDegerleri;
  /** Pişmiş hâlin 100 gramı başına. */
  per_100g: BesinDegerleri;
  /** Pişmiş toplam ağırlık (gram). */
  pismisGram: number;
}

export interface BilesimSecenekleri {
  /**
   * Pişirme ağırlık katsayısı: pişmiş ağırlık / ham ağırlık.
   *
   * Enerji pişirmekle değişmez ama ağırlık değişir. Et su kaybeder (katsayı < 1),
   * tahıl su çeker (katsayı > 1). Bunu atlamak, pilavın 100 gramını kuru pirinç gibi
   * saymak demek — iki buçuk kat fazla kalori.
   */
  verim?: number;
}

/** Yaygın pişirme verimleri. Tarif kendi katsayısını verebilir. */
export const PISIRME_VERIMI = {
  /** Kırmızı et ve tavuk ızgara/fırın: su ve yağ kaybı. */
  et: 0.75,
  /** Pirinç, bulgur, makarna: su çeker. */
  tahil: 2.5,
  /** Kuru baklagil: haşlanınca yaklaşık iki buçuk katına çıkar. */
  baklagil: 2.4,
  /** Sebze yemeği: hafif su kaybı, eklenen su ile dengelenir. */
  sebze: 0.9,
  /** Çorba: eklenen suyla hacim büyür. */
  corba: 4,
  /** Fırın ve tava: ağırlık büyük ölçüde korunur. */
  notr: 1,
} as const;

export type BesinArayici = (ad: string) => BesinDegerleri | undefined;

const BOS: BesinDegerleri = {
  kalori: 0,
  protein_g: 0,
  yag_g: 0,
  karbonhidrat_g: 0,
  lif_g: 0,
};

function yuvarla(deger: number, basamak = 1): number {
  const carpan = 10 ** basamak;
  return Math.round(deger * carpan) / carpan;
}

/**
 * Malzeme listesinden makro hesaplar. Malzemelerden biri tabloda yoksa `null` döner.
 *
 * Yarım hesap yapmıyoruz: bilinmeyen malzemeyi sıfır saymak, kullanıcıya olduğundan
 * düşük bir kalori göstermek olur ve bu sessiz bir hatadır.
 */
export function bilesimHesapla(
  kalemler: BilesimKalemi[],
  ara: BesinArayici,
  secenekler: BilesimSecenekleri = {},
): BilesimSonucu | null {
  if (kalemler.length === 0) return null;

  const verim = secenekler.verim ?? 1;
  if (!(verim > 0)) return null;

  let hamGram = 0;
  const toplam = { ...BOS };

  for (const kalem of kalemler) {
    const besin = ara(kalem.ad);
    if (!besin) return null;

    const oran = kalem.gram / 100;
    hamGram += kalem.gram;
    toplam.kalori += besin.kalori * oran;
    toplam.protein_g += besin.protein_g * oran;
    toplam.yag_g += besin.yag_g * oran;
    toplam.karbonhidrat_g += besin.karbonhidrat_g * oran;
    toplam.lif_g += besin.lif_g * oran;
  }

  if (hamGram === 0) return null;

  const pismisGram = hamGram * verim;
  const olcek = 100 / pismisGram;

  return {
    toplam: {
      kalori: Math.round(toplam.kalori),
      protein_g: yuvarla(toplam.protein_g),
      yag_g: yuvarla(toplam.yag_g),
      karbonhidrat_g: yuvarla(toplam.karbonhidrat_g),
      lif_g: yuvarla(toplam.lif_g),
    },
    per_100g: {
      kalori: Math.round(toplam.kalori * olcek),
      protein_g: yuvarla(toplam.protein_g * olcek),
      yag_g: yuvarla(toplam.yag_g * olcek),
      karbonhidrat_g: yuvarla(toplam.karbonhidrat_g * olcek),
      lif_g: yuvarla(toplam.lif_g * olcek),
    },
    pismisGram: Math.round(pismisGram),
  };
}
