import { describe, expect, it } from 'vitest';
import { bilesimHesapla, PISIRME_VERIMI, type BilesimKalemi } from './bilesim';

/**
 * Bileşimden makro hesabı (F5.6, F8.2).
 *
 * Bir yemeğin makrosu elle yazılacak bir sayı değil, malzemelerinin toplamı. Elle yazınca
 * kütüphane büyüdükçe hata da büyür; hesaplayınca hata kaynağı tek bir yerde kalır —
 * ham gıda tablosunda.
 *
 * Bu aynı zamanda ürünün sözü: "besin değeri veritabanından gelir, biz uydurmayız."
 * Yemek katmanı da bu kuralın istisnası olmamalı.
 */

const TABLO = new Map([
  ['tavuk göğsü', { kalori: 165, protein_g: 31, yag_g: 3.6, karbonhidrat_g: 0, lif_g: 0 }],
  ['pirinç', { kalori: 360, protein_g: 7, yag_g: 0.6, karbonhidrat_g: 79, lif_g: 1.3 }],
  ['zeytinyağı', { kalori: 884, protein_g: 0, yag_g: 100, karbonhidrat_g: 0, lif_g: 0 }],
]);

const bul = (ad: string) => TABLO.get(ad);

describe('bilesimHesapla — toplam', () => {
  it('tek malzemede o malzemenin değerini verir', () => {
    const kalemler: BilesimKalemi[] = [{ ad: 'tavuk göğsü', gram: 100 }];

    const sonuc = bilesimHesapla(kalemler, bul, { verim: 1 });

    expect(sonuc!.toplam.kalori).toBe(165);
    expect(sonuc!.toplam.protein_g).toBe(31);
  });

  it('miktarla doğru ölçekler', () => {
    const sonuc = bilesimHesapla([{ ad: 'tavuk göğsü', gram: 200 }], bul, { verim: 1 });

    expect(sonuc!.toplam.kalori).toBe(330);
    expect(sonuc!.toplam.protein_g).toBe(62);
  });

  it('malzemeleri toplar', () => {
    const sonuc = bilesimHesapla(
      [
        { ad: 'tavuk göğsü', gram: 100 },
        { ad: 'zeytinyağı', gram: 10 },
      ],
      bul,
      { verim: 1 },
    );

    expect(sonuc!.toplam.kalori).toBe(165 + 88);
    expect(sonuc!.toplam.yag_g).toBeCloseTo(3.6 + 10, 1);
  });

  it('yüz gram başına değeri pişmiş ağırlığa göre verir', () => {
    // 100 g tavuk + 100 g pirinç = 200 g ham; verim 1 ise 200 g pişmiş.
    const sonuc = bilesimHesapla(
      [
        { ad: 'tavuk göğsü', gram: 100 },
        { ad: 'pirinç', gram: 100 },
      ],
      bul,
      { verim: 1 },
    );

    expect(sonuc!.per_100g.kalori).toBe(Math.round((165 + 360) / 2));
  });
});

describe('bilesimHesapla — pişirme verimi', () => {
  /**
   * Pişirme ağırlığı değiştirir: et su kaybeder, pirinç su çeker. Toplam enerji sabit
   * kalır ama 100 gramdaki yoğunluk değişir. Bunu atlamak, pilavı iki kat kalorili
   * göstermek demek.
   */
  it('ağırlık kaybında 100 gramdaki yoğunluk artar', () => {
    const kalemler: BilesimKalemi[] = [{ ad: 'tavuk göğsü', gram: 100 }];

    const kayipsiz = bilesimHesapla(kalemler, bul, { verim: 1 })!;
    const kayipli = bilesimHesapla(kalemler, bul, { verim: 0.75 })!;

    expect(kayipli.per_100g.kalori).toBeGreaterThan(kayipsiz.per_100g.kalori);
    expect(kayipli.toplam.kalori).toBe(kayipsiz.toplam.kalori);
  });

  it('su çeken yemekte yoğunluk azalır', () => {
    const kalemler: BilesimKalemi[] = [{ ad: 'pirinç', gram: 100 }];

    const kuru = bilesimHesapla(kalemler, bul, { verim: 1 })!;
    const pismis = bilesimHesapla(kalemler, bul, { verim: 2.6 })!;

    expect(pismis.per_100g.kalori).toBeLessThan(kuru.per_100g.kalori);
  });

  it('verim verilmezse ağırlık değişmemiş sayılır', () => {
    const a = bilesimHesapla([{ ad: 'pirinç', gram: 100 }], bul);
    const b = bilesimHesapla([{ ad: 'pirinç', gram: 100 }], bul, { verim: 1 });

    expect(a).toEqual(b);
  });

  it('varsayılan verim katsayıları makul aralıkta', () => {
    expect(PISIRME_VERIMI.et).toBeLessThan(1);
    expect(PISIRME_VERIMI.tahil).toBeGreaterThan(1);
  });
});

describe('bilesimHesapla — eksik veri', () => {
  it('tanınmayan malzeme varsa null döner — yarım hesap yapmayız', () => {
    const sonuc = bilesimHesapla(
      [
        { ad: 'tavuk göğsü', gram: 100 },
        { ad: 'ejderha meyvesi', gram: 50 },
      ],
      bul,
      { verim: 1 },
    );

    expect(sonuc).toBeNull();
  });

  it('boş malzeme listesinde null döner', () => {
    expect(bilesimHesapla([], bul)).toBeNull();
  });

  it('sıfır gramlık malzeme toplamı bozmaz', () => {
    const sonuc = bilesimHesapla(
      [
        { ad: 'tavuk göğsü', gram: 100 },
        { ad: 'zeytinyağı', gram: 0 },
      ],
      bul,
      { verim: 1 },
    );

    expect(sonuc!.toplam.kalori).toBe(165);
  });
});

describe('bilesimHesapla — belirlenirlik', () => {
  it('aynı girdi her zaman aynı sonucu verir', () => {
    const kalemler: BilesimKalemi[] = [
      { ad: 'tavuk göğsü', gram: 137 },
      { ad: 'pirinç', gram: 63 },
    ];

    expect(bilesimHesapla(kalemler, bul, { verim: 1.4 })).toEqual(
      bilesimHesapla(kalemler, bul, { verim: 1.4 }),
    );
  });

  it('malzeme sırası sonucu değiştirmez', () => {
    const a: BilesimKalemi[] = [
      { ad: 'tavuk göğsü', gram: 100 },
      { ad: 'pirinç', gram: 50 },
    ];
    const b: BilesimKalemi[] = [
      { ad: 'pirinç', gram: 50 },
      { ad: 'tavuk göğsü', gram: 100 },
    ];

    expect(bilesimHesapla(a, bul)).toEqual(bilesimHesapla(b, bul));
  });
});
