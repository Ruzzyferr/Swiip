import { describe, expect, it } from 'vitest';
import { TARIF_TOHUMU } from './tarifler';
import { bilesimHesapla } from '@made2fit/core';
import { besinAra } from './malzemeEslemesi';

/**
 * Tarif kütüphanesi veri sözleşmesi (F8).
 *
 * Tarifler elle giriliyor ve kütüphane büyüyecek. Buradaki testler iki şeyi koruyor:
 *
 *  1. **Doğruluk.** Makro ile kalori tutmuyorsa satırlardan biri yanlıştır; kullanıcı
 *     yanlış makro alır ve biz "aynı yemek aynı makro" sözünü tutmuş görünürüz.
 *  2. **Kapsam.** Kütüphane büyürken kısıt uzayının bir köşesi boş kalırsa deste boş
 *     döner: vegan kullanıcı "sana uygun tarif yok" ekranıyla karşılaşır. Bu, ürünün
 *     çalışmadığı anlamına gelir — eksik veri gibi görünse de bir hatadır.
 */

const KCAL = { protein: 4, karbonhidrat: 4, yag: 9 };

/** Tariflerde pay biraz daha geniş: pişirme kaybı ve malzeme yuvarlaması birikir. */
const SAPMA_ORANI = 0.3;
const SAPMA_TABANI = 40;

/** Tanımlı etiket dağarcığı. Kapalı liste, yazım hatası sessizce filtreyi bozmasın diye. */
const ETIKETLER = [
  'vegan',
  'vejetaryen',
  'glutensiz',
  'glutenli',
  'laktozsuz',
  'laktozlu',
  'et',
  'balik',
  'kahvalti',
  'ana_yemek',
  'corba',
  'salata',
  'ara_ogun',
  'tatli',
  'pisirme_yok',
  'yuksek_protein',
  'dusuk_karbonhidrat',
  'dusuk_kalori',
  'ramazan_uygun',
  'tek_tencere',
];

/** Bu kelimelerden biri geçen tarif hayvansal protein içerir; elle kontrol zorunlu. */
const HAYVANSAL = [
  'tavuk',
  'kıyma',
  'et ',
  'dana',
  'kuzu',
  'balık',
  'somon',
  'hamsi',
  'ton',
  'yumurta',
  'karides',
  'hindi',
  'sucuk',
  'pastırma',
];

function hesaplananKalori(tarif: (typeof TARIF_TOHUMU)[number]): number {
  const { protein_g, karbonhidrat_g, yag_g } = tarif.makrolar;
  return protein_g * KCAL.protein + karbonhidrat_g * KCAL.karbonhidrat + yag_g * KCAL.yag;
}

function hayvanselMi(tarif: (typeof TARIF_TOHUMU)[number]): boolean {
  const malzemeler = tarif.malzemeler.map((m) => m.ad.toLocaleLowerCase('tr-TR')).join(' | ');
  return HAYVANSAL.some((kelime) => malzemeler.includes(kelime));
}

describe('tarif kütüphanesi — kimlik', () => {
  it('aynı id iki kez geçmez', () => {
    const idler = TARIF_TOHUMU.map((t) => t.id);
    const tekrarlayan = idler.filter((id, i) => idler.indexOf(id) !== i);

    expect([...new Set(tekrarlayan)]).toEqual([]);
  });

  it('id biçimi tutarlı — küçük harf ve tire', () => {
    const bozuk = TARIF_TOHUMU.filter((t) => !/^[a-z0-9-]+$/.test(t.id));

    expect(bozuk.map((t) => t.id)).toEqual([]);
  });

  it('aynı ad iki kez geçmez', () => {
    const adlar = TARIF_TOHUMU.map((t) => t.ad);

    expect(new Set(adlar).size).toBe(adlar.length);
  });
});

