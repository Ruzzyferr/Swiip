import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { uygulamaOlustur } from '../uygulama';
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

  it('gövdesi bozuk istek 400 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/abonelik/kanca',
      headers: { authorization: `Bearer ${SIR}` },
      payload: { yanlis: 'sekil' },
    });

    expect(cevap.statusCode).toBe(400);
  });
});
