import { describe, expect, it } from 'vitest';
import { istekSayaciKur } from './istekSayaci';

/**
 * Kimlik uçları için ortak istek havuzu.
 *
 * Uç başına ayrı sayaç, saldırgana her uçtan ayrı hak verir: on giriş denemesi, ardından
 * on parola sıfırlama isteği. Havuz ortak olunca sınır gerçekten sınır olur.
 *
 * Zaman dışarıdan veriliyor: sayaç deterministik ve testte gerçek saat beklenmiyor.
 */

describe('istekSayaci', () => {
  it('sınıra kadar izin verir', () => {
    const sayac = istekSayaciKur({ sinir: 3, pencereMs: 60_000 });

    expect(sayac.izinVar('1.2.3.4', 0)).toBe(true);
    expect(sayac.izinVar('1.2.3.4', 1)).toBe(true);
    expect(sayac.izinVar('1.2.3.4', 2)).toBe(true);
  });

  it('sınırı aşan isteği reddeder', () => {
    const sayac = istekSayaciKur({ sinir: 2, pencereMs: 60_000 });

    sayac.izinVar('1.2.3.4', 0);
    sayac.izinVar('1.2.3.4', 1);

    expect(sayac.izinVar('1.2.3.4', 2)).toBe(false);
  });

  it('farklı adresler birbirini etkilemez', () => {
    const sayac = istekSayaciKur({ sinir: 1, pencereMs: 60_000 });

    expect(sayac.izinVar('1.1.1.1', 0)).toBe(true);
    expect(sayac.izinVar('2.2.2.2', 0)).toBe(true);
    expect(sayac.izinVar('1.1.1.1', 1)).toBe(false);
  });

  it('pencere dolunca hak yenilenir', () => {
    const sayac = istekSayaciKur({ sinir: 1, pencereMs: 1000 });

    expect(sayac.izinVar('1.2.3.4', 0)).toBe(true);
    expect(sayac.izinVar('1.2.3.4', 500)).toBe(false);
    expect(sayac.izinVar('1.2.3.4', 1500)).toBe(true);
  });

  it('kayan pencere: eski istekler düşer, yenileri sayılır', () => {
    const sayac = istekSayaciKur({ sinir: 2, pencereMs: 1000 });

    sayac.izinVar('1.2.3.4', 0);
    sayac.izinVar('1.2.3.4', 900);
    expect(sayac.izinVar('1.2.3.4', 950)).toBe(false);

    // 0 anındaki istek pencereden çıktı; yer açıldı.
    expect(sayac.izinVar('1.2.3.4', 1100)).toBe(true);
  });

  /**
   * Sayaç bellekte tutuluyor ve süreç ömrü boyunca büyüyebilir. Eski kayıtların
   * temizlenmemesi, uzun süren bir süreçte sessiz bir bellek sızıntısıdır.
   */
  it('penceresi geçmiş adresler bellekte birikmez', () => {
    const sayac = istekSayaciKur({ sinir: 5, pencereMs: 1000 });

    for (let i = 0; i < 200; i++) sayac.izinVar(`10.0.0.${i}`, i);
    sayac.izinVar('10.0.1.1', 100_000);

    expect(sayac.boyut()).toBeLessThanOrEqual(2);
  });

  it('sınır sıfırsa hiçbir isteğe izin verilmez', () => {
    const sayac = istekSayaciKur({ sinir: 0, pencereMs: 1000 });

    expect(sayac.izinVar('1.2.3.4', 0)).toBe(false);
  });
});
