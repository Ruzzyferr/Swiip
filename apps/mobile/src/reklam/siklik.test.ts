import { describe, expect, it } from 'vitest';
import {
  ARALIK_MS,
  BOS_DURUM,
  GUNLUK_TAVAN,
  gosterildi,
  gosterilebilirMi,
  gunAnahtari,
  gunuTazele,
} from './siklik';

/**
 * Tam ekran reklamın sıklık sınırı.
 *
 * Kullanıcı günde 4-6 öğün kaydediyor. Sınırsız bırakılsa her onaydan sonra tam
 * ekran açılırdı; `docs/rakip-analizi.md` bunun terk sebebi olduğunu ölçtü.
 */

const T = (metin: string) => new Date(metin);

describe('günlük tavan', () => {
  it(`günde en fazla ${GUNLUK_TAVAN} tam ekran`, () => {
    let durum = BOS_DURUM;
    let simdi = T('2026-09-01T08:00:00');

    for (let i = 0; i < GUNLUK_TAVAN; i++) {
      expect(gosterilebilirMi(durum, simdi), `${i + 1}. gösterim engellendi`).toBe(true);
      durum = gosterildi(durum, simdi);
      simdi = new Date(simdi.getTime() + ARALIK_MS + 1000);
    }

    expect(
      gosterilebilirMi(durum, simdi),
      'Tavan aşıldı: kullanıcı günde 4-6 öğün kaydediyor, sınırsız bırakılırsa her ' +
        'onaydan sonra tam ekran açılır.',
    ).toBe(false);
  });

  it('ertesi gün sayaç sıfırlanıyor', () => {
    let durum = BOS_DURUM;
    let simdi = T('2026-09-01T08:00:00');
    for (let i = 0; i < GUNLUK_TAVAN; i++) {
      durum = gosterildi(durum, simdi);
      simdi = new Date(simdi.getTime() + ARALIK_MS + 1000);
    }
    expect(gosterilebilirMi(durum, T('2026-09-02T08:00:00'))).toBe(true);
  });
});

describe('iki reklam arası süre', () => {
  it('aralık dolmadan ikinci reklam açılmıyor', () => {
    const simdi = T('2026-09-01T08:00:00');
    const durum = gosterildi(BOS_DURUM, simdi);

    const birazSonra = new Date(simdi.getTime() + ARALIK_MS - 1000);
    expect(
      gosterilebilirMi(durum, birazSonra),
      'Arka arkaya iki öğün kaydeden kullanıcı iki tam ekran görür.',
    ).toBe(false);

    expect(gosterilebilirMi(durum, new Date(simdi.getTime() + ARALIK_MS))).toBe(true);
  });

  it('ilk gösterimde aralık beklenmiyor', () => {
    expect(gosterilebilirMi(BOS_DURUM, T('2026-09-01T08:00:00'))).toBe(true);
  });
});

/**
 * Gün anahtarı YEREL takvimden.
 *
 * `toISOString()` UTC'ye çeviriyor; Türkiye UTC+3 olduğu için gece 00:00-03:00 arası
 * hâlâ "dün" sayılırdı. Gece atıştırmasını kaydeden kullanıcının sayacı sıfırlanmaz,
 * ertesi güne eksik başlardı.
 */
describe('gün sınırı yerel saatte', () => {
  it('gece yarısından sonra yeni gün', () => {
    const gece = T('2026-09-01T23:50:00');
    const sonra = T('2026-09-02T00:10:00');

    expect(gunAnahtari(gece)).not.toBe(gunAnahtari(sonra));
    expect(gunuTazele({ gun: gunAnahtari(gece), sayac: 3, sonGosterim: 1 }, sonra).sayac).toBe(0);
  });

  it('gün anahtarı UTC kaymasına düşmüyor', () => {
    // UTC+3'te 01:00 -> UTC'de bir önceki günün 22:00'ı.
    const geceYarisiSonrasi = T('2026-09-02T01:00:00');
    expect(gunAnahtari(geceYarisiSonrasi)).toBe('2026-09-02');
  });
});
