import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { aramaAnahtari, KATLANAN, KATLANMIS } from '@swiip/shared';
import { foods } from '../db/sema';
import type { FastifyInstance } from 'fastify';
import { besinleriTohumla } from '../db/tohum';
import { besinHesapla } from './beslenme';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { uygulamaOlustur } from '../uygulama';
import { sahteBarkodSaglayici } from '../servisler/barkod';
import { VARSAYILAN_SAAT_DILIMI, yerelGunISO } from '../gun';
import { kayitIstegi } from '../test/kayit';

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
  await besinleriTohumla(uygulama.ortam.db);

  const kayit = await kayitIstegi(app, {
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'beslenme@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const yetkili = () => ({ authorization: `Bearer ${token}` });

async function besinAra(sorgu: string) {
  return app.inject({
    method: 'GET',
    url: `/v1/beslenme/besin/ara?q=${encodeURIComponent(sorgu)}`,
    headers: yetkili(),
  });
}

async function besinBul(ad: string) {
  const cevap = await app.inject({
    method: 'GET',
    url: `/v1/beslenme/besin/ara?q=${encodeURIComponent(ad)}`,
    headers: yetkili(),
  });
  return cevap.json().sonuclar[0];
}

describe('besinHesapla — toplam = miktar × bileşim', () => {
  const per100g = { kalori: 160, protein_g: 3, yag_g: 3.5, karbonhidrat_g: 29, lif_g: 0.5 };
  const porsiyonlar = [
    { id: 'kepce', ad: '1 kepçe', gram: 90 },
    { id: 'kase', ad: '1 kase', gram: 180 },
  ];

  it('gram cinsinden doğrudan hesaplar', () => {
    expect(besinHesapla(per100g, porsiyonlar, 200).kalori).toBe(320);
  });

  it('ev ölçüsüyle porsiyon gramını kullanır', () => {
    expect(besinHesapla(per100g, porsiyonlar, 1, 'kepce').kalori).toBe(144);
  });

  it('iki kepçe iki katı eder', () => {
    const bir = besinHesapla(per100g, porsiyonlar, 1, 'kepce').kalori;
    const iki = besinHesapla(per100g, porsiyonlar, 2, 'kepce').kalori;

    expect(iki).toBe(bir * 2);
  });

  it('aynı girdi her zaman aynı makroyu verir', () => {
    const a = besinHesapla(per100g, porsiyonlar, 1.5, 'kase');
    const b = besinHesapla(per100g, porsiyonlar, 1.5, 'kase');

    expect(a).toEqual(b);
  });

  it('bilinmeyen porsiyon 100 g varsayar, sessizce sıfırlamaz', () => {
    expect(besinHesapla(per100g, porsiyonlar, 1, 'olmayan').kalori).toBe(160);
  });
});

describe('besin veritabanı', () => {
  it('Türkçe adla arama yapar', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=pilav',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().sonuclar.length).toBeGreaterThan(0);
  });

  it('ev ölçü birimleri gram yanında sunulur', async () => {
    const besin = await besinBul('Pirinç pilavı');
    const porsiyonlar = besin.portions as Array<{ id: string; ad: string; gram: number }>;

    expect(porsiyonlar.map((p) => p.id)).toContain('kepce');
    expect(porsiyonlar.map((p) => p.ad)).toContain('1 kase');
  });

  /*
   * Uygulama 175 ülkede. İngilizce arayüzdeki kullanıcı "chicken" yazdığında arama
   * yalnızca `name_tr`'ye baktığı için HİÇBİR ŞEY bulmuyordu.
   */
  it('İngilizce adla arama yapar ve İngilizce adı döndürür', async () => {
    const cevap = await besinAra('chicken breast');

    expect(cevap.statusCode).toBe(200);
    const sonuclar = cevap.json().sonuclar as Array<{ name_tr: string; name_en: string | null }>;
    expect(sonuclar.length).toBeGreaterThan(0);
    expect(sonuclar.map((b) => b.name_tr)).toContain('Tavuk göğsü, pişmiş');
    expect(sonuclar.every((b) => (b.name_en ?? '').toLowerCase().includes('chicken breast'))).toBe(
      true,
    );
  });

  /*
   * Eşleşme kalitesine göre sıralama. Sıralama yalnızca "doğrulanmış mı" iken "tavuk"
   * aramasının ilk sekiz sonucunda "Tavuk göğsü" yoktu (emülatörde görüldü); listenin
   * başında "Tavuklu wrap, zincir" gibi kalemler vardı.
   */
  it('adı sorguyla BAŞLAYANLAR önce geliyor', async () => {
    const cevap = await besinAra('tavuk');
    const adlar = (cevap.json().sonuclar as Array<{ name_tr: string }>).map((b) => b.name_tr);
    const ilkSekiz = adlar.slice(0, 8);
    expect(ilkSekiz).toContain('Tavuk göğsü, pişmiş');
    const baslayanlar = adlar.filter((a) => a.toLocaleLowerCase('tr').startsWith('tavuk'));
    expect(adlar.slice(0, baslayanlar.length)).toEqual(baslayanlar);
  });

  it('İngilizce arama büyük-küçük harf duyarsız', async () => {
    const cevap = await besinAra('LENTIL');
    const sonuclar = cevap.json().sonuclar as Array<{ name_tr: string }>;

    expect(sonuclar.map((b) => b.name_tr)).toContain('Mercimek çorbası');
  });

  it('kısa sorgu reddedilir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=a',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(400);
  });
});