describe('tarif kütüphanesi — içerik bütünlüğü', () => {
  it('her tarifin en az iki malzemesi var', () => {
    const eksik = TARIF_TOHUMU.filter((t) => t.malzemeler.length < 2);

    expect(eksik.map((t) => t.id)).toEqual([]);
  });

  it('her tarifin en az iki adımı var', () => {
    const eksik = TARIF_TOHUMU.filter((t) => t.adimlar_tr.length < 2);

    expect(eksik.map((t) => t.id)).toEqual([]);
  });

  it('adımlar boş cümle içermiyor', () => {
    for (const tarif of TARIF_TOHUMU) {
      for (const adim of tarif.adimlar_tr) {
        expect(adim.trim().length, tarif.id).toBeGreaterThan(10);
      }
    }
  });

  it('malzeme gramları makul', () => {
    for (const tarif of TARIF_TOHUMU) {
      for (const malzeme of tarif.malzemeler) {
        expect(malzeme.gram, `${tarif.id} · ${malzeme.ad}`).toBeGreaterThan(0);
        expect(malzeme.gram, `${tarif.id} · ${malzeme.ad}`).toBeLessThanOrEqual(500);
      }
    }
  });

  it('maliyet kademesi 1-4 arasında', () => {
    const bozuk = TARIF_TOHUMU.filter((t) => t.maliyet_kademesi < 1 || t.maliyet_kademesi > 4);

    expect(bozuk.map((t) => t.id)).toEqual([]);
  });

  it('hazırlık süresi makul', () => {
    const bozuk = TARIF_TOHUMU.filter((t) => t.hazirlik_dakika < 0 || t.hazirlik_dakika > 180);

    expect(bozuk.map((t) => t.id)).toEqual([]);
  });
});

