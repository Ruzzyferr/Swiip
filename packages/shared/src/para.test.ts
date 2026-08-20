import { describe, expect, it } from 'vitest';
import { BCP47 } from './i18n';
import { fiyatMetni, LISTE_PARA_BIRIMI } from './para';

/**
 * Fiyat biçimi (F10.3).
 *
 * Fiyatın tek doğruluk kaynağı mağazadır: App Store ve Play kullanıcının ülkesine ve
 * para birimine göre yerelleştirilmiş bir dize verir ve tahsil edilen tutar odur.
 * Burada biçimlenen şey yalnızca **yedek**: mağazaya ulaşılamadığında gösterilen
 * liste fiyatı.
 *
 * Yedeğin dürüst olması şart. "1.190" yazıp para birimini söylememek, İngilizce
 * kullanıcının onu dolar sanmasına yol açar; mağaza sayfasında başka bir rakam görür.
 * Bu yüzden yedek her zaman para birimini taşır.
 */

/**
 * `Intl` sayı ile para birimi arasına **bölünmez boşluk** (U+00A0) koyar. Bu istenen
 * davranış: fiyat satır sonunda ikiye bölünmez. Ama düz boşlukla karşılaştıran bir test
 * bölünmez boşluklu ve düz boşluklu iki dize arasındaki farkı göremeden düşer —
 * ekranda ikisi de aynı görünür.
 *
 * Aynı sınıf, projenin başka yerlerinde de çıkmıştı: `'İ'.toLowerCase()` iki kod noktası
 * üretir. Görünmeyen karakter, en pahalı hata türü.
 */
/** Bölünmez boşluk. Kaynağa düz karakter olarak yazılırsa göze görünmez. */
const BOLUNMEZ = String.fromCharCode(160);

const duz = (metin: string) => metin.split(BOLUNMEZ).join(' ');

describe('fiyatMetni', () => {
  it('sayı ile para birimi arasında bölünmez boşluk var — fiyat satır sonunda bölünmez', () => {
    expect(fiyatMetni(1190, 'en')).toContain(BOLUNMEZ);
  });

  it('Türkçede lira simgesiyle ve nokta binlik ayırıcıyla yazar', () => {
    expect(fiyatMetni(1190, 'tr')).toBe('₺1.190');
  });

  it('İngilizcede para birimi kodunu açıkça yazar', () => {
    // "TRY 1,190" — kullanıcı neyi ödeyeceğini görüyor. "$1,190" yanlış olurdu.
    expect(duz(fiyatMetni(1190, 'en'))).toBe('TRY 1,190');
  });

  it('kuruş göstermez — abonelik fiyatları tam sayı', () => {
    expect(fiyatMetni(99, 'tr')).not.toContain(',00');
    expect(fiyatMetni(99, 'en')).not.toContain('.00');
  });

  it('sıfır fiyat da biçimlenir — ücretsiz plan satırı', () => {
    expect(fiyatMetni(0, 'tr')).toContain('0');
    expect(fiyatMetni(0, 'en')).toContain('0');
  });

  it('başka bir para birimi verilebilir — ikinci pazar için hazır', () => {
    expect(duz(fiyatMetni(9, 'en', 'USD'))).toBe('$9');
    expect(duz(fiyatMetni(9, 'tr', 'EUR'))).toBe('€9');
  });

  it('her dil için bir BCP47 etiketi var', () => {
    expect(BCP47.tr).toBe('tr-TR');
    expect(BCP47.en).toBe('en-US');
  });

  it('liste para birimi TRY — sunucudaki liste fiyatları lira cinsinden', () => {
    expect(LISTE_PARA_BIRIMI).toBe('TRY');
  });
});
