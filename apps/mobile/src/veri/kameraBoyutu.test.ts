import { describe, expect, it } from 'vitest';
import { uygunKareBoyutu } from './kameraBoyutu';

describe('uygunKareBoyutu', () => {
  it('uzun kenarı 1920’yi aşmayan en büyük boyutu seçiyor', () => {
    expect(uygunKareBoyutu(['4000x3000', '1920x1080', '1280x960', '640x480'])).toBe('1920x1080');
  });

  it('yalnızca büyük boyutlar varsa seçmiyor (kamera varsayılanına düşer)', () => {
    expect(uygunKareBoyutu(['4000x3000', '3264x2448'])).toBeUndefined();
  });

  it('tanımadığı biçimleri (iOS ön ayar adları) atlıyor', () => {
    expect(uygunKareBoyutu(['Photo', 'High', '1440x1080'])).toBe('1440x1080');
  });
});
