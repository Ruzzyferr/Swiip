import { describe, expect, it } from 'vitest';
import type { AntrenmanYasi } from '@made2fit/shared';
import { splitSec } from './split';

const temel = { antrenmanYasi: 'orta' as AntrenmanYasi, seansDakika: 60 };

describe('splitSec — gün sayısına göre', () => {
  it('2 gün full body olarak kurulur', () => {
    const s = splitSec({ ...temel, gunSayisi: 2 });

    expect(s.tip).toBe('full_body');
    expect(s.gunler).toEqual(['full_body', 'full_body']);
  });

  it('3 günde yeni başlayan full body yapar', () => {
    const s = splitSec({ ...temel, gunSayisi: 3, antrenmanYasi: 'yeni' });

    expect(s.tip).toBe('full_body');
    expect(s.gunler).toHaveLength(3);
  });

  it('3 günde orta seviye upper/lower/full yapar', () => {
    const s = splitSec({ ...temel, gunSayisi: 3, antrenmanYasi: 'orta' });

    expect(s.tip).toBe('upper_lower_full');
    expect(s.gunler).toEqual(['upper', 'lower', 'full_body']);
  });

  it('4 gün upper/lower ×2 olur', () => {
    const s = splitSec({ ...temel, gunSayisi: 4 });

    expect(s.tip).toBe('upper_lower');
    expect(s.gunler).toEqual(['upper', 'lower', 'upper', 'lower']);
  });

  it('5 gün upper/lower/push/pull/legs olur', () => {
    const s = splitSec({ ...temel, gunSayisi: 5 });

    expect(s.tip).toBe('upper_lower_ppl');
    expect(s.gunler).toEqual(['upper', 'lower', 'push', 'pull', 'legs']);
  });

  it('6 gün push/pull/legs ×2 olur', () => {
    const s = splitSec({ ...temel, gunSayisi: 6 });

    expect(s.tip).toBe('ppl_x2');
    expect(s.gunler).toEqual(['push', 'pull', 'legs', 'push', 'pull', 'legs']);
  });

  it('7 gün istense bile 6 günle sınırlanır', () => {
    expect(splitSec({ ...temel, gunSayisi: 7 }).gunler).toHaveLength(6);
  });

  it('1 gün bile full body verir', () => {
    expect(splitSec({ ...temel, gunSayisi: 1 }).gunler).toEqual(['full_body']);
  });
});

describe('splitSec — seans süresi etkisi', () => {
  it('kısa seansta 3 gün full body yerine bölünmüş program seçilir', () => {
    const s = splitSec({ gunSayisi: 3, antrenmanYasi: 'yeni', seansDakika: 30 });

    expect(s.tip).toBe('upper_lower_full');
  });

  it('uzun seansta yeni başlayan full body kalır', () => {
    const s = splitSec({ gunSayisi: 3, antrenmanYasi: 'yeni', seansDakika: 60 });

    expect(s.tip).toBe('full_body');
  });
});

describe('splitSec — gerekçe', () => {
  it('seçimi cevaplara bağlayan bir gerekçe döner', () => {
    const s = splitSec({ ...temel, gunSayisi: 4 });

    expect(s.gerekce).toContain('4');
    expect(s.gerekce.length).toBeGreaterThan(20);
  });

  it('aynı girdi aynı splite çıkar', () => {
    const girdi = { ...temel, gunSayisi: 5 };
    expect(JSON.stringify(splitSec(girdi))).toBe(JSON.stringify(splitSec(girdi)));
  });
});
