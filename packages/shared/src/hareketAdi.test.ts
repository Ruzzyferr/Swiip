import { describe, expect, it } from 'vitest';
import { hareketAdi } from './hareketAdi';
import { HAREKET_KATALOGU } from './hareketler.uretilmis';

describe('hareketAdi', () => {
  it('İngilizce kullanıcıya İngilizce adı verir', () => {
    expect(hareketAdi({ ad_tr: 'Çekiç curl', ad_en: 'Hammer Curl' }, 'en')).toBe('Hammer Curl');
  });

  it('Türkçe kullanıcıya Türkçe adı verir', () => {
    expect(hareketAdi({ ad_tr: 'Çekiç curl', ad_en: 'Hammer Curl' }, 'tr')).toBe('Çekiç curl');
  });

  it('İngilizce adı yoksa Türkçesine düşer — uydurmuyoruz', () => {
    expect(hareketAdi({ ad_tr: 'Çekiç curl' }, 'en')).toBe('Çekiç curl');
  });

  it('hareket yoksa yedeği verir', () => {
    expect(hareketAdi(undefined, 'en', 'cekic-curl')).toBe('cekic-curl');
  });

  it('katalogtaki her hareketin İngilizce adı var', () => {
    // Yedek yolu bilerek duruyor ama bugün hiçbir harekette gerekmemeli:
    // eksik bir `ad_en` İngilizce arayüzde sessizce Türkçe bir ad basar.
    const eksik = HAREKET_KATALOGU.filter((h) => !h.ad_en || h.ad_en.trim() === '').map(
      (h) => h.id,
    );
    expect(eksik.slice(0, 10).join(', ')).toBe('');
  });

  it('İngilizce adlarda Türkçe karakter kalmamış', () => {
    const turkce = HAREKET_KATALOGU.filter((h) => /[çğıöşüÇĞİÖŞÜ]/.test(h.ad_en ?? '')).map(
      (h) => `${h.id}: ${h.ad_en}`,
    );
    expect(turkce.slice(0, 10).join('\n')).toBe('');
  });
});
