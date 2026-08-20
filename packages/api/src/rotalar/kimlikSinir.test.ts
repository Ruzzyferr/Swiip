import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { uygulamaOlustur } from '../uygulama';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';

/**
 * Kimlik uçlarında kaba kuvvet sınırı.
 *
 * Genel sınır dakikada 120 istek: normal kullanım için doğru, parola denemesi için değil.
 * Dakikada 120 deneme günde 170 binden fazla eder ve bu, zayıf bir parolayı bulmaya yeter.
 *
 * Bu yüzden kimlik uçlarının ayrı ve sıkı bir sınırı var. Sınır **başarısız denemeye**
 * değil her denemeye uygulanıyor: başarılı girişleri saymamak, saldırgana ücretsiz
 * deneme hakkı vermek olurdu.
 *
 * Sınır yapılandırılabilir; burada üçe indirilip gerçekten kapandığı sınanıyor.
 */

let ortam: TestOrtami;
let app: FastifyInstance;

beforeAll(async () => {
  ortam = await testVeritabaniAc();

  app = await uygulamaOlustur({
    db: ortam.db,
    yapilandirma: {
      NODE_ENV: 'test',
      PORT: 0,
      HOST: '127.0.0.1',
      DATABASE_URL: 'pglite://bellek',
      JWT_SECRET: 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
      ERISIM_TOKEN_OMRU: '15m',
      YENILEME_TOKEN_GUN: 30,
      POSTA_GONDEREN: 'Made2Fit <test@made2fit.io>',
      KIMLIK_ISTEK_SINIRI: 3,
      LOG_SEVIYESI: 'fatal',
      CORS_KAYNAKLAR: '*',
    },
  });
  await app.ready();
}, 60_000);

afterAll(async () => {
  await app?.close();
  await ortam?.kapat();
});

async function girisDene(parola: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/kimlik/giris',
    payload: { email: 'sinir@made2fit.io', parola },
  });
}

describe('kimlik uçlarında istek sınırı', () => {
  it('sınırı aşan parola denemesi 429 ile kesilir', async () => {
    const durumlar: number[] = [];
    for (let i = 0; i < 5; i++) {
      durumlar.push((await girisDene(`YanlisParola-${i}`)).statusCode);
    }

    expect(durumlar).toContain(429);
  });

  it('sınır aşıldığında parola sıfırlama da kapanır — aynı havuz', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: 'sinir@made2fit.io' },
    });

    expect(cevap.statusCode).toBe(429);
  });

  it('kimlik dışındaki uçlar bu sınırdan etkilenmez', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/saglik' });

    expect(cevap.statusCode).toBe(200);
  });
});
