import { describe, expect, it } from 'vitest';
import {
  besinToplami,
  eslesmeSkoru,
  kalemleriEslestir,
  kotaDusulmeliMi,
  tanimaCiktisiniAyristir,
  turkceNormalize,
} from './tanima';

const besinler = [
  {
    id: '1',
    ad: 'Izgara köfte',
    per_100g: { kalori: 240, protein_g: 19, yag_g: 17, karbonhidrat_g: 3, lif_g: 0.3 },
    porsiyonlar: [{ id: 'adet', ad: '1 adet', gram: 40 }],
  },
  {
    id: '2',
    ad: 'Patates kızartması',
    per_100g: { kalori: 312, protein_g: 3.4, yag_g: 15, karbonhidrat_g: 41, lif_g: 3.8 },
    porsiyonlar: [{ id: 'porsiyon', ad: '1 porsiyon', gram: 150 }],
  },
  {
    id: '3',
    ad: 'Pirinç pilavı',
    per_100g: { kalori: 160, protein_g: 3, yag_g: 3.5, karbonhidrat_g: 29, lif_g: 0.5 },
    porsiyonlar: [{ id: 'kepce', ad: '1 kepçe', gram: 90 }],
  },
];

describe('turkceNormalize', () => {
  it('Türkçe büyük harfleri doğru küçültür', () => {
    expect(turkceNormalize('IZGARA KÖFTE')).toBe('izgara kofte');
    expect(turkceNormalize('İSTANBUL')).toBe('istanbul');
  });

  it('aksanları sadeleştirir', () => {
    expect(turkceNormalize('Pirinç pilavı')).toBe('pirinc pilavi');
  });

  it('fazla boşluğu temizler', () => {
    expect(turkceNormalize('  köfte   ızgara ')).toBe('kofte izgara');
  });
});

/**
 * Persona kosusunda bulundu: "beyaz peynir (feta)" fotograftan dogru okundu ama
 * veritabaninda **Beyaz ekmek**e eslesti. Sebep noktalama: katalog adlarinin cogu
 * virgullu ("Beyaz peynir, tam yagli") ve kelime "peynir," olarak ayrisiyor; hicbir
 * zaman "peynir" ile eslesmiyor.
 *
 * Sessiz bir hata: eslesme bulunuyor, sadece yanlis olani buluyor. Kullaniciya peynirin
 * makrosu yerine ekmegin makrosu yaziliyordu.
 */
describe('turkceNormalize — noktalama', () => {
  it('virgül kelime sınırını bozmaz', () => {
    expect(turkceNormalize('Beyaz peynir, tam yağlı')).toBe('beyaz peynir tam yagli');
  });

  it('parantez ve tire temizlenir', () => {
    expect(turkceNormalize('beyaz peynir (feta)')).toBe('beyaz peynir feta');
    expect(turkceNormalize('pide/bazlama')).toBe('pide bazlama');
  });
});

describe('eslesmeSkoru — katalog adları noktalamalı', () => {
  it('peynir peynire eşleşir, ekmeğe değil', () => {
    const peynir = eslesmeSkoru('beyaz peynir (feta)', 'Beyaz peynir, tam yağlı');
    const ekmek = eslesmeSkoru('beyaz peynir (feta)', 'Beyaz ekmek');

    expect(peynir).toBeGreaterThan(ekmek);
  });

  it('virgüllü katalog adı tam eşleşmeyi kaçırmaz', () => {
    expect(eslesmeSkoru('kırmızı mercimek', 'Kırmızı mercimek, kuru')).toBeGreaterThan(0.6);
  });
});

/** Test besinlerinin bileşimi; bu testler eşleşmeye bakıyor, sayıya değil. */
function bilesim() {
  return { kalori: 100, protein_g: 5, yag_g: 2, karbonhidrat_g: 15, lif_g: 1 };
}

/**
 * Genel terimler.
 *
 * Persona kosusunda gorsel model coğu zaman genel ad verdi: "pilav", "ekmek", "misir".
 * Katalogda o genel adin sade karsiligi baska bir adla duruyor ("Pirinc pilavi",
 * "Ekmek, beyaz"), yaninda da bilesik yemekler var ("Perde pilav", "Etli ekmek").
 * Benzerlik skoru ikisini ayirt edemiyordu: her ikisi de terimi iceriyor ve kisa olan
 * kazaniyordu. Kullaniciya sade pilav yerine Perde pilav, ekmek yerine etli ekmek
 * yaziliyor — ve makrolar onun makrosu oluyordu.
 */
