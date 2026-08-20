import { describe, expect, it } from 'vitest';
import { tekUcus } from './tekUcus';

/**
 * Token yenilemede yarış (F0.5).
 *
 * Emülatörde görüldü: erişim tokeni dolduğunda `/v1/kimlik/yenile` bazen 401 dönüyordu
 * (`200, 200, 200, 200, 200, 401, 200, 401, 200, 401`). Sebep, aynı anda 401 alan birkaç
 * isteğin **aynı eski yenileme tokeniyle** yenileme denemesi.
 *
 * Asıl zarar: yarışı kaybeden çağrı "tutmadı" deyip tokenları siliyor ve kazananın az
 * önce yazdığı yeni tokenı da götürüyordu. Kullanıcı hiçbir şey yapmadan oturumdan
 * düşüyordu.
 */

describe('tekUcus', () => {
  it('aynı anda gelen çağrılar tek çalıştırma yapar', async () => {
    let sayac = 0;
    const calis = tekUcus(async () => {
      sayac += 1;
      await new Promise((r) => setTimeout(r, 20));
      return sayac;
    });

    const sonuclar = await Promise.all([calis(), calis(), calis()]);

    expect(sayac).toBe(1);
    expect(sonuclar).toEqual([1, 1, 1]);
  });

  it('uçuş bittikten sonra yeni çağrı yeniden çalıştırır', async () => {
    let sayac = 0;
    const calis = tekUcus(async () => {
      sayac += 1;
      return sayac;
    });

    expect(await calis()).toBe(1);
    expect(await calis()).toBe(2);
  });

  it('hata da paylaşılır ve uçuş temizlenir', async () => {
    let sayac = 0;
    const calis = tekUcus(async () => {
      sayac += 1;
      throw new Error(`patladi-${sayac}`);
    });

    const hatalar = await Promise.allSettled([calis(), calis()]);

    expect(sayac).toBe(1);
    for (const h of hatalar) {
      expect(h.status).toBe('rejected');
      expect((h as PromiseRejectedResult).reason.message).toBe('patladi-1');
    }

    // Bir sonraki çağrı yeniden deneyebilmeli; hata uçuşu kilitlemiyor.
    await expect(calis()).rejects.toThrow('patladi-2');
  });

  it('sonuç değeri her bekleyene aynı geliyor', async () => {
    const calis = tekUcus(async () => ({ deger: Math.PI }));

    const [a, b] = await Promise.all([calis(), calis()]);

    expect(a).toBe(b);
  });
});
