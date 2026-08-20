import { describe, expect, it } from 'vitest';
import { tarihBirlestir, tarihParcala } from './tarihGirisi';

/**
 * Doğum tarihi girişi (F2.2).
 *
 * Bu, değerlendirmenin **ilk sorusu**. Burada takılan kullanıcı ürünün hiçbir şeyini
 * göremez; huninin tamamı bu alanın arkasında.
 *
 * Emülatörde gerçek bir kullanıcı gibi denenince çıktı: tarih tam giriliyor
 * (14 · 3 · 1992) ve "Devam et" açılmıyordu. İki ayrı hata üst üste binmişti:
 *
 *  1. Üç alan da değerini üst durumdan okuyordu, ama eksik girişte üst durum `null`'a
 *     çekiliyordu. Gün yazılınca ay ve yıl siliniyor, ay yazılınca gün siliniyordu —
 *     **üç parça hiçbir zaman aynı anda bilinemiyordu.** Sıfır dolgusundan bağımsız
 *     olarak tarih tamamlanamıyordu.
 *  2. `g.length === 2` şartı tek haneli gün ve ayı reddediyordu; hemen altındaki
 *     `padStart(2, '0')` ise tam tersini varsayıyordu. Kod kendi kendisiyle çelişiyordu.
 *
 * Bileşen testi yok; olması gereken de bu değil. Birleştirme mantığı saf bir fonksiyon
 * olarak buraya alındı ve bileşen ince kaldı.
 */

describe('tarihBirlestir', () => {
  it('tek haneli gün ve ay kabul edilir', () => {
    expect(tarihBirlestir('3', '4', '1992')).toBe('1992-04-03');
  });

  it('iki haneli gün ve ay da kabul edilir', () => {
    expect(tarihBirlestir('14', '03', '1992')).toBe('1992-03-14');
  });

  it('başında sıfır olan giriş bozulmaz', () => {
    expect(tarihBirlestir('09', '09', '2000')).toBe('2000-09-09');
  });

  it('eksik alan varsa null döner', () => {
    expect(tarihBirlestir('', '3', '1992')).toBeNull();
    expect(tarihBirlestir('14', '', '1992')).toBeNull();
    expect(tarihBirlestir('14', '3', '')).toBeNull();
  });

  it('yıl dört haneli değilse null döner', () => {
    expect(tarihBirlestir('14', '3', '92')).toBeNull();
    expect(tarihBirlestir('14', '3', '19920')).toBeNull();
  });

  it('olmayan takvim günü reddedilir', () => {
    // 31 Şubat yok. Date nesnesi bunu sessizce 2 Mart'a çevirir; kabul edersek
    // kullanıcının yaşı yanlış hesaplanır ve 18 yaş kapısı yanlış karar verir.
    expect(tarihBirlestir('31', '2', '1992')).toBeNull();
    expect(tarihBirlestir('31', '4', '1992')).toBeNull();
  });

  it('artık yıl 29 Şubat kabul edilir', () => {
    expect(tarihBirlestir('29', '2', '1992')).toBe('1992-02-29');
  });

  it('artık olmayan yılda 29 Şubat reddedilir', () => {
    expect(tarihBirlestir('29', '2', '1993')).toBeNull();
  });

  it('ay ve gün sınırları', () => {
    expect(tarihBirlestir('0', '5', '1992')).toBeNull();
    expect(tarihBirlestir('32', '5', '1992')).toBeNull();
    expect(tarihBirlestir('5', '0', '1992')).toBeNull();
    expect(tarihBirlestir('5', '13', '1992')).toBeNull();
  });

  it('rakam olmayan giriş reddedilir', () => {
    expect(tarihBirlestir('ab', '3', '1992')).toBeNull();
    expect(tarihBirlestir('1a', '3', '1992')).toBeNull();
  });

  it('akıl dışı yıl reddedilir — 18 yaş kapısı buna dayanıyor', () => {
    expect(tarihBirlestir('14', '3', '1799')).toBeNull();
    expect(tarihBirlestir('14', '3', '3000')).toBeNull();
  });
});

describe('tarihParcala', () => {
  it('ISO tarihi üç parçaya ayırır', () => {
    expect(tarihParcala('1992-03-14')).toEqual({ gun: '14', ay: '03', yil: '1992' });
  });

  it('boş girdi boş parçalar verir', () => {
    expect(tarihParcala(null)).toEqual({ gun: '', ay: '', yil: '' });
    expect(tarihParcala('')).toEqual({ gun: '', ay: '', yil: '' });
  });

  it('bozuk girdi çökmez', () => {
    expect(tarihParcala('abc')).toEqual({ gun: '', ay: '', yil: '' });
  });

  it('birleştir ve parçala birbirinin tersi', () => {
    const iso = tarihBirlestir('7', '8', '1985');
    expect(iso).not.toBeNull();
    const { gun, ay, yil } = tarihParcala(iso);
    expect(tarihBirlestir(gun, ay, yil)).toBe(iso);
  });
});
