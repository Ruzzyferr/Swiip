import { BCP47, type Dil } from './i18n';

/**
 * Fiyat biçimi (F10.3).
 *
 * **Fiyatın tek doğruluk kaynağı mağazadır.** App Store ve Play, kullanıcının ülkesine
 * göre yerelleştirilmiş bir fiyat dizesi verir (RevenueCat'te `priceString`) ve tahsil
 * edilen tutar odur. Uygulamanın gösterdiği fiyat mağazanınkinden farklıysa bu yalnızca
 * kötü çeviri değil, mağaza kurallarına aykırı bir beyandır.
 *
 * Buradaki biçimlendirme o yüzden **yalnızca yedek**: mağazaya ulaşılamadığında
 * (ağ yok, SDK yok, ürün tanımlanmamış) sunucudaki liste fiyatını göstermek için.
 *
 * Yedeğin dürüst olması şart: para birimi her zaman görünür. `Intl` İngilizcede
 * "TRY 1,190" yazar — kullanıcı neyi ödeyeceğini bilir. Yalnızca "1,190" yazmak,
 * mağazada başka bir rakam gören kullanıcı üretirdi.
 */

/** Sunucudaki liste fiyatlarının para birimi. Mağaza fiyatı bunu geçersiz kılar. */
export const LISTE_PARA_BIRIMI = 'TRY';

/**
 * Tutarı kullanıcının dilinde ve verilen para biriminde yazar.
 *
 * Kuruş gösterilmez: abonelik fiyatları tam sayı ve "99,00 ₺" gereksiz gürültü.
 */
export function fiyatMetni(
  tutar: number,
  dil: Dil,
  paraBirimi: string = LISTE_PARA_BIRIMI,
): string {
  return new Intl.NumberFormat(BCP47[dil], {
    style: 'currency',
    currency: paraBirimi,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(tutar);
}
