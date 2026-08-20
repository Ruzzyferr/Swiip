import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { uygulamaOlustur } from '../uygulama';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { HAK_TABLOSU } from '../servisler/haklar';
import { tr } from '@made2fit/shared';

const SATIR_SONU = String.fromCharCode(10);

/** Uç ve ekran kaynaklarının tamamı; hak adının gerçekten okunduğunu burada arıyoruz. */
const KAYNAK_METNI = (() => {
  const parcalar: string[] = [];

  const tara = (klasor: string) => {
    for (const ad of readdirSync(klasor)) {
      const yol = join(klasor, ad);
      if (statSync(yol).isDirectory()) tara(yol);
      else if (/\.tsx?$/.test(ad) && !ad.includes('.test.') && !yol.includes('haklar.ts')) {
        parcalar.push(readFileSync(yol, 'utf8'));
      }
    }
  };

  tara(join(__dirname, '..'));
  // Ekranlar da sayılıyor: bazı haklar arayüzde uygulanıyor (görünür gün sayısı gibi).
  tara(join(__dirname, '..', '..', '..', '..', 'apps', 'mobile', 'app'));
  tara(join(__dirname, '..', '..', '..', '..', 'apps', 'mobile', 'src'));
  return parcalar.join(SATIR_SONU);
})();

/**
 * Ödeme duvarının sunucu tarafı.
 *
 * `magaza.ts` "hak istemcide açılmaz, sunucu doğrular" diyor. Bu doğru olsun diye
 * sunucunun da istemciye güvenmemesi gerekiyor: `POST /abonelik/guncelle` üretimde
 * herkese açık kalırsa, bir `curl` ile herkes Pro olur.
 *
 * Geliştirmede uç açık kalıyor — mağaza SDK'sı olmadan akışı denemenin başka yolu yok.
 * Ayrım ortam değişkeniyle değil, `NODE_ENV` ile: yanlışlıkla açık bırakılamaz.
 */

let ortam: TestOrtami;
let uretimApp: FastifyInstance;
let token: string;

const TEMEL_YAPILANDIRMA = {
  PORT: 0,
  HOST: '127.0.0.1',
  DATABASE_URL: 'pglite://bellek',
  JWT_SECRET: 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
  ERISIM_TOKEN_OMRU: '15m',
  YENILEME_TOKEN_GUN: 30,
  KIMLIK_ISTEK_SINIRI: 10_000,
  POSTA_GONDEREN: 'Made2Fit <test@made2fit.io>',
  LOG_SEVIYESI: 'fatal' as const,
  CORS_KAYNAKLAR: '*',
};

beforeAll(async () => {
  ortam = await testVeritabaniAc();

  uretimApp = await uygulamaOlustur({
    db: ortam.db,
    yapilandirma: { ...TEMEL_YAPILANDIRMA, NODE_ENV: 'production' },
  });
  await uretimApp.ready();

  const kayit = await uretimApp.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'paywall@made2fit.io', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;
}, 60_000);

afterAll(async () => {
  await uretimApp?.close();
  await ortam?.kapat();
});

const yetkili = () => ({ authorization: `Bearer ${token}` });

describe('plan yükseltme — üretimde istemciye kapalı', () => {
  it('kullanıcı kendini Pro yapamaz', async () => {
    const cevap = await uretimApp.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'pro' },
    });

    expect(cevap.statusCode).toBe(403);
  });

  it('reddedilen istekten sonra plan hâlâ ücretsiz', async () => {
    const durum = await uretimApp.inject({
      method: 'GET',
      url: '/v1/abonelik/durum',
      headers: yetkili(),
    });

    expect(durum.json().plan).toBe('ucretsiz');
  });

  it('mesaj neyin yanlış olduğunu söylüyor, sessizce yutmuyor', async () => {
    const cevap = await uretimApp.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'temel' },
    });

    expect(cevap.json().mesaj).toContain('mağaza');
  });
});

describe('kota tüketimi — istemci beyanına güvenilmez', () => {
  /**
   * "Önbellekten geldi" diyerek kotayı atlamak, ücretsiz sınırsız AI demek.
   * Bu kararı istemci veremez; gerçek tanıma ucu zaten sunucuda karar veriyor.
   */
  it('istemci kota tüketimini kendi beyanıyla yönetemez', async () => {
    const cevap = await uretimApp.inject({
      method: 'POST',
      url: '/v1/abonelik/kota-tuket',
      headers: yetkili(),
      payload: { tip: 'yemek_tanima', onbellekten: true },
    });

    expect(cevap.statusCode).toBe(404);
  });
});

