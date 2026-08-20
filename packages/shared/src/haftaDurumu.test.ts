import { describe, expect, it } from 'vitest';
import { haftaBittiMi } from './haftaDurumu';

describe('haftaBittiMi', () => {
  it('bütün seanslar tamamlandıysa hafta biter', () => {
    expect(
      haftaBittiMi({
        seanslar: [{ status: 'tamamlandi' }, { status: 'tamamlandi' }],
        kilitliGunSayisi: 0,
      }),
    ).toBe(true);
  });

  it('tek bir planlanmış seans kalsa bile bitmez', () => {
    expect(
      haftaBittiMi({
        seanslar: [{ status: 'tamamlandi' }, { status: 'planlandi' }],
        kilitliGunSayisi: 0,
      }),
    ).toBe(false);
  });

  it('atlanan seans bitmiş sayılır — atlamak da bir cevaptır', () => {
    expect(
      haftaBittiMi({
        seanslar: [{ status: 'tamamlandi' }, { status: 'atlandi' }],
        kilitliGunSayisi: 0,
      }),
    ).toBe(true);
  });

  it('kilitli gün varken hafta bitmiş sayılmaz', () => {
    // Ücretsiz kullanıcı 1. günü görüyor; görmediği günü bitirmiş sayamayız.
    expect(
      haftaBittiMi({
        seanslar: [{ status: 'tamamlandi' }],
        kilitliGunSayisi: 3,
      }),
    ).toBe(false);
  });

  it('hiç seans yoksa hafta bitmiş sayılmaz', () => {
    expect(haftaBittiMi({ seanslar: [], kilitliGunSayisi: 0 })).toBe(false);
  });
});