describe('yemek kaydı', () => {
  it('aynı yemek iki kez eklendiğinde aynı makro çıkar', async () => {
    const besin = await besinBul('Pirinç pilavı');

    const ilk = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: yetkili(),
      payload: { food_id: besin.id, miktar: 1, portion_id: 'kase', gun: '2026-08-19' },
    });
    const ikinci = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: yetkili(),
      payload: { food_id: besin.id, miktar: 1, portion_id: 'kase', gun: '2026-08-19' },
    });

    expect(ilk.json().hesaplanan).toEqual(ikinci.json().hesaplanan);
  });

  it('günlük toplam kayıtlardan hesaplanır', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/gun/2026-08-19',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kayitlar.length).toBeGreaterThanOrEqual(2);
    expect(cevap.json().toplam.kalori).toBeGreaterThan(0);
  });

  it('kayıt silinebilir', async () => {
    const gun = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/gun/2026-08-19',
      headers: yetkili(),
    });
    const id = gun.json().kayitlar[0].id;

    const silme = await app.inject({
      method: 'DELETE',
      url: `/v1/beslenme/kayit/${id}`,
      headers: yetkili(),
    });

    expect(silme.statusCode).toBe(200);
  });

  it('olmayan besin kaydedilemez', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: yetkili(),
      payload: { food_id: '00000000-0000-0000-0000-000000000000', miktar: 1 },
    });

    expect(cevap.statusCode).toBe(404);
  });
});

describe('kilo takibi ve TDEE uyumu', () => {
  it('kilo kaydedilir ve aynı gün üzerine yazılır', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kilo',
      headers: yetkili(),
      payload: { kilo_kg: 82.4, gun: '2026-08-19' },
    });
    const ikinci = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kilo',
      headers: yetkili(),
      payload: { kilo_kg: 82.1, gun: '2026-08-19' },
    });

    expect(ikinci.statusCode).toBe(200);
  });

  it('geçersiz kilo reddedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kilo',
      headers: yetkili(),
      payload: { kilo_kg: 5 },
    });

    expect(cevap.statusCode).toBe(400);
  });

  it('profil olmadan hedef hesaplanamaz ve nedeni söylenir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/hedef',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().mesaj).toContain('değerlendirme');
  });
});

describe('barkod — Open Food Facts yedeği (F5.5)', () => {
  it('veritabanında olmayan barkod OFF üzerinden bulunur', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/barkod/8690000000017',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().name_tr).toBe('Test yulaf ezmesi');
    expect(cevap.json().source).toBe('openfoodfacts');
  });

  it('OFF sonucu yerel veritabanına yazılır — ikinci sorgu ağa çıkmaz', async () => {
    const oncekiCagri = uygulama.barkodSaglayici.cagriSayisi;

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/barkod/8690000000017',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(uygulama.barkodSaglayici.cagriSayisi).toBe(oncekiCagri);
    expect(cevap.json().kaynak).toBe('yerel');
  });

  it('OFF kaydı doğrulanmamış olarak işaretlenir — insan onayından geçmedi', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/barkod/8690000000017',
      headers: yetkili(),
    });

    expect(cevap.json().verified).toBe(false);
  });

  it('yazılan kayıt arama sonuçlarında da çıkar', async () => {
    const besin = await besinBul('Test yulaf');

    expect(besin?.name_tr).toBe('Test yulaf ezmesi');
    expect(besin?.source).toBe('openfoodfacts');
  });

  it('OFF de bilmiyorsa açık bir mesajla 404 döner', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/barkod/0000000000000',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(404);
    expect(cevap.json().mesaj).toContain('Elle ekleyebilirsin');
  });

  it('kaydedilen besin normal yemek kaydında kullanılabilir', async () => {
    const barkod = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/barkod/8690000000017',
      headers: yetkili(),
    });

    const kayit = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: yetkili(),
      payload: {
        food_id: barkod.json().id,
        miktar: 100,
        gun: '2026-09-01',
        entry_method: 'barkod',
      },
    });

    expect(kayit.statusCode).toBe(200);
    expect(kayit.json().hesaplanan.kalori).toBe(379);
  });
});

