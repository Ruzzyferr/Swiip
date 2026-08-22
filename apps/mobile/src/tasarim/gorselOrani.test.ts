import { describe, expect, it } from 'vitest';
import { EN_DAR, EN_GENIS, VARSAYILAN, gorselOrani } from './gorselOrani';

describe('gorselOrani', () => {
  it('kaynağın baskın oranını olduğu gibi bırakır', () => {
    expect(gorselOrani(850, 567)).toBeCloseTo(850 / 567, 5);
  });

  it('kare fotoğrafa dokunmaz', () => {
    expect(gorselOrani(760, 760)).toBe(1);
  });

  it('16:9 sınırın tam üstünde, kırpılmaz', () => {
    expect(gorselOrani(1280, 720)).toBeCloseTo(EN_GENIS, 5);
  });

  it('dikey fotoğrafı ekrandan taşmayacak kadar sınırlar', () => {
    // 850x1275 = 2:3. Sabit 4:3 kapta yüksekliğin %56'sı kesiliyordu.
    expect(gorselOrani(850, 1275)).toBe(EN_DAR);
  });

  it('ölçü yoksa varsayılana düşer', () => {
    expect(gorselOrani(undefined, undefined)).toBe(VARSAYILAN);
    expect(gorselOrani(0, 100)).toBe(VARSAYILAN);
  });
});