describe('genel terim sözlüğü', () => {
  const katalog = [
    { id: '1', ad: 'Perde pilav', per_100g: bilesim(), porsiyonlar: [] },
    { id: '2', ad: 'Pirinç pilavı', per_100g: bilesim(), porsiyonlar: [] },
    { id: '3', ad: 'Etli ekmek', per_100g: bilesim(), porsiyonlar: [] },
    { id: '4', ad: 'Ekmek, beyaz', per_100g: bilesim(), porsiyonlar: [] },
  ];

  it('"pilav" sade pirinç pilavına eşleşir, Perde pilava değil', () => {
    const [kalem] = kalemleriEslestir([{ ad: 'pilav', miktar: 1 }], katalog);

    expect(kalem?.besin?.ad).toBe('Pirinç pilavı');
  });

  it('"ekmek" beyaz ekmeğe eşleşir, etli ekmeğe değil', () => {
    const [kalem] = kalemleriEslestir([{ ad: 'Ekmek', miktar: 1 }], katalog);

    expect(kalem?.besin?.ad).toBe('Ekmek, beyaz');
  });

  /** Bileşik ad genel terim değil: sözlük araya girmemeli. */
  it('bileşik ad sözlüğe takılmaz', () => {
    const [kalem] = kalemleriEslestir([{ ad: 'perde pilav', miktar: 1 }], katalog);

    expect(kalem?.besin?.ad).toBe('Perde pilav');
  });

  it('sözlükteki karşılık katalogda yoksa normal eşleşmeye düşer', () => {
    const [kalem] = kalemleriEslestir(
      [{ ad: 'pilav', miktar: 1 }],
      [{ id: '1', ad: 'Perde pilav', per_100g: bilesim(), porsiyonlar: [] }],
    );

    expect(kalem?.besin?.ad).toBe('Perde pilav');
  });
});

describe('eslesmeSkoru', () => {
  it('birebir eşleşme en yüksek skoru alır', () => {
    expect(eslesmeSkoru('köfte', 'köfte')).toBe(1);
  });

  it('kelime içeren ad yüksek skor alır', () => {
    expect(eslesmeSkoru('köfte', 'Izgara köfte')).toBeGreaterThan(0.5);
  });

  it('alakasız ad düşük skor alır', () => {
    expect(eslesmeSkoru('köfte', 'Pirinç pilavı')).toBeLessThan(0.3);
  });

  it('Türkçe karakter farkı eşleşmeyi bozmaz', () => {
    expect(eslesmeSkoru('pilav', 'Pirinç pilavı')).toBeGreaterThan(0.4);
  });
});

describe('tanimaCiktisiniAyristir', () => {
  it('kalem listesi ve miktarları çıkarır', () => {
    const sonuc = tanimaCiktisiniAyristir(
      JSON.stringify({
        kalemler: [
          { ad: 'köfte', miktar: 3, birim: 'adet', gram_tahmini: 120 },
          { ad: 'patates', miktar: 1, birim: 'porsiyon', gram_tahmini: 150 },
        ],
      }),
    );

    expect(sonuc.kalemler).toHaveLength(2);
    expect(sonuc.kalemler[0]!.ad).toBe('köfte');
    expect(sonuc.kalemler[0]!.miktar).toBe(3);
  });

  it('modelin ürettiği kalori değerini reddeder — besin değeri veritabanından gelir', () => {
    const sonuc = tanimaCiktisiniAyristir(
      JSON.stringify({ kalemler: [{ ad: 'köfte', miktar: 3, birim: 'adet', kalori: 380 }] }),
    );

    expect(sonuc.kalemler[0]).not.toHaveProperty('kalori');
    expect(sonuc.uyari).toContain('besin değeri');
  });

  it('makro alanı geldiğinde de reddeder', () => {
    const sonuc = tanimaCiktisiniAyristir(
      JSON.stringify({ kalemler: [{ ad: 'pilav', miktar: 1, birim: 'kase', protein_g: 6 }] }),
    );

    expect(sonuc.uyari).toBeDefined();
    expect(JSON.stringify(sonuc.kalemler)).not.toContain('protein');
  });

  it('bozuk çıktıda boş liste döner, çökmez', () => {
    expect(tanimaCiktisiniAyristir('json değil').kalemler).toEqual([]);
  });

  it('geçersiz miktarı düzeltir', () => {
    const sonuc = tanimaCiktisiniAyristir(
      JSON.stringify({ kalemler: [{ ad: 'köfte', miktar: -5, birim: 'adet' }] }),
    );

    expect(sonuc.kalemler[0]!.miktar).toBe(1);
  });

  it('adsız kalemi atar', () => {
    const sonuc = tanimaCiktisiniAyristir(
      JSON.stringify({
        kalemler: [
          { miktar: 2, birim: 'adet' },
          { ad: 'pilav', miktar: 1 },
        ],
      }),
    );

    expect(sonuc.kalemler).toHaveLength(1);
  });

  it('en fazla 12 kalem kabul eder — tabakta 40 kalem yoktur', () => {
    const cok = Array.from({ length: 40 }, (_, i) => ({ ad: `kalem${i}`, miktar: 1 }));
    expect(tanimaCiktisiniAyristir(JSON.stringify({ kalemler: cok })).kalemler.length).toBe(12);
  });
});

