/**
 * Para dizesini "rakam" ve "sembol" parçalarına böler.
 *
 * Ayrı dosya, çünkü test edilebilmesi gerekiyor: `bilesenler.tsx` `react-native`
 * çekiyor ve Node altında ayrıştırılamıyor (aynı sınır `tabanAdresi.test.ts`'te de var).
 *
 * Neden bölüyoruz: `JetBrainsMono_500Medium` U+20BA (₺) glifini içermiyor — fontun
 * `cmap` tablosu okunarak doğrulandı ve `para.test.ts` bunu her koşuda yeniden ölçüyor.
 * Eksik glif sessizce sistem yedeğine düşüyor ve paywall'da ₺ serif bir harf gibi,
 * farklı kalınlıkta, rakama yapışık çıkıyordu. Rakamlar monospace kalmalı (tabular
 * hizalama ürünün "ölçü aleti" iddiası), sembol arayüz fontunda basılmalı.
 *
 * Biçime bağlı değiliz: `Intl` para birimini dile göre başa (`₺99`) ya da sona
 * (`99 TL`) koyabiliyor. O yüzden kural basit — rakam/ayraç/boşluk sayısal, gerisi değil.
 */

export interface ParaParcasi {
  metin: string;
  sayisal: boolean;
}

/**
 * Rakam, ondalık/binlik ayracı ve boşluk.
 *
 * ` ` bölünmez boşluk: `Intl` bazı dillerde sayı ile birimin arasına onu koyuyor
 * ve normal boşlukla aynı görünüyor. Kaçış dizisiyle yazılı, çünkü karakterin kendisi
 * kaynakta görünmez ve `no-irregular-whitespace` haklı olarak uyarıyor.
 */
const SAYISAL_SINIF = '[\\d.,\\s\\u00A0]';

const PARCA_DESENI = new RegExp(`${SAYISAL_SINIF}+|(?:(?!${SAYISAL_SINIF}).)+`, 'g');
const TAMAMEN_SAYISAL = new RegExp(`^${SAYISAL_SINIF}+$`);

export function paraParcalari(metin: string): ParaParcasi[] {
  const parcalar = metin.match(PARCA_DESENI);
  if (!parcalar) return [{ metin, sayisal: false }];
  return parcalar.map((p) => ({ metin: p, sayisal: TAMAMEN_SAYISAL.test(p) }));
}
