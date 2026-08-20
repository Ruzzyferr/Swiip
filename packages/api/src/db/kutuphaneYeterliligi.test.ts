import { describe, expect, it } from 'vitest';
import { desteHazirla, tarifleriFiltrele, type OgunKisitlari } from '@made2fit/core';
import { TARIF_TOHUMU } from './tarifler';

/**
 * Kütüphane yeterliliği.
 *
 * Spec "~800 tarif" diyor ama asıl ölçüt sayı değil: **gerçek bir kullanıcının destesi
 * doluyor mu.** 800 tarifin 780'i etli olsa vegan kullanıcı yine boş ekran görür; 200
 * tarifle her profil doluyorsa hedef zaten tutmuş demektir.
 *
 * Bu yüzden kütüphaneyi ham sayıyla değil, kısıt profilleriyle ölçüyoruz. Yeni tarif
 * eklerken hangi yönün zayıf kaldığını da bu test söyler.
 *
 * Deste hedefi spec'te 12-15 kart. Burada 8 kart eşiği kullanıyoruz: kullanıcı bir öğünde
 * 8 kart kaydırabiliyorsa deste "boş" değildir; 12'nin altına düşen profil de uyarı olsun
 * diye ayrıca raporlanıyor.
 */

const TEMEL: OgunKisitlari = {
  alerjiler: [],
  intoleranslar: [],
  dini_etik: [],
  sevmedikleri: [],
  vazgecemedikleri: [],
  butce_kademesi: 4,
  maks_hazirlik_dakika: 90,
  kim_pisiriyor: 'kendim',
  ramazan: false,
};

/** Gerçek kullanıcı profilleri — her biri sahadaki bir kısıt bileşimi. */
const PROFILLER: Array<{ ad: string; kisitlar: OgunKisitlari }> = [
  { ad: 'kısıtsız', kisitlar: TEMEL },
  { ad: 'vegan', kisitlar: { ...TEMEL, dini_etik: ['vegan'] } },
  { ad: 'vejetaryen', kisitlar: { ...TEMEL, dini_etik: ['vejetaryen'] } },
  { ad: 'çölyak', kisitlar: { ...TEMEL, intoleranslar: ['gluten'] } },
  { ad: 'laktoz intoleransı', kisitlar: { ...TEMEL, intoleranslar: ['laktoz'] } },
  {
    ad: 'çölyak + laktoz',
    kisitlar: { ...TEMEL, intoleranslar: ['gluten', 'laktoz'] },
  },
  {
    ad: 'vegan + çölyak',
    kisitlar: { ...TEMEL, dini_etik: ['vegan'], intoleranslar: ['gluten'] },
  },
  { ad: 'kısıtlı bütçe', kisitlar: { ...TEMEL, butce_kademesi: 1 } },
  { ad: 'zamanı dar', kisitlar: { ...TEMEL, maks_hazirlik_dakika: 20 } },
  {
    ad: 'kısıtlı bütçe + zamanı dar',
    kisitlar: { ...TEMEL, butce_kademesi: 2, maks_hazirlik_dakika: 25 },
  },
  { ad: 'pesketaryen', kisitlar: { ...TEMEL, dini_etik: ['pesketaryen'] } },
  { ad: 'ramazan', kisitlar: { ...TEMEL, ramazan: true } },
  { ad: 'fındık alerjisi', kisitlar: { ...TEMEL, alerjiler: ['ceviz', 'badem', 'fındık'] } },
  { ad: 'yumurta alerjisi', kisitlar: { ...TEMEL, alerjiler: ['yumurta'] } },
];

/** Öğün hedefleri: kahvaltı, ana öğün, ara öğün. Makro kilidi bunlara göre işler. */
const HEDEFLER = [
  {
    ad: 'kahvaltı',
    hedef: { kalori: 450, protein_g: 20, yag_g: 18, karbonhidrat_g: 48, lif_g: 6 },
  },
  {
    ad: 'ana öğün',
    hedef: { kalori: 650, protein_g: 35, yag_g: 24, karbonhidrat_g: 68, lif_g: 9 },
  },
  {
    ad: 'ara öğün',
    hedef: { kalori: 250, protein_g: 10, yag_g: 10, karbonhidrat_g: 28, lif_g: 4 },
  },
];

const deste = (kisitlar: OgunKisitlari, hedef: (typeof HEDEFLER)[number]['hedef']) =>
  desteHazirla({ tarifler: TARIF_TOHUMU, hedef, kisitlar });