describe('tarif kütüphanesi — makro tutarlılığı', () => {
  it('beyan edilen kalori makrolardan hesaplanana yakın', () => {
    const tutarsiz = TARIF_TOHUMU.filter((tarif) => {
      const hesap = hesaplananKalori(tarif);
      const pay = Math.max(SAPMA_TABANI, hesap * SAPMA_ORANI);
      return Math.abs(hesap - tarif.makrolar.kalori) > pay;
    }).map((t) => ({
      id: t.id,
      beyan: t.makrolar.kalori,
      hesap: Math.round(hesaplananKalori(t)),
    }));

    expect(tutarsiz).toEqual([]);
  });

  it('hiçbir makro negatif değil', () => {
    for (const tarif of TARIF_TOHUMU) {
      for (const [alan, deger] of Object.entries(tarif.makrolar)) {
        expect(deger, `${tarif.id} · ${alan}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('tarif kütüphanesi — etiket dağarcığı', () => {
  it('tanımsız etiket yok', () => {
    const tanimsiz = TARIF_TOHUMU.flatMap((t) =>
      t.etiketler.filter((e) => !ETIKETLER.includes(e)).map((e) => `${t.id}: ${e}`),
    );

    expect(tanimsiz).toEqual([]);
  });

  it('her tarif laktoz durumunu bildiriyor', () => {
    const eksik = TARIF_TOHUMU.filter(
      (t) => !t.etiketler.includes('laktozlu') && !t.etiketler.includes('laktozsuz'),
    );

    expect(eksik.map((t) => t.id)).toEqual([]);
  });

  it('her tarif gluten durumunu bildiriyor', () => {
    const eksik = TARIF_TOHUMU.filter(
      (t) => !t.etiketler.includes('glutenli') && !t.etiketler.includes('glutensiz'),
    );

    expect(eksik.map((t) => t.id)).toEqual([]);
  });

  it('vegan tarif aynı zamanda vejetaryen ve laktozsuzdur', () => {
    const celiskili = TARIF_TOHUMU.filter(
      (t) =>
        t.etiketler.includes('vegan') &&
        (!t.etiketler.includes('vejetaryen') || !t.etiketler.includes('laktozsuz')),
    );

    expect(celiskili.map((t) => t.id)).toEqual([]);
  });

  it('vegan tarif hayvansal malzeme içermez', () => {
    const celiskili = TARIF_TOHUMU.filter((t) => t.etiketler.includes('vegan') && hayvanselMi(t));

    expect(celiskili.map((t) => t.id)).toEqual([]);
  });
});

describe('tarif kütüphanesi — gıda güvenliği', () => {
  it('hayvansal protein içeren her tarif elle kontrol edilmiş', () => {
    const kontrolsuz = TARIF_TOHUMU.filter((t) => hayvanselMi(t) && !t.insan_kontrollu);

    expect(kontrolsuz.map((t) => t.id)).toEqual([]);
  });

  it('kontrol bayrağı hiçbir tarifte eksik değil', () => {
    const eksik = TARIF_TOHUMU.filter((t) => typeof t.insan_kontrollu !== 'boolean');

    expect(eksik.map((t) => t.id)).toEqual([]);
  });
});

describe('tarif kütüphanesi — kısıt uzayı kapsamı', () => {
  const sayi = (etiket: string) => TARIF_TOHUMU.filter((t) => t.etiketler.includes(etiket)).length;

  it.each([
    ['vegan', 58],
    ['vejetaryen', 110],
    ['glutensiz', 118],
    ['laktozsuz', 112],
    ['kahvalti', 29],
    ['ana_yemek', 98],
    ['corba', 19],
    ['ara_ogun', 24],
  ])('%s etiketinde en az %i tarif var', (etiket, enAz) => {
    expect(sayi(etiket)).toBeGreaterThanOrEqual(enAz);
  });

  it('her bütçe kademesinde seçenek var — kısıtlı bütçe boş deste görmemeli', () => {
    for (const kademe of [1, 2, 3, 4]) {
      const adet = TARIF_TOHUMU.filter((t) => t.maliyet_kademesi === kademe).length;
      expect(adet, `kademe ${kademe}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('pişirme süresi kısıtlı kullanıcı için hızlı seçenek var', () => {
    // B7: "Pişiremem" ve "15 dakikaya kadar" cevapları bunlara düşüyor.
    expect(TARIF_TOHUMU.filter((t) => t.hazirlik_dakika <= 15).length).toBeGreaterThanOrEqual(20);
    expect(
      TARIF_TOHUMU.filter((t) => t.etiketler.includes('pisirme_yok')).length,
    ).toBeGreaterThanOrEqual(8);
  });

  it('kütüphane hedefe doğru ilerliyor', () => {
    expect(TARIF_TOHUMU.length).toBeGreaterThanOrEqual(168);
  });
});

/**
 * Makroların malzemelerden doğrulanması (F5.6, F8.2).
 *
 * Atwater kontrolü satırın kendi içinde tutarlı olduğunu söyler; malzemelerle tutarlı
 * olduğunu söylemez. "300 g tavuk yazıp 12 g protein beyan etmek" Atwater'dan geçer ama
 * yanlıştır. Bu test tarifin makrosunu ham gıda tablosundan yeniden hesaplar.
 *
 * Malzeme adı tabloda karşılığı olmayan tarifler kapsam dışı — sözlük büyüdükçe kapsam
 * kendiliğinden genişler ve kaç tarifin kapsandığı ayrıca ölçülür.
 */
describe('tarif kütüphanesi — makrolar malzemelerle tutarlı', () => {
  /** Tarif malzemesi ile besin tablosu adları birebir aynı değil; köprü burada. */
  const cozul = besinAra;
  const cozulenler = TARIF_TOHUMU.filter((t) => t.malzemeler.every((m) => cozul(m.ad)));

  it('tariflerin çoğunun malzemesi besin tablosunda karşılanıyor', () => {
    // Kapsam düştükçe çapraz kontrol anlamsızlaşır; eşik onu görünür tutuyor.
    expect(cozulenler.length / TARIF_TOHUMU.length).toBeGreaterThanOrEqual(0.6);
  });

  /**
   * Pay bir miktar geniş: pişirme verimi tarif başına değişiyor ve malzeme adları birebir
   * eşleşmiyor (ör. "biber" için kırmızı biber değeri kullanılıyor). Ama %35 sapma bir
   * yazım ya da birim hatasıdır — çiğ ağırlığı pişmiş sanmak tam olarak bu aralığa düşer.
   */
  it('hesaplanan ve beyan edilen kalori üçte birden fazla ayrışmıyor', () => {
    const sapanlar = cozulenler
      .map((tarif) => {
        const hesap = bilesimHesapla(
          tarif.malzemeler.map((m) => ({ ad: m.ad, gram: m.gram })),
          cozul,
        );
        return { tarif, hesap };
      })
      .filter(({ tarif, hesap }) => {
        if (!hesap) return false;
        const oran = hesap.toplam.kalori / Math.max(1, tarif.makrolar.kalori);
        return oran > 1.35 || oran < 0.7;
      })
      .map(({ tarif, hesap }) => ({
        id: tarif.id,
        beyan: tarif.makrolar.kalori,
        hesap: hesap!.toplam.kalori,
      }));

    expect(sapanlar).toEqual([]);
  });

  it('protein beyanı hesaplanandan belirgin yüksek değil — abartılmış protein satmayız', () => {
    const sapanlar = cozulenler
      .map((tarif) => {
        const hesap = bilesimHesapla(
          tarif.malzemeler.map((m) => ({ ad: m.ad, gram: m.gram })),
          cozul,
        );
        return { tarif, hesap };
      })
      .filter(
        ({ tarif, hesap }) =>
          hesap !== null && tarif.makrolar.protein_g > hesap.toplam.protein_g * 1.6 + 5,
      )
      .map(({ tarif, hesap }) => ({
        id: tarif.id,
        beyan: tarif.makrolar.protein_g,
        hesap: hesap!.toplam.protein_g,
      }));

    expect(sapanlar).toEqual([]);
  });
});

/**
 * `insan_kontrollu: true` bir **beyan**, kanıt değil. Bayrağı bir insanın koyduğuna
 * güveniyoruz ama bayrak, adımların içinde ne yazdığını denetlemiyor.
 *
 * Tavuk ve kıymanın az pişmesi salmonella ve E. coli demek. Sağlık uygulamasında bunu
 * kütüphanenin büyümesine bırakamayız: 171 tarifte gözle görülür, 800 tarifte görülmez.
 * Bu yüzden pişirme yeterliliğini makineye denetletiyoruz.
 */
describe('tarif kütüphanesi — pişirme yeterliliği', () => {
  /** Az pişmesi bakteriyel risk taşıyan malzemeler. */
  const RISKLI = ['tavuk', 'hindi', 'kıyma', 'köfte', 'balık', 'somon', 'hamsi', 'yumurta'];

  /** Adımlarda aranan pişme yeterliliği işaretleri. */
  const YETERLILIK = [
    'iyice piş',
    'tamamen piş',
    'suyunu çekene kadar',
    'kızarana kadar',
    'pembelik kalmayana kadar',
    'içi beyazlayana kadar',
    'katılaşana kadar',
    'fokurdayana kadar',
    'kaynayana kadar',
    'kaynat',
    'közle',
    'dakika piş',
    'dakika fırınla',
    'dakika kavur',
    'dakika haşla',
  ];

  /** Adımlarda **hiçbir** tarifte geçmemesi gereken ifadeler. */
  const YASAK = ['az pişmiş', 'çiğ tavuk', 'çiğ kıyma', 'akışkan kalmalı', 'rare'];

  /**
   * Pişirmeden yenen, üretimde ısıl işlem görmüş ürünler. Bunlara "iyice pişir" demek
   * anlamsız olurdu; ama denetimden tamamen muaf da tutmuyoruz — soğuk zincir uyarısı
   * istiyoruz, çünkü bu ürünlerin gerçek riski az pişme değil, sıcakta bekleme.
   */
  const HAZIR_TUKETIM = ['füme', 'salam', 'jambon'];

  const kucuk = (t: string) => t.toLocaleLowerCase('tr-TR');
  const hazirMi = (tarif: (typeof TARIF_TOHUMU)[number]) =>
    tarif.malzemeler.some((m) => HAZIR_TUKETIM.some((h) => kucuk(m.ad).includes(h)));
  const riskliMi = (tarif: (typeof TARIF_TOHUMU)[number]) =>
    !hazirMi(tarif) && tarif.malzemeler.some((m) => RISKLI.some((r) => kucuk(m.ad).includes(r)));

  it('riskli malzeme içeren her tarifte pişme yeterliliği yazıyor', () => {
    const eksik = TARIF_TOHUMU.filter((t) => {
      if (!riskliMi(t)) return false;
      const metin = kucuk(t.adimlar_tr.join(' '));
      return !YETERLILIK.some((y) => metin.includes(y));
    });

    expect(eksik.map((t) => t.id)).toEqual([]);
  });

  it('hiçbir tarif az pişmiş hayvansal ürün önermiyor', () => {
    const tehlikeli = TARIF_TOHUMU.filter((t) =>
      YASAK.some((y) => kucuk(t.adimlar_tr.join(' ')).includes(y)),
    );

    expect(tehlikeli.map((t) => t.id)).toEqual([]);
  });

  it('hazır tüketim ürünlü tarifte soğuk zincir uyarısı var', () => {
    const uyarisiz = TARIF_TOHUMU.filter((t) => {
      if (!hazirMi(t)) return false;
      const metin = kucuk(t.adimlar_tr.join(' '));
      return !metin.includes('soğuk') && !metin.includes('buzdolab');
    });

    expect(uyarisiz.map((t) => t.id)).toEqual([]);
  });

  it('denetim gerçekten bir şey tarıyor — riskli tarif kümesi boş değil', () => {
    expect(TARIF_TOHUMU.filter(riskliMi).length).toBeGreaterThan(20);
  });
});
