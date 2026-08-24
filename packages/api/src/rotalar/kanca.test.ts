import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { uygulamaOlustur } from '../uygulama';
import { sandboxYokSayilsinMi } from './abonelik';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';

/**
 * RevenueCat web kancası (F6.1).
 *
 * Üretimde hakkı açan tek yol burası. İki şeyi birden yapması gerekiyor:
 *  - Sahte isteği reddetmek. Doğrulanmamış bir kanca, ödeme duvarını açık bırakır.
 *  - Gerçek olayı kaçırmamak. Kullanıcı parasını ödedi; hakkı açılmazsa destek yükü
 *    ve haklı bir öfke doğar.
 *
 * Sır karşılaştırması sabit zamanlı: kısa devre karşılaştırma, sırrı harf harf tahmin
 * etmeye açık kapı bırakır.
 */

let ortam: TestOrtami;
let app: FastifyInstance;
let kullaniciId: string;

const SIR = 'kanca-sirri-en-az-otuz-iki-karakter-uzunlugunda';

beforeAll(async () => {
  ortam = await testVeritabaniAc();

  app = await uygulamaOlustur({
    db: ortam.db,
    yapilandirma: {
      NODE_ENV: 'production',
      PORT: 0,
      HOST: '127.0.0.1',
      DATABASE_URL: 'pglite://bellek',
      JWT_SECRET: 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
      ERISIM_TOKEN_OMRU: '15m',
      YENILEME_TOKEN_GUN: 30,
      KIMLIK_ISTEK_SINIRI: 10_000,
      POSTA_GONDEREN: 'Swiip <test@swiip.app>',
      REVENUECAT_KANCA_SIRRI: SIR,
      LOG_SEVIYESI: 'fatal',
      CORS_KAYNAKLAR: '*',
    },
  });
  await app.ready();

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'kanca@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  kullaniciId = kayit.json().kullanici.id;
}, 60_000);

afterAll(async () => {
  await app?.close();
  await ortam?.kapat();
});

function olay(govde: Record<string, unknown>, sir: string | null = SIR) {
  return app.inject({
    method: 'POST',
    url: '/v1/abonelik/kanca',
    headers: sir ? { authorization: `Bearer ${sir}` } : {},
    payload: { event: govde },
  });
}

async function planOku(): Promise<string> {
  const giris = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/giris',
    payload: { email: 'kanca@swiip.app', parola: 'Kirmizi-Bisiklet-42' },
  });
  const durum = await app.inject({
    method: 'GET',
    url: '/v1/abonelik/durum',
    headers: { authorization: `Bearer ${giris.json().erisim_token}` },
  });
  return durum.json().plan;
}

describe('kanca doğrulaması', () => {
  it('sırsız istek reddedilir', async () => {
    const cevap = await olay(
      { type: 'INITIAL_PURCHASE', app_user_id: kullaniciId, product_id: 'swiip_pro_aylik' },
      null,
    );

    expect(cevap.statusCode).toBe(401);
  });

  it('yanlış sırla gelen istek reddedilir', async () => {
    const cevap = await olay(
      { type: 'INITIAL_PURCHASE', app_user_id: kullaniciId, product_id: 'swiip_pro_aylik' },
      'yanlis-sir',
    );

    expect(cevap.statusCode).toBe(401);
  });

  it('reddedilen kanca planı değiştirmez', async () => {
    expect(await planOku()).toBe('ucretsiz');
  });
});

describe('satın alma olayları', () => {
  it('ilk satın alma planı açar', async () => {
    const cevap = await olay({
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      expiration_at_ms: Date.parse('2026-12-31T00:00:00.000Z'),
    });

    expect(cevap.statusCode).toBe(200);
    expect(await planOku()).toBe('pro');
  });

  it('yenileme planı korur', async () => {
    await olay({
      type: 'RENEWAL',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
    });

    expect(await planOku()).toBe('pro');
  });

  it('plan değişikliği yeni plana geçirir', async () => {
    await olay({
      type: 'PRODUCT_CHANGE',
      app_user_id: kullaniciId,
      product_id: 'swiip_temel_yillik',
    });

    expect(await planOku()).toBe('temel');
  });

  it('iptal dönem sonuna kadar hakkı korur', async () => {
    await olay({ type: 'CANCELLATION', app_user_id: kullaniciId });

    // İptal, hakkın hemen kapanması demek değil: kullanıcı dönemin parasını ödedi.
    expect(await planOku()).toBe('temel');
  });

  it('süre dolunca ücretsiz plana döner', async () => {
    await olay({ type: 'EXPIRATION', app_user_id: kullaniciId });

    expect(await planOku()).toBe('ucretsiz');
  });
});

