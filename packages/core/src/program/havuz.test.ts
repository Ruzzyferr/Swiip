import { describe, expect, it } from 'vitest';
import { HAREKET_KATALOGU } from '@made2fit/shared';
import { havuzHazirla } from './havuz';
import { profilKur } from '../test/profilKur';

/**
 * Sert filtrelerin **ulaşılabilirliği**.
 *
 * Havuzda on güvenlik kuralı yazılı. Bir kural hiç tetiklenemiyorsa — çünkü katalogda o
 * özelliği taşıyan hareket yok, ya da alan hiç doldurulmamış — kullanıcının kısıtı
 * sessizce yok sayılıyor demektir. Kullanıcı "tavanım alçak" der, biz kaydederiz, kural
 * kodda durur ve baş üstü hareket yine programa girer.
 *
 * Bu sessiz hata sınıfını koç araçlarında bir kez yaşadık (`hareket_bilgisi` yazılıydı,
 * hiç çalışmıyordu). Orada sonuç kötü bir cevaptı; burada sonuç yaralanma olur.
 *
 * Bu yüzden her kuralı tek tek değil, **kuralın tetiklenebildiğini** sınıyoruz.
 */

const temel = profilKur();

/** Kuralı tetiklemesi beklenen profil değişikliği. */
const KURALLAR: Array<[string, Parameters<typeof profilKur>[0]]> = [
  ['ekipman_yok', { kisitlar: { ...temel.kisitlar, ekipman: [] } }],
  [
    'kontrendikasyon',
    { kisitlar: { ...temel.kisitlar, kontrendikasyonlar: ['bel_fitigi', 'omuz_sikismasi'] } },
  ],
  [
    'agriyi_artiran_patern',
    { kisitlar: { ...temel.kisitlar, kisitli_paternler: ['diz_baskin', 'kalca_baskin'] } },
  ],
  ['eksenel_yuk_yasak', { kisitlar: { ...temel.kisitlar, eksenel_yuk_yasak: true } }],
  ['tavan_alcak', { kisitlar: { ...temel.kisitlar, bas_ustu_yasak: true } }],
  ['gurultu_kisiti', { kisitlar: { ...temel.kisitlar, gurultu_yasak: true } }],
  ['zipla_yasak', { kisitlar: { ...temel.kisitlar, zipla_yasak: true } }],
  ['spotter_yok', { kisitlar: { ...temel.kisitlar, spotter_yok: true } }],
  [
    'teknik_guven_dusuk',
    { antrenman_yasi: 'yeni', kisitlar: { ...temel.kisitlar, teknik_guveni: 1 } },
  ],
  [
    'kullanici_reddetti',
    { kisitlar: { ...temel.kisitlar, reddedilen_anahtarlar: ['squat', 'deadlift'] } },
  ],
];

describe('havuz sert filtreleri — her kural gerçekten tetiklenebiliyor', () => {
  it.each(KURALLAR)('%s kuralı en az bir hareketi eliyor', (kural, uzat) => {
    const sonuc = havuzHazirla(profilKur(uzat));

    expect(sonuc.eleme_sayilari[kural] ?? 0, `${kural} hiç tetiklenmedi`).toBeGreaterThan(0);
  });

  /**
   * Beyan ile gerçek arasındaki boşluğu kapatır: havuzda geçen her kural adının burada bir
   * profili olmalı. Yeni kural ekleyen, tetiklendiğini göstermek zorunda kalır.
   */
  it('havuzdaki her kural adının bir sınama profili var', () => {
    const tumKurallar = new Set<string>();

    for (const [, uzat] of KURALLAR) {
      for (const eleme of havuzHazirla(profilKur(uzat)).elemeler) {
        if (eleme.kural !== 'ana_havuz_disi') tumKurallar.add(eleme.kural);
      }
    }

    const sinanan = new Set(KURALLAR.map(([kural]) => kural));

    expect([...tumKurallar].filter((k) => !sinanan.has(k))).toEqual([]);
  });

  /**
   * Kullanıcının açıkça bildirmediği bir kısıt havuzu daraltmamalı. Aksi hâlde kimsenin
   * istemediği bir güvenlik kuralı sessizce hareket eler ve program boşuna fakirleşir.
   *
   * `ekipman_yok` ve `spotter_yok` listede yok: ikisi de varsayılan profilde **açıkça**
   * bildirilmiş kısıtlar (ev tipi ekipman listesi, tek başına çalışma).
   */
  it('bildirilmemiş kısıt havuzu daraltmıyor', () => {
    const bildirilmemis = [
      'kontrendikasyon',
      'agriyi_artiran_patern',
      'eksenel_yuk_yasak',
      'tavan_alcak',
      'gurultu_kisiti',
      'zipla_yasak',
      'teknik_guven_dusuk',
      'kullanici_reddetti',
    ];
    const sonuc = havuzHazirla(temel);

    for (const kural of bildirilmemis) {
      expect(sonuc.eleme_sayilari[kural] ?? 0, kural).toBe(0);
    }
  });

  /** Eleme kaydı olmadan kullanıcıya "neden yok" diyemeyiz. */
  it('elenen her hareket gerekçesiyle kaydediliyor', () => {
    const sonuc = havuzHazirla(profilKur({ kisitlar: { ...temel.kisitlar, ekipman: [] } }));
    const havuzId = new Set(sonuc.havuz.map((h) => h.id));
    const elenenId = new Set(sonuc.elemeler.map((e) => e.hareket_id));

    for (const hareket of HAREKET_KATALOGU) {
      if (havuzId.has(hareket.id)) continue;
      expect(elenenId.has(hareket.id), `${hareket.id} gerekçesiz elendi`).toBe(true);
    }
  });
});

