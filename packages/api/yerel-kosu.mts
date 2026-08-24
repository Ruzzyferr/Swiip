/**
 * Persona kosusu icin yerel API.
 *
 * Uretimdeki `uygulamaOlustur` aynen kullaniliyor; veritabani PGlite (gercek Postgres,
 * gercek gocler) ve besin/tarif tohumlari yukleniyor. Docker gerekmiyor.
 *
 * AI istemcisi sahte: gorsel tanima ve koc icin deterministik cevap donuyor, boylece
 * persona kosusu gercek para harcamadan tam boru hattini calistiriyor.
 */
process.env.NODE_ENV = 'test';

const { testVeritabaniAc } = await import('./src/test/veritabani.ts');
const { uygulamaOlustur } = await import('./src/uygulama.ts');
const { besinleriTohumla, tarifleriTohumla } = await import('./src/db/tohum.ts');

const ortam = await testVeritabaniAc();
console.log('besin:', await besinleriTohumla(ortam.db));
console.log('tarif:', await tarifleriTohumla(ortam.db));

const sahteAi = {
  async metinUret(istek) {
    if (istek.is === 'yemek_tanima') {
      return {
        metin: JSON.stringify({
          kalemler: [
            { ad: 'tavuk göğsü', miktar: 1, birim: 'porsiyon', gram_tahmini: 150 },
            { ad: 'pirinç', miktar: 1, birim: 'kepçe', gram_tahmini: 120 },
          ],
        }),
        girdi_token: 1200,
        cikti_token: 160,
        model: 'yerel-sahte',
      };
    }
    return {
      metin: 'Bunu birlikte çözelim. Programındaki yükü bu hafta bilinçli olarak sabit tuttum.',
      girdi_token: 400,
      cikti_token: 60,
      model: 'yerel-sahte',
    };
  },
};

const app = await uygulamaOlustur({
  db: ortam.db,
  aiIstemcisi: sahteAi,
  yapilandirma: {
    NODE_ENV: 'test',
    PORT: 3311,
    HOST: '127.0.0.1',
    DATABASE_URL: 'pglite://bellek',
    JWT_SECRET: 'persona-kosusu-icin-en-az-otuz-iki-karakterlik-anahtar',
    ERISIM_TOKEN_OMRU: '15m',
    YENILEME_TOKEN_GUN: 30,
    KIMLIK_ISTEK_SINIRI: 10000,
    POSTA_GONDEREN: 'Swiip <yerel@swiip.app>',
    LOG_SEVIYESI: 'warn',
    CORS_KAYNAKLAR: '*',
  },
});

await app.listen({ port: 3311, host: '127.0.0.1' });
console.log('HAZIR http://127.0.0.1:3311');