/**
 * Arama kapsamı.
 *
 * Manuel kalori girişi **ücretsiz planın** çekirdeği ve uygulamanın günde en çok
 * dokunulan yeri. Aradığını bulamayan kullanıcı için ürün tam orada kırılır — hiçbir
 * program kalitesi bunu telafi etmez.
 *
 * Bu yüzden kütüphaneyi kayıt sayısıyla değil, **gerçek sorgularla** ölçüyoruz.
 */
describe('besin arama kapsamı', () => {
  /** Türkiye'de günlük hayatta en sık aranacak yemek ve besinler. */
  const GUNLUK_SORGULAR = [
    'pilav',
    'köfte',
    'yoğurt',
    'peynir',
    'ekmek',
    'tavuk',
    'çorba',
    'makarna',
    'yumurta',
    'zeytin',
    'muz',
    'elma',
    'süt',
    'mercimek',
    'bulgur',
    'balık',
    'salata',
    'börek',
    'simit',
    'ayran',
  ];

  it.each(GUNLUK_SORGULAR)('"%s" araması sonuç veriyor', async (sorgu) => {
    const cevap = await besinAra(sorgu);

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().sonuclar.length).toBeGreaterThan(0);
  });

  /**
   * Türk klavyesi olmayan ya da acelesi olan kullanıcı "yogurt", "kofte", "corba" yazar.
   * Aramanın burada boş dönmesi, veritabanında kayıt olmadığı anlamına gelmez — bulamamak
   * kullanıcı için ikisi de aynı şeydir.
   */
  const SAPKASIZ = [
    ['yogurt', 'yoğurt'],
    ['kofte', 'köfte'],
    ['corba', 'çorba'],
    ['balik', 'balık'],
    ['sut', 'süt'],
    ['borek', 'börek'],
  ] as const;

  it.each(SAPKASIZ)('"%s" yazan kullanıcı "%s" kayıtlarını buluyor', async (sapkasiz) => {
    const cevap = await besinAra(sapkasiz);

    expect(cevap.json().sonuclar.length).toBeGreaterThan(0);
  });
});

/**
 * Katlama iki yerde yazılı: JS'te `aramaAnahtari`, SQL'de `lower(translate(...))`.
 * İkisi ayrışırsa arama sessizce yanlış çalışır — hata vermez, sadece bulmaz.
 *
 * Bu yüzden tohumlanmış tablonun **tamamı** üzerinde karşılaştırılıyor.
 */
describe('arama katlaması — JS ile SQL aynı şeyi yapıyor', () => {
  it('tohumdaki her besin adı iki tarafta da aynı anahtara katlanıyor', async () => {
    const satirlar: Array<{ ad: string; sqlAnahtar: string }> = await uygulama.ortam.db
      .select({
        ad: foods.name_tr,
        sqlAnahtar: sql<string>`lower(translate(${foods.name_tr}, ${KATLANAN}, ${KATLANMIS}))`,
      })
      .from(foods);

    expect(satirlar.length).toBeGreaterThan(300);

    const ayrisan = satirlar
      .filter((s) => s.sqlAnahtar !== aramaAnahtari(s.ad))
      .map((s) => ({ ad: s.ad, sql: s.sqlAnahtar, js: aramaAnahtari(s.ad) }));

    expect(ayrisan).toEqual([]);
  });

  it('katlama büyük harfli Türkçe girdide de tutuyor', () => {
    expect(aramaAnahtari('İZMİR KÖFTE')).toBe('izmir kofte');
    expect(aramaAnahtari('Yoğurt, Yağsız')).toBe('yogurt, yagsiz');
  });
});

/**
 * Kapsam genişliği.
 *
 * Yukarıdaki liste en sık aranan yirmi şeyi kontrol ediyor; asıl risk kuyrukta. Kullanıcı
 * "ahududu" veya "sosis" arayıp bulamazsa o öğünü hiç kaydetmez, gün eksik kalır ve
 * hedef takibi bozulur. Bulamamak, kullanıcı için "bu uygulama işe yaramıyor" demektir.
 *
 * Bu liste bir cırcır: kapsam büyüdükçe genişler, küçülemez.
 */