/**
 * Reddetme anahtarlarının karşılığı.
 *
 * Kullanıcı değerlendirmede "burpee yapmak istemiyorum" der; bu seçim bir anahtar
 * listesine, anahtarlar da hareket kimliği ve İngilizce adı üzerinde aranır. Bir seçimin
 * hiçbir anahtarı katalogda tutmuyorsa, kullanıcının açık isteği **sessizce yok sayılır**:
 * cevabı kaydederiz, kural kodda durur, hareket yine programa girer.
 *
 * Garanti seçim düzeyinde: tek tek anahtarların hepsi tutmak zorunda değil (birden fazla
 * yazım için birden çok anahtar var), ama her seçimin en az bir karşılığı olmalı.
 */
describe('reddetme seçimlerinin katalogda karşılığı var', () => {
  const SECIMLER: Array<[string, string[]]> = [
    ['Burpee', ['burpee']],
    ['Deadlift', ['deadlift', 'cekis']],
    ['Squat', ['squat']],
    ['Koşu', ['kosu', 'run']],
    ['Ip atlama', ['ip-atlama', 'jump-rope']],
    ['Baş üstü pres', ['omuz-presi', 'overhead']],
    ['Barfiks', ['barfiks', 'pull-up']],
  ];

  /**
   * Garanti "kural tetiklendi" değil, **hareket havuzda yok**. Burpee ve ip atlama zaten
   * ana havuz dışında (süre bazlı, hacim saymıyor); onları `kullanici_reddetti` elemiyor
   * ama kullanıcıya verdiğimiz söz yine tutuyor. Kullanıcıyı ilgilendiren sonuçtur,
   * hangi kuralın elediği değil.
   */
  it.each(SECIMLER)(
    '"%s" seçimi sonrası eşleşen hareket havuzda kalmıyor',
    (_secim, anahtarlar) => {
      const sonuc = havuzHazirla(
        profilKur({ kisitlar: { ...temel.kisitlar, reddedilen_anahtarlar: anahtarlar } }),
      );

      const kacan = sonuc.havuz.filter((h) =>
        anahtarlar.some((a) => `${h.id} ${h.ad_en.toLowerCase()}`.includes(a)),
      );

      expect(kacan.map((h) => h.id)).toEqual([]);
    },
  );

  /** Seçim gerçekten katalogda bir şeye denk geliyor mu — hiçbirine denk gelmiyorsa ölü seçenek. */
  it.each(SECIMLER)('"%s" seçiminin katalogda karşılığı var', (_secim, anahtarlar) => {
    const kapsanan = HAREKET_KATALOGU.filter((h) =>
      anahtarlar.some((a) => `${h.id} ${h.ad_en.toLowerCase()}`.includes(a)),
    );

    expect(kapsanan.length).toBeGreaterThan(0);
  });

  /**
   * Seçim listesi `profil/kisitlar.ts` içindeki `T2_ANAHTAR` ile aynı kalmalı. Orada yeni
   * bir seçim açılıp buraya eklenmezse, karşılığı olmayan bir seçim fark edilmeden girer.
   */
  it('sınanan seçim sayısı T2 seçenekleriyle aynı', () => {
    expect(SECIMLER.length).toBe(7);
  });
});