/**
 * Hak tablosu ile gerçeğin uyuşması.
 *
 * `kalori_makro_hedefi` hak tablosunda ücretsize kapalı yazıyordu ve kodun **hiçbir
 * yerinde okunmuyordu**: paywall ekranı özelliği ücretli diye satarken API onu herkese
 * veriyordu. Bu sınıf hata sessizdir — kimse hata almaz, sadece para kaybedilir ve
 * kullanıcıya verdiğimiz söz tutulmaz.
 *
 * Kural: **planlar arasında farklılaşan her hak bir yerde uygulanmalı.** Her plana aynı
 * değeri veren bayraklar (manuel giriş, program düzenleme, reklamsızlık) muaf; onlar bir
 * kapı değil, yazılı bir taahhüt.
 */
/**
 * Hak yardımcıları da kullanılmalı.
 *
 * Tablo denetimi `vucut_analizi_aylik` alanını muaf tuttu: değeri her planda `1`, yani
 * "planlar arasında farklılaşmıyor". Ama farklılaşan şey sayı değil **kural**:
 * ücretsizde ömür boyu bir kez, ödemelide her ay. O kural `vucutAnaliziHakki` içinde
 * yaşıyordu ve fonksiyon hiçbir yerden çağrılmıyordu — ücretsiz kullanıcı sınırsız
 * analiz yapabiliyordu ve her fotoğraflı analiz bir görsel AI çağrısı.
 *
 * Alanları denetlemek yetmiyor; kuralı taşıyan fonksiyonu da denetlemek gerekiyor.
 */
describe('hak yardımcıları gerçekten çağrılıyor', () => {
  const HAKLAR_KAYNAGI = readFileSync(
    join(import.meta.dirname, '..', 'servisler', 'haklar.ts'),
    'utf8',
  );

  /** `haklar.ts` içinden dışa açılan fonksiyonlar. */
  const YARDIMCILAR = [...HAKLAR_KAYNAGI.matchAll(/export function (\w+)/g)].map((e) => e[1]!);

  it('dışa açılan yardımcı var — test boşa dönmüyor', () => {
    expect(YARDIMCILAR.length).toBeGreaterThan(1);
  });

  it.each(YARDIMCILAR)('%s bir uçtan çağrılıyor', (ad) => {
    expect(
      KAYNAK_METNI.includes(`${ad}(`),
      `${ad} tanımlı ama hiçbir uçtan çağrılmıyor: taşıdığı kural uygulanmıyor demektir.`,
    ).toBe(true);
  });
});

describe('hak tablosu gerçekten uygulanıyor', () => {
  /** Her planda aynı olan, dolayısıyla kapı olmayan alanlar. */
  const TAAHHUTLER = new Set(['ad', 'aylik_fiyat_try', 'yillik_fiyat_try', 'degerlendirme']);

  it('planlar arasında farklılaşan her hak bir kapıya bağlı', () => {
    const alanlar = Object.keys(HAK_TABLOSU.ucretsiz) as Array<
      keyof (typeof HAK_TABLOSU)['ucretsiz']
    >;

    const farklilasan = alanlar.filter((alan) => {
      if (TAAHHUTLER.has(alan)) return false;
      const degerler = new Set(Object.values(HAK_TABLOSU).map((h) => JSON.stringify(h[alan])));
      return degerler.size > 1;
    });

    // Her farklılaşan hakkın uygulandığı yer; kaynak kodunda gerçekten aranıyor.
    const kaynak = KAYNAK_METNI;
    const uygulanmayan = farklilasan.filter((alan) => !kaynak.includes(String(alan)));

    expect(uygulanmayan).toEqual([]);
  });

  /** Değişmeyen alanlar da kayıt altında: sessizce farklılaşırlarsa test kırılır. */
  it('taahhüt alanları her planda aynı kalıyor', () => {
    for (const alan of ['manuel_kalori', 'program_duzenleme', 'reklam'] as const) {
      const degerler = new Set(Object.values(HAK_TABLOSU).map((h) => JSON.stringify(h[alan])));

      expect(degerler.size, alan).toBe(1);
    }
  });
});