describe('besin arama kapsamı — kuyruk', () => {
  const KUYRUK = [
    'turp',
    'kiraz',
    'ananas',
    'greyfurt',
    'böğürtlen',
    'ahududu',
    'yaban mersini',
    'uskumru',
    'alabalık',
    'pastırma',
    'sosis',
    'arpa',
    'susam',
    'kısır',
    'piyaz',
    'meyve suyu',
    'kruvasan',
    'kurabiye',
    'gofret',
    'cips',
    'sandviç',
    'nugget',
  ];

  it.each(KUYRUK)('"%s" araması sonuç veriyor', async (sorgu) => {
    expect((await besinAra(sorgu)).json().sonuclar.length).toBeGreaterThan(0);
  });

  /**
   * Alkol **yargısız** listeleniyor.
   *
   * İçen kullanıcı içtiğini kaydedemezse günü eksik kalır ve bütün hesap kayar. Kaydını
   * tutamadığımız kalori, olmayan kalori değildir. Ürün burada ahlak dersi vermiyor,
   * doğru sayı veriyor.
   */
  it.each(['bira', 'şarap', 'rakı'])('"%s" araması sonuç veriyor', async (sorgu) => {
    expect((await besinAra(sorgu)).json().sonuclar.length).toBeGreaterThan(0);
  });
});

/**
 * "Gram" seçimi `portion_id: null` olarak geliyor.
 *
 * Arama ekranı gram seçildiğinde alanı `null` gönderiyor; şema yalnızca `undefined`
 * kabul ettiği için gramla eklenen her yemek 400 alıyordu.
 */
describe('gramla kayıt', () => {
  it('portion_id null gelince gram sayılır', async () => {
    const pilav = await besinBul('pilav');
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: yetkili(),
      payload: { food_id: pilav.id, miktar: 200, portion_id: null, gun: '2026-07-01' },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kayit.portion_id).toBeNull();
  });
});

/**
 * Varsayılan gün kullanıcının günü, UTC değil.
 *
 * Gün göndermeyen yollar (barkod, tanıma onayı, tartı) UTC'ye göre yazıyordu: Türkiye'de
 * gece yarısından sonra eklenen yemek dünün listesine düşüyordu.
 */
describe('varsayılan gün', () => {
  it('istemcinin saat dilimine göre yazılır', async () => {
    const pilav = await besinBul('pilav');
    // Kiribati (UTC+14) ile Baker adası (UTC-12) arasında her an farklı takvim günü var.
    const ileri = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: { ...yetkili(), 'x-saat-dilimi': 'Pacific/Kiritimati' },
      payload: { food_id: pilav.id, miktar: 100 },
    });
    const geri = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: { ...yetkili(), 'x-saat-dilimi': 'Etc/GMT+12' },
      payload: { food_id: pilav.id, miktar: 100 },
    });

    expect(ileri.json().kayit.gun).toBe(yerelGunISO(new Date(), 'Pacific/Kiritimati'));
    expect(geri.json().kayit.gun).toBe(yerelGunISO(new Date(), 'Etc/GMT+12'));
    expect(ileri.json().kayit.gun).not.toBe(geri.json().kayit.gun);
  });

  it('başlık yoksa birincil pazarın günü; geçersiz başlık 500 üretmez', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/su',
      headers: { ...yetkili(), 'x-saat-dilimi': 'Gezegen/Mars' },
      payload: { ekle_ml: 250 },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().gun).toBe(yerelGunISO(new Date(), VARSAYILAN_SAAT_DILIMI));
  });
});

describe('aynı yeni barkod eşzamanlı sorulunca', () => {
  it('ikinci istek 500 değil, kazanan kaydı döner', async () => {
    const yalin = await uygulamaOlustur({
      db: uygulama.ortam.db,
      barkodSaglayici: sahteBarkodSaglayici({
        '8690000000024': {
          name_tr: 'Eşzamanlı test ürünü',
          name_en: 'Concurrent test product',
          per_100g: { kalori: 100, protein_g: 1, yag_g: 1, karbonhidrat_g: 20, lif_g: 0 },
          portions: [],
          barcode: '8690000000024',
          brand: 'Test',
          source: 'openfoodfacts',
        },
      }),
      yapilandirma: app.yapilandirma,
    });
    await yalin.ready();
    try {
      const istek = () =>
        yalin.inject({
          method: 'GET',
          url: '/v1/beslenme/besin/barkod/8690000000024',
          headers: yetkili(),
        });
      const cevaplar = await Promise.all([istek(), istek(), istek()]);

      expect(cevaplar.map((c) => c.statusCode)).toEqual([200, 200, 200]);
      expect(new Set(cevaplar.map((c) => c.json().id)).size).toBe(1);
    } finally {
      await yalin.close();
    }
  });
});
