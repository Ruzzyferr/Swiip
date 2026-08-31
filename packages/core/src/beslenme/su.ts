import type { Cinsiyet } from '@swiip/shared';

/**
 * Günlük içecek hedefi.
 *
 * **Kaynak EFSA, ve bu bir formalite değil.** Apple 2026-08-27'de Guideline 1.4.1
 * (Safety — Physical Harm) ile tam bu yüzden reddetti: uygulama sağlık hesabı sunup
 * kaynağını göstermiyordu. Su hedefi de bir sağlık tavsiyesi; kaynaksız bir sayı
 * koymak aynı maddeyi yeniden açardı.
 *
 * EFSA Panel on Dietetic Products, Nutrition and Allergies (2010), **toplam su** için
 * yeterli alım (adequate intake):
 *
 *   kadın 2,0 L/gün · erkek 2,5 L/gün
 *
 * **Toplam su, içilen su değil.** EFSA'nın kendi metni toplam alımın %20-30'unun
 * yiyeceklerden geldiğini söylüyor. O yüzden buradaki hedef, toplam alımdan yiyecek
 * payı düşülerek veriliyor:
 *
 *   kadın 2,0 × 0,80 = 1,6 L · erkek 2,5 × 0,80 = 2,0 L
 *
 * Yiyecek payını düşmemek, kullanıcıya günde yarım litre fazla su içirmek olurdu —
 * "EFSA öyle diyor" demek doğru sayıyı vermek anlamına gelmiyor.
 *
 * **Aktiviteye ya da kiloya göre ayar YOK.** EFSA sıcak ve yüksek aktivitede ihtiyacın
 * arttığını söylüyor ama sayısallaştırmıyor. "35 ml/kg" gibi yaygın kurallar ise
 * ders kitabı folkloru; arkasında EFSA ayarında bir kurum yok. Kaynağı olmayan bir
 * katsayı eklemek, kaynak göstermenin anlamını ortadan kaldırır.
 */

/** Yiyeceklerden gelen pay düşüldükten sonra kalan içecek oranı (EFSA: %20-30). */
const ICECEK_PAYI = 0.8;

/** EFSA 2010 toplam su yeterli alımı, mililitre. */
const TOPLAM_SU_ML: Record<Cinsiyet, number> = {
  kadin: 2000,
  erkek: 2500,
};

/** Bardak birimi — arayüz sayıyı bardağa bölerek gösteriyor. */
export const BARDAK_ML = 250;

export function suHedefiMl(cinsiyet: Cinsiyet): number {
  return Math.round((TOPLAM_SU_ML[cinsiyet] * ICECEK_PAYI) / 50) * 50;
}

/** Hedefin kaç bardağa denk geldiği; aşağı yuvarlanmıyor, en yakına gidiyor. */
export function suHedefiBardak(cinsiyet: Cinsiyet): number {
  return Math.round(suHedefiMl(cinsiyet) / BARDAK_ML);
}
