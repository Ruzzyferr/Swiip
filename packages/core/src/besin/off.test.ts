import { describe, expect, it } from 'vitest';
import { barkodGecerliMi, besinDegerleriMakulMu, offUrunuCevir, MAKUL_ARALIKLAR } from './off';

/**
 * Open Food Facts ürün dönüşümü (F5.5).
 *
 * OFF halka açık ve kullanıcı katkılı: içinde bozuk kayıt var. "100 g'da 5000 kalori"
 * veya "120 g protein" gibi değerler kullanıcının günlük toplamını sessizce mahveder.
 * Bu yüzden dönüşüm iyimser değil: makul aralığın dışındaki her kayıt reddedilir.
 *
 * Aynı kural içe aktarma betiğinde de geçerli — kanonik hâli burada.
 */

const SAGLAM = {
  code: '8690504042426',
  product_name: 'Süzme peynir',
  brands: 'Pınar',
  nutriments: {
    'energy-kcal_100g': 264,
    proteins_100g: 17.5,
    fat_100g: 21,
    carbohydrates_100g: 2.2,
    fiber_100g: 0,
  },
};

describe('offUrunuCevir', () => {
  it('sağlam kaydı bizim şeklimize çevirir', () => {
    const besin = offUrunuCevir(SAGLAM);

    expect(besin).not.toBeNull();
    expect(besin!.name_tr).toBe('Süzme peynir');
    expect(besin!.per_100g.kalori).toBe(264);
    expect(besin!.per_100g.protein_g).toBe(17.5);
    expect(besin!.barcode).toBe('8690504042426');
    expect(besin!.source).toBe('openfoodfacts');
  });

  it('Türkçe ürün adı varsa onu tercih eder', () => {
    const besin = offUrunuCevir({ ...SAGLAM, product_name_tr: 'Süzme peynir (light)' });

    expect(besin!.name_tr).toBe('Süzme peynir (light)');
  });

  it('marka bilgisini ilk markadan alır', () => {
    expect(offUrunuCevir({ ...SAGLAM, brands: 'Pınar, Yörsan' })!.brand).toBe('Pınar');
  });

  it('kJ cinsinden enerjiyi kcala çevirir', () => {
    const besin = offUrunuCevir({
      ...SAGLAM,
      nutriments: { ...SAGLAM.nutriments, 'energy-kcal_100g': undefined, energy_100g: 1105 },
    });

    expect(besin!.per_100g.kalori).toBe(264);
  });

  it('porsiyon bilgisi varsa taşır', () => {
    const besin = offUrunuCevir({ ...SAGLAM, serving_size: '30 g', serving_quantity: 30 });

    expect(besin!.portions).toEqual([{ id: 'porsiyon', ad: '30 g', gram: 30 }]);
  });

  it('porsiyon yoksa boş liste verir — uydurmayız', () => {
    expect(offUrunuCevir(SAGLAM)!.portions).toEqual([]);
  });

  it('eksik makroyu sıfır sayar, kaydı düşürmez', () => {
    const besin = offUrunuCevir({
      ...SAGLAM,
      nutriments: { 'energy-kcal_100g': 264, proteins_100g: 17.5 },
    });

    expect(besin!.per_100g.yag_g).toBe(0);
    expect(besin!.per_100g.lif_g).toBe(0);
  });
});

describe('offUrunuCevir — reddedilen kayıtlar', () => {
  it('adı olmayan kaydı reddeder', () => {
    expect(offUrunuCevir({ ...SAGLAM, product_name: '   ' })).toBeNull();
  });

  it('aşırı uzun adı reddeder — bu bir ad değil, açıklama', () => {
    expect(offUrunuCevir({ ...SAGLAM, product_name: 'a'.repeat(200) })).toBeNull();
  });

  it('enerji bilgisi olmayan kaydı reddeder', () => {
    expect(offUrunuCevir({ ...SAGLAM, nutriments: { proteins_100g: 10 } })).toBeNull();
  });

  it('barkodu olmayan kaydı reddeder — barkod aramasının anahtarı bu', () => {
    expect(offUrunuCevir({ ...SAGLAM, code: '' })).toBeNull();
  });
});

describe('besinDegerleriMakulMu', () => {
  const degerler = (ustuneYaz: Partial<Record<string, number>> = {}) => ({
    kalori: 264,
    protein_g: 17.5,
    yag_g: 21,
    karbonhidrat_g: 2.2,
    lif_g: 0,
    ...ustuneYaz,
  });

  it('sağlam değerleri kabul eder', () => {
    expect(besinDegerleriMakulMu(degerler())).toBe(true);
  });

  it('100 gramda 900 kaloriden fazlasını reddeder — saf yağ bile 900', () => {
    expect(besinDegerleriMakulMu(degerler({ kalori: 5000 }))).toBe(false);
  });

  it('negatif değeri reddeder', () => {
    expect(besinDegerleriMakulMu(degerler({ protein_g: -3 }))).toBe(false);
  });

  it('100 gramda 100 gramdan fazla proteini reddeder', () => {
    expect(besinDegerleriMakulMu(degerler({ protein_g: 120 }))).toBe(false);
  });

  it('makro toplamı 100 gramı belirgin aşarsa reddeder', () => {
    expect(besinDegerleriMakulMu(degerler({ protein_g: 50, yag_g: 50, karbonhidrat_g: 50 }))).toBe(
      false,
    );
  });

  it('ölçüm payına küçük bir tolerans bırakır', () => {
    // 101 g toplam: yuvarlama kaynaklı, gerçek veride sık; reddetmek fazla katı olur.
    expect(besinDegerleriMakulMu(degerler({ protein_g: 30, yag_g: 30, karbonhidrat_g: 41 }))).toBe(
      true,
    );
  });

  it('sayı olmayan değeri reddeder', () => {
    expect(besinDegerleriMakulMu({ ...degerler(), kalori: Number.NaN })).toBe(false);
  });

  it('aralıklar dışarıdan okunabilir — betik ile arayüz aynı kuralı paylaşsın', () => {
    expect(MAKUL_ARALIKLAR.kalori).toEqual([0, 900]);
  });
});

describe('belirlenirlik', () => {
  it('aynı ürün her zaman aynı besin kaydını verir', () => {
    expect(offUrunuCevir(SAGLAM)).toEqual(offUrunuCevir(SAGLAM));
  });
});

describe('barkodGecerliMi', () => {
  it('gerçek EAN-13 barkodunu kabul eder', () => {
    // Coca-Cola 330 ml — kontrol hanesi 7.
    expect(barkodGecerliMi('5449000000996')).toBe(true);
  });

  it('gerçek EAN-8 barkodunu kabul eder', () => {
    expect(barkodGecerliMi('96385074')).toBe(true);
  });

  it('tek haneli yazım hatasını yakalar', () => {
    expect(barkodGecerliMi('5449000000997')).toBe(false);
  });

  it('rakam olmayan karakteri reddeder', () => {
    expect(barkodGecerliMi('5449O00000996')).toBe(false);
  });

  it('yanlış uzunluktaki diziyi reddeder', () => {
    expect(barkodGecerliMi('544900000099')).toBe(false);
    expect(barkodGecerliMi('')).toBe(false);
  });

  it('baştaki ve sondaki boşluğu yutar', () => {
    expect(barkodGecerliMi('  5449000000996  ')).toBe(true);
  });
});
