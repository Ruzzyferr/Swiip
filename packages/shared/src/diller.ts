/**
 * Dil kimlikleri (F10.1).
 *
 * Ayrı bir modül, çünkü **döngü kırmak zorunda**: sözlükler tarih ve para biçimini
 * kullanıyor, biçimlendiriciler de dilin BCP47 karşılığını. Bunlar `i18n.ts` içinde
 * dururken zincir kapanıyordu:
 *
 *     i18n → metinler.tr → tarih → i18n
 *
 * Metro döngüsel `require`'da modüllerden birini yarı yüklenmiş verir; `BCP47`
 * biçimlendirici çalışırken `undefined` olabilir. Sessiz ve tekrarlanması zor bir hata.
 *
 * Burada yalnızca veri var; hiçbir şeye bağımlı değil, dolayısıyla döngüye giremez.
 */

export const DILLER = ['tr', 'en'] as const;
export type Dil = (typeof DILLER)[number];

/**
 * Dilin BCP47 karşılığı — sayı, para ve tarih biçimi için.
 *
 * Ayrı durmalı: 'tr' bizim iç kodumuz, 'tr-TR' `Intl`'in beklediği etiket. Biçimlendirme
 * çağrılarına doğrudan 'tr' vermek sessizce yanlış yerel ayar seçtirir.
 */
export const BCP47: Record<Dil, string> = {
  tr: 'tr-TR',
  en: 'en-US',
};

/** Türkiye önce: kaynak dil ve yedek dil Türkçe. */
export const varsayilanDil: Dil = 'tr';
