import { describe, expect, it } from 'vitest';
import { FOTOGRAF_MAKS_BAYT, fotografBoyutuUygunMu, base64Bayt } from './girdiSiniri';

/**
 * Görsel girdi boyutu sınırı.
 *
 * Kota çağrı **sayısını** sınırlıyor, maliyeti değil. Görsel modelde maliyet girdi
 * boyutuyla büyür: 12 MB'lık bir fotoğraf, sıkıştırılmış bir fotoğrafın onlarca katı
 * tokene karşılık gelir. Tek kullanıcı aylık marjı bu şekilde yakabilir.
 *
 * Ürünün bilinen en büyük riski birim ekonomisi; "AI koymadan önce maliyetini hesapla"
 * kuralının karşılığı burada girdiyi sınırlamak.
 *
 * Sınır cömert: uygulamanın kendi çektiği kare (quality 0.6) bunun çok altında kalıyor.
 * Amaç kullanıcıyı zorlamak değil, uç durumu kesmek.
 */

/** Verilen bayt sayısına yakın bir base64 dizesi. */
const base64Uret = (bayt: number) => 'A'.repeat(Math.ceil(bayt / 3) * 4);

describe('base64Bayt', () => {
  it('base64 uzunluğundan yaklaşık bayt sayısı verir', () => {
    // 4 base64 karakteri 3 bayt taşır.
    expect(base64Bayt('AAAA')).toBe(3);
  });

  it('dolgu karakterlerini bayt saymaz', () => {
    expect(base64Bayt('AAA=')).toBe(2);
    expect(base64Bayt('AA==')).toBe(1);
  });

  it('veri URI ön ekini yok sayar', () => {
    const onekli = 'data:image/jpeg;base64,AAAA';

    expect(base64Bayt(onekli)).toBe(3);
  });

  it('boş dize sıfır bayttır', () => {
    expect(base64Bayt('')).toBe(0);
  });
});

describe('fotografBoyutuUygunMu', () => {
  it('normal boyuttaki fotoğrafı kabul eder', () => {
    expect(fotografBoyutuUygunMu(base64Uret(400_000))).toBe(true);
  });

  it('sınırdaki fotoğrafı kabul eder', () => {
    expect(fotografBoyutuUygunMu(base64Uret(FOTOGRAF_MAKS_BAYT - 1000))).toBe(true);
  });

  it('sınırı aşan fotoğrafı reddeder', () => {
    expect(fotografBoyutuUygunMu(base64Uret(FOTOGRAF_MAKS_BAYT + 100_000))).toBe(false);
  });

  it('sınır uygulamanın çektiği kareye yer bırakacak kadar cömert', () => {
    // quality 0.6 ile çekilen bir kare tipik olarak 1 MB'ın altında.
    expect(FOTOGRAF_MAKS_BAYT).toBeGreaterThanOrEqual(1_500_000);
  });

  it('sınır maliyeti kontrol altında tutacak kadar dar', () => {
    expect(FOTOGRAF_MAKS_BAYT).toBeLessThanOrEqual(4_000_000);
  });
});
