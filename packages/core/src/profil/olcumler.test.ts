import { describe, expect, it } from 'vitest';
import { aktiviteCarpani, antrenmanYasiBelirle, toparlanmaSkoru } from './olcumler';
import type { Cevaplar } from '../cevaplar';

describe('antrenmanYasiBelirle', () => {
  it.each([
    ['Hiç yapmadım', 'yeni'],
    ['6 aydan az', 'yeni'],
    ['6-12 ay', 'erken'],
    ['1-3 yıl', 'orta'],
    ['3-5 yıl', 'ileri'],
    ['5 yıldan fazla', 'kidemli'],
  ])('A1 = %s → %s', (a1, beklenen) => {
    expect(antrenmanYasiBelirle({ A1: a1, A3: 12 })).toBe(beklenen);
  });

  it('son 3 ayda 3 haftadan az antrenman yapan bir seviye aşağı iner', () => {
    expect(antrenmanYasiBelirle({ A1: '3-5 yıl', A3: 2 })).toBe('orta');
  });

  it('antrenmansızlık en fazla bir seviye düşürür', () => {
    expect(antrenmanYasiBelirle({ A1: '5 yıldan fazla', A3: 0 })).toBe('ileri');
  });

  it('yeni başlayan daha aşağı inemez', () => {
    expect(antrenmanYasiBelirle({ A1: 'Hiç yapmadım', A3: 0 })).toBe('yeni');
  });

  it('düzenli devam edende düşürme uygulanmaz', () => {
    expect(antrenmanYasiBelirle({ A1: '3-5 yıl', A3: 10 })).toBe('ileri');
  });

  it('A3 bilinmiyorsa beyan edilen seviye korunur', () => {
    expect(antrenmanYasiBelirle({ A1: '1-3 yıl' })).toBe('orta');
  });

  it('A1 cevapsızsa en muhafazakâr seviye seçilir', () => {
    expect(antrenmanYasiBelirle({})).toBe('yeni');
  });
});

describe('toparlanmaSkoru', () => {
  const ideal: Cevaplar = {
    K1: '1998-01-01',
    Y1: '7-8 saat',
    Y2: 9,
    Y4: 'Masa başı, çoğunlukla oturarak',
    Y6: 2,
  };

  it('iyi uyuyan, düşük stresli genç kullanıcıda yüksek çıkar', () => {
    expect(toparlanmaSkoru(ideal, 28)).toBeGreaterThan(0.9);
  });

  it('az uyuyan, yüksek stresli kullanıcıda düşük çıkar', () => {
    const skor = toparlanmaSkoru(
      { Y1: '5 saatten az', Y2: 2, Y4: 'Fiziksel iş yapıyorum', Y6: 9 },
      45,
    );
    expect(skor).toBeLessThan(0.35);
  });

  it('0 ile 1 arasında kalır', () => {
    const skor = toparlanmaSkoru({ Y1: '5 saatten az', Y2: 1, Y6: 10 }, 70);
    expect(skor).toBeGreaterThanOrEqual(0);
    expect(skor).toBeLessThanOrEqual(1);
  });

  it('yaş arttıkça düşer', () => {
    expect(toparlanmaSkoru(ideal, 25)).toBeGreaterThan(toparlanmaSkoru(ideal, 60));
  });

  it('cevap yoksa nötr orta değer verir', () => {
    const skor = toparlanmaSkoru({}, 35);
    expect(skor).toBeGreaterThan(0.4);
    expect(skor).toBeLessThan(0.75);
  });

  it('aynı girdi aynı çıktıyı verir', () => {
    expect(toparlanmaSkoru(ideal, 28)).toBe(toparlanmaSkoru(ideal, 28));
  });
});

describe('aktiviteCarpani', () => {
  it('masa başı çalışan, haftada 3 gün antrenman', () => {
    expect(aktiviteCarpani({ Y4: 'Masa başı, çoğunlukla oturarak' }, 3)).toBeCloseTo(1.34, 2);
  });

  it('fiziksel iş yapan daha yüksek çarpan alır', () => {
    expect(aktiviteCarpani({ Y4: 'Fiziksel iş yapıyorum' }, 3)).toBeCloseTo(1.79, 2);
  });

  it('antrenman günü başına 0,03 eklenir', () => {
    const uc = aktiviteCarpani({ Y4: 'Masa başı, çoğunlukla oturarak' }, 3);
    const alti = aktiviteCarpani({ Y4: 'Masa başı, çoğunlukla oturarak' }, 6);
    expect(alti - uc).toBeCloseTo(0.09, 2);
  });

  it('çok yüksek adım sayısı çarpanı yukarı çeker', () => {
    const bilinmeyen = aktiviteCarpani({ Y4: 'Masa başı, çoğunlukla oturarak' }, 3);
    const cokAdim = aktiviteCarpani(
      { Y4: 'Masa başı, çoğunlukla oturarak', Y5: "10.000'den fazla" },
      3,
    );
    expect(cokAdim).toBeGreaterThan(bilinmeyen);
  });

  it('çok düşük adım sayısı çarpanı aşağı çeker', () => {
    const azAdim = aktiviteCarpani({ Y4: 'Masa başı, çoğunlukla oturarak', Y5: "3.000'den az" }, 3);
    expect(azAdim).toBeLessThan(1.34);
  });

  it('fizyolojik sınırların dışına çıkmaz', () => {
    const carpan = aktiviteCarpani({ Y4: 'Fiziksel iş yapıyorum', Y5: "10.000'den fazla" }, 7);
    expect(carpan).toBeLessThanOrEqual(1.9);
  });

  it('cevap yoksa muhafazakâr taban kullanılır', () => {
    expect(aktiviteCarpani({}, 0)).toBeCloseTo(1.25, 2);
  });
});