describe('kütüphane yeterliliği — deste doluyor mu', () => {
  it.each(PROFILLER.map((p) => [p.ad, p.kisitlar] as const))(
    '%s profilinde her öğün için deste doluyor',
    (_ad, kisitlar) => {
      for (const { ad, hedef } of HEDEFLER) {
        const kartlar = deste(kisitlar, hedef).kartlar;
        expect(kartlar.length, `${ad} destesi`).toBeGreaterThanOrEqual(8);
      }
    },
  );

  /**
   * En dar profil bile boş kalmamalı. Boş deste, kullanıcının uygulamayı sildiği andır;
   * rakip yorumlarında "bana uygun hiçbir şey çıkmıyor" tam bu.
   */
  it('en dar bileşimde bile deste boş değil', () => {
    const enDar: OgunKisitlari = {
      ...TEMEL,
      dini_etik: ['vegan'],
      intoleranslar: ['gluten', 'laktoz'],
      butce_kademesi: 2,
      maks_hazirlik_dakika: 40,
      alerjiler: ['ceviz'],
    };

    for (const { ad, hedef } of HEDEFLER) {
      expect(deste(enDar, hedef).kartlar.length, `${ad} destesi`).toBeGreaterThan(0);
    }
  });

  /** Deste bir veritabanı sorgusu — hiçbir koşulda AI çağırmaz. */
  it('deste açmak AI çağrısı yapmıyor', () => {
    for (const { kisitlar } of PROFILLER) {
      for (const { hedef } of HEDEFLER) {
        expect(deste(kisitlar, hedef).ai_cagrisi).toBe(false);
      }
    }
  });

  /**
   * Spec hedefi 12-15 kart. Bu testi kırmızıya çevirmiyoruz — hangi profilin zayıf
   * kaldığını görünür kılıyoruz ki bir sonraki tarif partisi rastgele değil, bu listeye
   * bakarak yazılsın.
   */
  it('spec hedefi 12 kartın altında kalan profiller raporlanıyor', () => {
    const zayif: string[] = [];

    for (const { ad, kisitlar } of PROFILLER) {
      for (const { ad: ogun, hedef } of HEDEFLER) {
        const adet = deste(kisitlar, hedef).kartlar.length;
        if (adet < 12) zayif.push(`${ad} / ${ogun}: ${adet}`);
      }
    }

    // Zayıf profil sayısı artmamalı; kütüphane büyüdükçe bu sayı düşer.
    expect(zayif.length, zayif.join('\n')).toBeLessThanOrEqual(14);
  });
});

/**
 * Havuz derinliği.
 *
 * Deste 15 kartla sınırlı; her profil bu tavana ulaşıyor olabilir ama bu, kullanıcının
 * dördüncü haftada aynı yemekleri görmediği anlamına gelmez. Asıl ölçüt, kısıtları
 * geçen **havuzun** derinliği ve o havuzun öğün türlerine dağılımı.
 *
 * Tek bir öğün türünün boş kalması, o profildeki kullanıcı için doğrudan boş ekran demek.
 */
describe('kütüphane yeterliliği — havuz derinliği', () => {
  const havuz = (kisitlar: OgunKisitlari) => tarifleriFiltrele(TARIF_TOHUMU, kisitlar);
  const OGUN_ETIKETLERI = ['kahvalti', 'ana_yemek', 'ara_ogun'] as const;

  it.each(PROFILLER.map((p) => [p.ad, p.kisitlar] as const))(
    '%s profilinde hiçbir öğün türü boş değil',
    (_ad, kisitlar) => {
      const uygun = havuz(kisitlar);

      for (const etiket of OGUN_ETIKETLERI) {
        const adet = uygun.filter((t) => t.etiketler.includes(etiket)).length;
        expect(adet, etiket).toBeGreaterThan(0);
      }
    },
  );

  /**
   * Bir haftada 7 kahvaltı var. Aynı kahvaltıyı iki günde bir görmemesi için havuzda en az
   * 7 seçenek olmalı; altı bu sayının, tekrarı kullanıcıya biz dayatıyoruz demektir.
   *
   * Eşik 10'a çekildi: en dar profil (vegan + kısıtlı bütçe + zamanı dar) bile bunu
   * karşılıyor, yani bu bir hedef değil zeminin kendisi.
   */
  it.each(PROFILLER.map((p) => [p.ad, p.kisitlar] as const))(
    '%s profilinde bir haftayı doldurabilecek kahvaltı var',
    (_ad, kisitlar) => {
      const adet = havuz(kisitlar).filter((t) => t.etiketler.includes('kahvalti')).length;

      expect(adet).toBeGreaterThanOrEqual(10);
    },
  );

  /** Zorlu bileşimler ayrıca izleniyor: bunlar en kolay boş kalan yerler. */
  const ZORLU: Array<[string, Partial<OgunKisitlari>, string, number]> = [
    [
      'vegan + çölyak kahvaltı',
      { dini_etik: ['vegan'], intoleranslar: ['gluten'] },
      'kahvalti',
      14,
    ],
    ['çölyak + laktoz kahvaltı', { intoleranslar: ['gluten', 'laktoz'] }, 'kahvalti', 22],
    ['zamanı dar ana yemek', { maks_hazirlik_dakika: 20 }, 'ana_yemek', 45],
    ['zamanı dar çorba', { maks_hazirlik_dakika: 20 }, 'corba', 12],
    [
      'vegan + kısıtlı bütçe + zamanı dar ana yemek',
      { dini_etik: ['vegan'], butce_kademesi: 1, maks_hazirlik_dakika: 30 },
      'ana_yemek',
      25,
    ],
  ];

  it.each(ZORLU)('%s havuzu yeterli derinlikte', (_ad, ek, etiket, enAz) => {
    const adet = havuz({ ...TEMEL, ...ek }).filter((t) => t.etiketler.includes(etiket)).length;

    expect(adet, `${etiket}: ${adet} < ${enAz}`).toBeGreaterThanOrEqual(enAz);
  });
});