describe('bozuk ve bilinmeyen olaylar', () => {
  it('tanınmayan ürün kimliği planı değiştirmez', async () => {
    const cevap = await olay({
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'baska_uygulamanin_urunu',
    });

    expect(cevap.statusCode).toBe(200);
    expect(await planOku()).toBe('ucretsiz');
  });

  it('bilinmeyen kullanıcı sessizce yutulur, 500 atılmaz', async () => {
    const cevap = await olay({
      type: 'INITIAL_PURCHASE',
      app_user_id: '00000000-0000-0000-0000-000000000000',
      product_id: 'swiip_pro_aylik',
    });

    expect(cevap.statusCode).toBe(200);
  });

  it('bilinmeyen olay tipi kabul edilir ama bir şey yapmaz', async () => {
    const cevap = await olay({ type: 'TEST', app_user_id: kullaniciId });

    expect(cevap.statusCode).toBe(200);
    expect(await planOku()).toBe('ucretsiz');
  });

  /**
   * Artık 400 değil 200.
   *
   * 400 dönmek RevenueCat için "teslim edilemedi" demek: olayı saatlerce yeniden
   * deniyor, sonra bırakıyor. Bizim çözemediğimiz bir gövde onların kuyruğunu
   * tıkamamalı — ama sessizce de kaybolmamalı, o yüzden log'a düşüyor ve cevapta
   * neden işlenmediği yazıyor.
   */
  it('gövdesi çözümlenemeyen istek 200 döner ama hiçbir şey yapmaz', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/abonelik/kanca',
      headers: { authorization: `Bearer ${SIR}` },
      payload: { yanlis: 'sekil' },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().islenmedi).toBe('govde_cozumlenemedi');
    expect(await planOku()).toBe('ucretsiz');
  });
});

/**
 * Bu blok, kancanın "sırrı doğrulanıyor ama gerisi savunmasız" hâlini kapatıyor.
 * Hepsi gerçek RevenueCat olay biçimleri.
 */
