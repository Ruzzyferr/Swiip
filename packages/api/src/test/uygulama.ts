import type { FastifyInstance } from 'fastify';
import { uygulamaOlustur } from '../uygulama';
import { testPostacisi, type Posta } from '../servisler/postaci';
import { sahteBarkodSaglayici } from '../servisler/barkod';
import { testVeritabaniAc, type TestOrtami } from './veritabani';

/** Testler için gerçek uygulama + PGlite veritabanı. Sahte katman yok. */

export interface TestUygulama {
  app: FastifyInstance;
  ortam: TestOrtami;
  /** Gönderilen e-postalar; parola sıfırlama kodu buradan okunur. */
  kutu: Posta[];
  /** Sahte barkod kaynağı; testler ağa çıkmaz. */
  barkodSaglayici: ReturnType<typeof sahteBarkodSaglayici>;
  kapat: () => Promise<void>;
}

export async function testUygulamasi(): Promise<TestUygulama> {
  const ortam = await testVeritabaniAc();

  const postaci = testPostacisi();

  // Tek bir bilinen ürün yeterli: aranan şey akış, katalog değil.
  const barkodSaglayici = sahteBarkodSaglayici({
    '8690000000017': {
      name_tr: 'Test yulaf ezmesi',
      name_en: 'Test rolled oats',
      per_100g: { kalori: 379, protein_g: 13.2, yag_g: 6.5, karbonhidrat_g: 67.7, lif_g: 10.1 },
      portions: [{ id: 'porsiyon', ad: '40 g', gram: 40 }],
      barcode: '8690000000017',
      brand: 'Test',
      source: 'openfoodfacts',
    },
  });

  const app = await uygulamaOlustur({
    db: ortam.db,
    postaci,
    barkodSaglayici,
    yapilandirma: {
      NODE_ENV: 'test',
      PORT: 0,
      HOST: '127.0.0.1',
      DATABASE_URL: 'pglite://bellek',
      JWT_SECRET: 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
      ERISIM_TOKEN_OMRU: '15m',
      YENILEME_TOKEN_GUN: 30,
      KIMLIK_ISTEK_SINIRI: 10_000,
      POSTA_GONDEREN: 'Made2Fit <test@made2fit.io>',
      LOG_SEVIYESI: 'fatal',
      CORS_KAYNAKLAR: '*',
    },
  });

  await app.ready();

  return {
    app,
    ortam,
    kutu: postaci.kutu,
    barkodSaglayici,
    kapat: async () => {
      await app.close();
      await ortam.kapat();
    },
  };
}
