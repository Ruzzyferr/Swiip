/**
 * Denetim sunucusu — testlerdeki GERÇEK uygulamayı HTTP'de dinletir.
 *
 * Amaç: arayüzü ve uçtan uca akışı gerçek bir istemciyle (tarayıcı, curl) denemek.
 * Veritabanı PGlite, göçler ve tohum gerçek; hiçbir sahte katman yok ve üretim
 * verisine dokunulmuyor. Süreç kapanınca her şey kayboluyor.
 */
import { uygulamaOlustur } from '../uygulama';
import { testVeritabaniAc } from './veritabani';
import { testPostacisi } from '../servisler/postaci';
import { sahteBarkodSaglayici } from '../servisler/barkod';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';

const PORT = Number(process.env.DENETIM_PORT ?? 3311);

const ortam = await testVeritabaniAc();
await besinleriTohumla(ortam.db);
await tarifleriTohumla(ortam.db);

const postaci = testPostacisi();

const app = await uygulamaOlustur({
  db: ortam.db,
  postaci,
  barkodSaglayici: sahteBarkodSaglayici({
    '8690000000017': {
      name_tr: 'Test yulaf ezmesi',
      name_en: 'Test rolled oats',
      per_100g: { kalori: 379, protein_g: 13.2, yag_g: 6.5, karbonhidrat_g: 67.7, lif_g: 10.1 },
      portions: [{ id: 'porsiyon', ad: '40 g', gram: 40 }],
      barcode: '8690000000017',
      brand: 'Test',
      source: 'openfoodfacts',
    },
  }),
  yapilandirma: {
    NODE_ENV: 'development',
    PORT,
    HOST: '127.0.0.1',
    DATABASE_URL: 'pglite://bellek',
    JWT_SECRET: 'denetim-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
    ERISIM_TOKEN_OMRU: '15m',
    YENILEME_TOKEN_GUN: 30,
    KIMLIK_ISTEK_SINIRI: 100_000,
    POSTA_GONDEREN: 'Swiip <denetim@swiip.app>',
    LOG_SEVIYESI: 'warn',
    CORS_KAYNAKLAR: '*',
  },
});

// Parola sıfırlama kodunu okuyabilmek için: gönderilen postayı diske değil belleğe yazar.
app.get('/denetim/kutu', async () => postaci.kutu);

await app.listen({ port: PORT, host: '127.0.0.1' });
console.log(`denetim sunucusu hazır: http://127.0.0.1:${PORT}`);