describe('kalemleriEslestir', () => {
  it('tanınan kalemi veritabanı kaydına bağlar', () => {
    const sonuc = kalemleriEslestir([{ ad: 'köfte', miktar: 3, birim: 'adet' }], besinler);

    expect(sonuc[0]!.besin?.ad).toBe('Izgara köfte');
    expect(sonuc[0]!.eslesti).toBe(true);
  });

  it('eşleşme bulunamayan kalemi işaretler ama atmaz', () => {
    const sonuc = kalemleriEslestir([{ ad: 'ekşili çorba', miktar: 1 }], besinler);

    expect(sonuc[0]!.eslesti).toBe(false);
    expect(sonuc[0]!.besin).toBeUndefined();
  });

  it('adet birimi porsiyon gramına çevrilir', () => {
    const sonuc = kalemleriEslestir([{ ad: 'köfte', miktar: 3, birim: 'adet' }], besinler);

    expect(sonuc[0]!.gram).toBe(120);
  });

  it('gram tahmini varsa doğrudan kullanılır', () => {
    const sonuc = kalemleriEslestir(
      [{ ad: 'pilav', miktar: 1, birim: 'kepce', gram_tahmini: 200 }],
      besinler,
    );

    expect(sonuc[0]!.gram).toBe(200);
  });

  it('bilinmeyen birimde 100 g varsayar', () => {
    const sonuc = kalemleriEslestir([{ ad: 'köfte', miktar: 1, birim: 'tabak' }], besinler);

    expect(sonuc[0]!.gram).toBe(100);
  });
});

describe('besinToplami', () => {
  it('miktar × bileşim çarpımını uygular', () => {
    const toplam = besinToplami([
      { besin: besinler[0]!, gram: 120, ad: 'köfte', miktar: 3, eslesti: true },
    ]);

    // 240 kcal/100g × 1,2 = 288
    expect(toplam.kalori).toBe(288);
    expect(toplam.protein_g).toBeCloseTo(22.8, 1);
  });

  it('birden fazla kalemi toplar', () => {
    const toplam = besinToplami([
      { besin: besinler[0]!, gram: 120, ad: 'köfte', miktar: 3, eslesti: true },
      { besin: besinler[1]!, gram: 150, ad: 'patates', miktar: 1, eslesti: true },
    ]);

    expect(toplam.kalori).toBe(288 + 468);
  });

  it('eşleşmeyen kalem toplama girmez', () => {
    const toplam = besinToplami([{ gram: 100, ad: 'bilinmeyen', miktar: 1, eslesti: false }]);

    expect(toplam.kalori).toBe(0);
  });

  it('aynı girdi her zaman aynı toplamı verir', () => {
    const kalemler = [{ besin: besinler[2]!, gram: 180, ad: 'pilav', miktar: 2, eslesti: true }];

    expect(besinToplami(kalemler)).toEqual(besinToplami(kalemler));
  });
});

describe('kotaDusulmeliMi — kota adaleti', () => {
  it('normal tanıma kotadan düşer', () => {
    expect(kotaDusulmeliMi({ onbellekten: false, hataliTanimaTekrari: false })).toBe(true);
  });

  it('önbellekten gelen tanıma kotadan düşmez — bize maliyeti sıfır', () => {
    expect(kotaDusulmeliMi({ onbellekten: true, hataliTanimaTekrari: false })).toBe(false);
  });

  it('yanlış tanıma sonrası tekrar deneme kotadan düşmez — bizim hatamız', () => {
    expect(kotaDusulmeliMi({ onbellekten: false, hataliTanimaTekrari: true })).toBe(false);
  });

  it('ikisi birden doğruysa yine düşmez', () => {
    expect(kotaDusulmeliMi({ onbellekten: true, hataliTanimaTekrari: true })).toBe(false);
  });
});
