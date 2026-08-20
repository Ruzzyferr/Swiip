import { describe, expect, it } from 'vitest';
import {
  baslangicYuku,
  epley1rm,
  guvenDuzeltmesi,
  referansE1rm,
  tekrarYuzdesi,
  yukYuvarla,
} from './tahmin';

describe('epley1rm', () => {
  it('tek tekrarda ağırlığın kendisidir', () => {
    expect(epley1rm(100, 1)).toBe(100);
  });

  it('Epley formülünü uygular: kg × (1 + tekrar/30)', () => {
    expect(epley1rm(100, 5)).toBeCloseTo(116.67, 2);
    expect(epley1rm(80, 10)).toBeCloseTo(106.67, 2);
  });

  it('12 tekrarın üstünde tahmin güvenilirliği düşer, 12 ile sınırlanır', () => {
    expect(epley1rm(50, 20)).toBe(epley1rm(50, 12));
  });

  it('geçersiz girdide 0 döner', () => {
    expect(epley1rm(0, 5)).toBe(0);
    expect(epley1rm(100, 0)).toBe(0);
    expect(epley1rm(-10, 5)).toBe(0);
  });
});

describe('tekrarYuzdesi', () => {
  it('bilinen tablo değerlerini verir', () => {
    expect(tekrarYuzdesi(1)).toBeCloseTo(1, 3);
    expect(tekrarYuzdesi(5)).toBeCloseTo(0.87, 3);
    expect(tekrarYuzdesi(10)).toBeCloseTo(0.75, 3);
    expect(tekrarYuzdesi(12)).toBeCloseTo(0.7, 3);
  });

  it('tablo dışı tekrarlarda ara değer hesaplar', () => {
    const on_uc = tekrarYuzdesi(13);
    expect(on_uc).toBeLessThan(tekrarYuzdesi(12));
    expect(on_uc).toBeGreaterThan(tekrarYuzdesi(15));
  });

  it('tekrar arttıkça yüzde monoton azalır', () => {
    for (let t = 1; t < 20; t++) {
      expect(tekrarYuzdesi(t + 1)).toBeLessThan(tekrarYuzdesi(t));
    }
  });

  it('uç değerlerde sınırlanır', () => {
    expect(tekrarYuzdesi(0)).toBeCloseTo(1, 3);
    expect(tekrarYuzdesi(50)).toBeCloseTo(tekrarYuzdesi(30), 3);
  });
});

describe('yukYuvarla', () => {
  it('en yakın artış adımına yuvarlar', () => {
    expect(yukYuvarla(52.3, 2.5)).toBe(52.5);
    expect(yukYuvarla(51, 2.5)).toBe(50);
    expect(yukYuvarla(63, 5)).toBe(65);
  });

  it('aşağı yuvarlarken tabanın altına inmez', () => {
    expect(yukYuvarla(1, 2.5, 20)).toBe(20);
  });

  it('taban verilmezse sıfırın altına inmez', () => {
    expect(yukYuvarla(-5, 2.5)).toBe(0);
  });
});

describe('guvenDuzeltmesi', () => {
  it('teknik güveni düştükçe yük düşer', () => {
    expect(guvenDuzeltmesi(5, 'orta')).toBeGreaterThan(guvenDuzeltmesi(1, 'orta'));
  });

  it('yeni başlayan her zaman ek güvenlik payı alır', () => {
    expect(guvenDuzeltmesi(5, 'yeni')).toBeLessThan(guvenDuzeltmesi(5, 'orta'));
  });

  it('hiçbir durumda 1,0 üstüne çıkmaz', () => {
    expect(guvenDuzeltmesi(5, 'kidemli')).toBeLessThanOrEqual(1);
  });
});

describe('referansE1rm', () => {
  it('erkek orta seviye squat vücut ağırlığının 1,25 katı civarındadır', () => {
    expect(referansE1rm('squat', 'orta', 'erkek', 80)).toBeCloseTo(100, 0);
  });

  it('seviye arttıkça referans artar', () => {
    const yeni = referansE1rm('bench', 'yeni', 'erkek', 80);
    const kidemli = referansE1rm('bench', 'kidemli', 'erkek', 80);
    expect(kidemli).toBeGreaterThan(yeni * 2);
  });

  it('kadınlarda üst vücut referansı daha düşük katsayı alır', () => {
    const erkek = referansE1rm('bench', 'orta', 'erkek', 70);
    const kadin = referansE1rm('bench', 'orta', 'kadin', 70);
    expect(kadin).toBeLessThan(erkek * 0.8);
  });

  it('alt vücutta cinsiyet farkı üst vücuttan daha küçüktür', () => {
    const ustOran =
      referansE1rm('bench', 'orta', 'kadin', 70) / referansE1rm('bench', 'orta', 'erkek', 70);
    const altOran =
      referansE1rm('squat', 'orta', 'kadin', 70) / referansE1rm('squat', 'orta', 'erkek', 70);
    expect(altOran).toBeGreaterThan(ustOran);
  });
});

describe('baslangicYuku', () => {
  it('bilinen 1RM üzerinden hedef tekrarın üst ucuna göre hesaplar', () => {
    const kg = baslangicYuku({
      e1rm: 100,
      tekrarUst: 12,
      artisKg: 2.5,
      teknikGuveni: 5,
      antrenmanYasi: 'orta',
    });

    // 100 × 0,70 × 0,95 = 66,5 → 67,5
    expect(kg).toBe(67.5);
  });

  it('teknik güveni düşük kullanıcıya daha hafif başlatır', () => {
    const guvenli = baslangicYuku({
      e1rm: 100,
      tekrarUst: 12,
      artisKg: 2.5,
      teknikGuveni: 5,
      antrenmanYasi: 'orta',
    });
    const cekingen = baslangicYuku({
      e1rm: 100,
      tekrarUst: 12,
      artisKg: 2.5,
      teknikGuveni: 1,
      antrenmanYasi: 'orta',
    });

    expect(cekingen!).toBeLessThan(guvenli!);
  });

  it('barbell hareketlerinde boş bar ağırlığının altına inmez', () => {
    const kg = baslangicYuku({
      e1rm: 25,
      tekrarUst: 12,
      artisKg: 2.5,
      teknikGuveni: 1,
      antrenmanYasi: 'yeni',
      tabanKg: 20,
    });

    expect(kg).toBe(20);
  });

  it('vücut ağırlığı hareketinde yük atanmaz', () => {
    const kg = baslangicYuku({
      e1rm: 0,
      tekrarUst: 12,
      artisKg: 0,
      teknikGuveni: 3,
      antrenmanYasi: 'yeni',
      vucutAgirligi: true,
    });

    expect(kg).toBeNull();
  });

  it('dumbbell tavanı aşılmaz', () => {
    const kg = baslangicYuku({
      e1rm: 200,
      tekrarUst: 10,
      artisKg: 2,
      teknikGuveni: 5,
      antrenmanYasi: 'ileri',
      tavanKg: 12,
    });

    expect(kg).not.toBeNull();
    expect(kg!).toBeLessThanOrEqual(12);
  });

  it('aynı girdi her zaman aynı yükü verir', () => {
    const girdi = {
      e1rm: 137.5,
      tekrarUst: 10,
      artisKg: 2.5,
      teknikGuveni: 3,
      antrenmanYasi: 'orta' as const,
    };
    expect(baslangicYuku(girdi)).toBe(baslangicYuku(girdi));
  });
});