describe('kanca dayanıklılığı', () => {
  /**
   * Monoton test saati.
   *
   * Testler tek kullanıcıyı paylaşıyor ve `planYaz` artık daha eski damgalı olayı
   * yok sayıyor. `Date.now()` kullanmak, önceki testin ileri attığı damganın
   * arkasında kalıp sıradaki testin ilk olayını sessizce düşürüyordu.
   */
  let saat = Date.now();
  const t = () => (saat += 60_000);

  it('aynı olay iki kez gelirse ikincisi işlenmez', async () => {
    await olay({
      id: 'evt-tekrar-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });
    expect(await planOku()).toBe('pro');

    // Arada süresi dolmuş sayılsın.
    await olay({
      id: 'evt-tekrar-2',
      type: 'EXPIRATION',
      app_user_id: kullaniciId,
      event_timestamp_ms: t(),
    });
    expect(await planOku()).toBe('ucretsiz');

    // İlk olay yeniden teslim edilirse Pro GERİ GELMEMELİ.
    const tekrar = await olay({
      id: 'evt-tekrar-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });

    expect(tekrar.json().islenmedi).toBe('tekrar');
    expect(await planOku()).toBe('ucretsiz');
  });

  it('daha eski damgalı olay yenisinin üstüne yazmaz', async () => {
    const simdi = t();

    await olay({
      id: 'evt-sira-yeni',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: simdi,
    });
    expect(await planOku()).toBe('pro');

    // Bir saat önceye ait, gecikmiş bir EXPIRATION.
    await olay({
      id: 'evt-sira-eski',
      type: 'EXPIRATION',
      app_user_id: kullaniciId,
      event_timestamp_ms: simdi - 3_600_000,
    });

    expect(await planOku(), 'gecikmiş eski olay planı düşürmemeli').toBe('pro');
  });

  it('PRODUCT_CHANGE yeni ürüne geçirir', async () => {
    await olay({
      id: 'evt-pd-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });
    expect(await planOku()).toBe('pro');

    // Gerçek biçim: `product_id` ESKİ ürün, `new_product_id` yenisi.
    await olay({
      id: 'evt-pd-2',
      type: 'PRODUCT_CHANGE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      new_product_id: 'swiip_temel_aylik',
      event_timestamp_ms: t(),
    });

    expect(await planOku(), 'Pro→Temel düşüşü uygulanmalı').toBe('temel');
  });

  it('iade hakkı hemen kapatır, sıradan iptal kapatmaz', async () => {
    await olay({
      id: 'evt-iade-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });

    await olay({
      id: 'evt-iade-2',
      type: 'CANCELLATION',
      cancel_reason: 'UNSUBSCRIBE',
      app_user_id: kullaniciId,
      event_timestamp_ms: t(),
    });
    expect(await planOku(), 'sıradan iptalde dönem sonuna kadar açık kalır').toBe('pro');

    await olay({
      id: 'evt-iade-3',
      type: 'CANCELLATION',
      cancel_reason: 'CUSTOMER_SUPPORT',
      app_user_id: kullaniciId,
      event_timestamp_ms: t(),
    });
    expect(await planOku(), 'iade hakkı hemen kapatmalı').toBe('ucretsiz');
  });

  it('ödeme sorunu hakkı hemen almaz', async () => {
    await olay({
      id: 'evt-odeme-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });

    await olay({
      id: 'evt-odeme-2',
      type: 'BILLING_ISSUE',
      app_user_id: kullaniciId,
      event_timestamp_ms: t(),
    });

    expect(await planOku(), 'grace period süren müşteri Pro kalmalı').toBe('pro');
  });

  it('duraklatılan abonelik Pro kalmaz', async () => {
    await olay({
      id: 'evt-durdur-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });

    await olay({
      id: 'evt-durdur-2',
      type: 'SUBSCRIPTION_PAUSED',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });

    expect(await planOku()).toBe('ucretsiz');
  });

  it('TRANSFER eski hesabın hakkını kapatır', async () => {
    await olay({
      id: 'evt-tasi-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: kullaniciId,
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });
    expect(await planOku()).toBe('pro');

    // TRANSFER `app_user_id` göndermez; şema onu zorunlu tuttuğu için bu olay
    // eskiden 400 alıyor ve hiç işlenmiyordu — iki hesap tek abonelikle Pro kalıyordu.
    const cevap = await olay({
      id: 'evt-tasi-2',
      type: 'TRANSFER',
      transferred_from: [kullaniciId],
      transferred_to: ['baska-hesap'],
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: t(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(await planOku(), 'devreden hesap Pro kalmamalı').toBe('ucretsiz');
  });
});

/**
 * Sandbox ayrımı ve UUID olmayan kimlik.
 *
 * İkisi de kancanın "sır doğrulanıyor, gerisi güvende" varsayımındaki delikti.
 */
describe('kanca ortam ve kimlik ayrımı', () => {
  it('üretimde sandbox olayı hak açmaz', () => {
    expect(sandboxYokSayilsinMi('production', 'SANDBOX')).toBe(true);
    expect(sandboxYokSayilsinMi('production', 'sandbox')).toBe(true);
    expect(sandboxYokSayilsinMi('production', 'PRODUCTION')).toBe(false);
  });

  it('üretim dışında sandbox olayı normal işlenir — test ortamı çalışmaya devam etsin', () => {
    expect(sandboxYokSayilsinMi('test', 'SANDBOX')).toBe(false);
    expect(sandboxYokSayilsinMi('development', 'SANDBOX')).toBe(false);
  });

  it('ortam alanı yoksa olay işlenir — eski gövdeler kırılmasın', () => {
    expect(sandboxYokSayilsinMi('production', undefined)).toBe(false);
  });

  it('anonim RevenueCat kimliği 500 üretmez', async () => {
    const cevap = await olay({
      id: 'evt-anonim-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: '$RCAnonymousID:9f2c1b7a4e5d4f0',
      product_id: 'swiip_pro_aylik',
      event_timestamp_ms: Date.now() + 9_000_000,
    });

    // 500 dönseydi RevenueCat olayı sonsuza kadar yeniden denerdi.
    expect(cevap.statusCode).toBe(200);
  });
});