/**
 * Hata kodları ile sözlüğün eşleşmesi.
 *
 * İstemci hata metnini **koddan** kuruyor; kodu çözemezse sunucunun Türkçe mesajına
 * düşüyor. Bu yedek iyi bir şey ama sessiz: yeni bir kod eklenip sözlüğe yazılmazsa
 * İngilizce kullanıcı Türkçe hata görür ve kimse fark etmez.
 *
 * Bu yüzden kaynak kodda geçen her hata kodunu sözlükle karşılaştırıyoruz.
 */
describe('hata kodları sözlükle eşleşiyor', () => {
  /**
   * Sözlükte karşılığı bilerek olmayan kodlar.
   *
   * `gecersiz_istek` ve `gecersiz_cevap` mesajı doğrulama katmanından geliyor ve alan
   * adını taşıyor; sabit bir cümleye indirmek bilgiyi düşürürdü. `kapi_*` mesajları sağlık
   * kapılarının kendi metinleri ve çekirdekte duruyor.
   */
  const YEDEGE_BIRAKILANLAR = new Set([
    'gecersiz_istek',
    'gecersiz_cevap',
    'zayif_parola',
    'kapi_yas',
    'kapi_engeli',
    'yonetim_yetkisiz',
    'cakisma',
    'yasak',
    'kota_doldu',
    'plan_yetersiz',
    'ai_kapali',
    'foto_boyutu',
  ]);

  it('kullanılan her hata kodunun sözlükte karşılığı var', () => {
    const kodlar = new Set<string>();

    for (const eslesme of KAYNAK_METNI.matchAll(/'([a-z][a-z0-9_]{3,})'\s*[,)]/g)) {
      const aday = eslesme[1]!;
      // Yalnızca hata yardımcılarına verilen kodlar; başka dizeleri elemek için bağlam şart.
      if (
        new RegExp(
          `(HataliIstek|Yasak|Bulunamadi|Cakisma|KotaDoldu|PlanYetersiz|Yetkisiz)\\([^)]*'${aday}'`,
          's',
        ).test(KAYNAK_METNI)
      ) {
        kodlar.add(aday);
      }
    }

    expect(kodlar.size).toBeGreaterThan(10);

    const sozlukte = new Set(Object.keys(tr.apiHatalari));
    const eksik = [...kodlar].filter((k) => !sozlukte.has(k) && !YEDEGE_BIRAKILANLAR.has(k));

    expect(eksik).toEqual([]);
  });
});

/**
 * Plan adı cevapta gitmiyor (F10.1).
 *
 * `HAK_TABLOSU.ad` Türkçe bir görünen ad ("Ücretsiz") ve API cevabında doğrudan
 * gidiyordu; ayarlar ekranı onu basıyordu. İngilizce kullanıcı "Ücretsiz" okuyordu.
 *
 * Dil süpürmesi kaçırdı çünkü alan adı `ad` ve süpürme `ad` alanlarını veri sayıp muaf
 * tutuyor — hareket adı ve besin adı gerçekten Türkçe veri. Muafiyet doğruydu; sorun,
 * arayüz metninin veri alanı adıyla gönderilmesiydi.
 *
 * Çözüm çevirmek değil göndermemek: kod zaten cevapta, ismi istemci sözlükten kuruyor.
 */
describe('plan adı sunucudan gönderilmiyor', () => {
  it('durum cevabında görünen ad yok', async () => {
    const cevap = await uretimApp.inject({
      method: 'GET',
      url: '/v1/abonelik/durum',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.json().plan).toBeTruthy();
    expect(cevap.json().haklar.ad).toBeUndefined();
  });

  it('plan listesinde görünen ad yok', async () => {
    const cevap = await uretimApp.inject({ method: 'GET', url: '/v1/abonelik/planlar' });
    const planlar: Array<Record<string, unknown>> = cevap.json().planlar;

    expect(planlar.length).toBeGreaterThan(0);
    for (const plan of planlar) {
      expect(plan.kod, 'plan kodu olmadan istemci ismi kuramaz').toBeTruthy();
      expect(plan.ad, `${String(plan.kod)} için görünen ad gönderiliyor`).toBeUndefined();
    }
  });
});
