import { describe, expect, it } from 'vitest';
import { kodUret, kodGecerliMi, KOD_OMRU_DAKIKA } from './kod';
import { tokenOzeti } from './parola';

describe('kodUret', () => {
  it('altı haneli sayısal kod üretir', () => {
    for (let i = 0; i < 50; i++) {
      expect(kodUret()).toMatch(/^\d{6}$/);
    }
  });

  it('ardışık kodlar farklıdır', () => {
    const kodlar = new Set(Array.from({ length: 200 }, () => kodUret()));

    // Tekrar olabilir ama neredeyse hepsi farklı olmalı.
    expect(kodlar.size).toBeGreaterThan(180);
  });

  it('baştaki sıfırı korur', () => {
    // Uzunluk her zaman 6 olmalı; sayıya çevirip geri yazmıyoruz.
    for (let i = 0; i < 200; i++) {
      expect(kodUret()).toHaveLength(6);
    }
  });
});

describe('kodGecerliMi', () => {
  const simdi = new Date('2026-08-19T12:00:00.000Z');

  function kayit(uzat: Partial<Parameters<typeof kodGecerliMi>[0]> = {}) {
    return {
      kod_hash: tokenOzeti('123456'),
      expires_at: new Date('2026-08-19T12:10:00.000Z'),
      kullanildi_at: null as Date | null,
      ...uzat,
    };
  }

  it('doğru ve süresi geçmemiş kodu kabul eder', () => {
    expect(kodGecerliMi(kayit(), '123456', simdi)).toBe(true);
  });

  it('yanlış kodu reddeder', () => {
    expect(kodGecerliMi(kayit(), '654321', simdi)).toBe(false);
  });

  it('süresi geçmiş kodu reddeder', () => {
    const gecmis = kayit({ expires_at: new Date('2026-08-19T11:59:00.000Z') });

    expect(kodGecerliMi(gecmis, '123456', simdi)).toBe(false);
  });

  it('kullanılmış kodu reddeder — tek kullanımlık', () => {
    const kullanilmis = kayit({ kullanildi_at: new Date('2026-08-19T12:01:00.000Z') });

    expect(kodGecerliMi(kullanilmis, '123456', simdi)).toBe(false);
  });

  it('boş kodu reddeder', () => {
    expect(kodGecerliMi(kayit(), '', simdi)).toBe(false);
  });

  it('kod veritabanında ham saklanmaz', () => {
    expect(kayit().kod_hash).not.toContain('123456');
  });
});

describe('KOD_OMRU_DAKIKA', () => {
  it('makul bir süre: yeterince kısa, kullanılabilir kadar uzun', () => {
    expect(KOD_OMRU_DAKIKA).toBeGreaterThanOrEqual(10);
    expect(KOD_OMRU_DAKIKA).toBeLessThanOrEqual(30);
  });
});
