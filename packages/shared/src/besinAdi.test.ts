import { describe, expect, it } from 'vitest';
import { besinAdi, porsiyonAdi } from './besinAdi';
import { metinleriAl } from './i18n';

describe('besinAdi', () => {
  const tavuk = { name_tr: 'Tavuk göğsü, pişmiş', name_en: 'Chicken breast, cooked' };

  it('İngilizce arayüz İngilizce adı, Türkçe arayüz Türkçe adı gösterir', () => {
    expect(besinAdi(tavuk, 'en')).toBe('Chicken breast, cooked');
    expect(besinAdi(tavuk, 'tr')).toBe('Tavuk göğsü, pişmiş');
  });

  it('İngilizce adı olmayan kayıt Türkçesine düşer', () => {
    expect(besinAdi({ name_tr: 'Ev yapımı börek', name_en: null }, 'en')).toBe('Ev yapımı börek');
    expect(besinAdi({ name_tr: 'Ev yapımı börek', name_en: '  ' }, 'en')).toBe('Ev yapımı börek');
  });

  it('boş kayıtta yedek döner', () => {
    expect(besinAdi(null, 'en', 'Unnamed')).toBe('Unnamed');
  });
});

describe('porsiyonAdi', () => {
  const tr = metinleriAl('tr').beslenme.porsiyonlar;
  const en = metinleriAl('en').beslenme.porsiyonlar;

  it('ev ölçüsü kimlikle sözlükten çevrilir', () => {
    expect(porsiyonAdi(en, 'kase', '1 kase')).toBe('1 bowl');
    expect(porsiyonAdi(en, 'bardak', '1 su bardağı', 2)).toBe('2 glasses');
    expect(porsiyonAdi(tr, 'bardak', '1 su bardağı', 2)).toBe('2 su bardağı');
    expect(porsiyonAdi(tr, 'kase', null, 0.5)).toBe('0,5 kase');
  });

  it('günlükte "2 1 kase" çıkmaz', () => {
    expect(porsiyonAdi(tr, 'kase', '1 kase', 2)).toBe('2 kase');
  });

  it('sözlükte olmayan kimlik verideki ada düşer, ham kimlik basılmaz', () => {
    expect(porsiyonAdi(en, 'kutu-330', '1 kutu (330 ml)')).toBe('1 kutu (330 ml)');
    expect(porsiyonAdi(en, 'kutu-330', null)).toBe('');
  });
});
