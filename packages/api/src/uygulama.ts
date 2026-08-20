import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { AiIstemcisi } from '@made2fit/core';
import type { Veritabani } from './db/baglanti';
import type { Yapilandirma } from './yapilandirma';
import { loglayanPostaci, type Postaci } from './servisler/postaci';
import { HataliIstek, UygulamaHatasi } from './hatalar';
import { kimlikRotalari } from './rotalar/kimlik';
import { hesapRotalari } from './rotalar/hesap';
import { degerlendirmeRotalari } from './rotalar/degerlendirme';
import { programRotalari } from './rotalar/program';
import { vucutRotalari } from './rotalar/vucut';
import { beslenmeRotalari } from './rotalar/beslenme';
import { abonelikRotalari } from './rotalar/abonelik';
import { hareketRotalari } from './rotalar/hareket';
import { tanimaRotalari } from './rotalar/tanima';
import { kocRotalari } from './rotalar/koc';
import { ogunRotalari } from './rotalar/ogun';
import { analitikRotalari } from './rotalar/analitik';
import { ilgiRotalari } from './rotalar/ilgi';
import { offSaglayici, type BarkodSaglayici } from './servisler/barkod';

export interface UygulamaSecenekleri {
  db: Veritabani;
  yapilandirma: Yapilandirma;
  aiIstemcisi?: AiIstemcisi;
  /** Verilmezse kodlar loglanır; kullanıcıya "gönderdik" denmez. */
  postaci?: Postaci;
  /** Verilmezse Open Food Facts'e canlı sorulur. */
  barkodSaglayici?: BarkodSaglayici;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Veritabani;
    yapilandirma: Yapilandirma;
    aiIstemcisi?: AiIstemcisi;
    postaci: Postaci;
    barkodSaglayici: BarkodSaglayici;
    kimlikDogrula: (istek: import('fastify').FastifyRequest) => Promise<void>;
  }

  interface FastifyRequest {
    kullaniciId: string;
  }
}

export async function uygulamaOlustur(secenekler: UygulamaSecenekleri): Promise<FastifyInstance> {
  const { db, yapilandirma } = secenekler;

  const app = Fastify({
    logger: {
      level: yapilandirma.LOG_SEVIYESI,
      redact: {
        /**
         * Log'a asla parola, token, sağlık cevabı, fotoğraf veya koç mesajı düşmemeli.
         *
         * Veriyi veritabanında saklamamak, log dosyasında saklamakla anlamsızlaşır.
         * Koç mesajı özellikle önemli: kullanıcı oraya sağlık şikâyetini yazıyor ve bu
         * KVKK'ya göre özel nitelikli kişisel veri.
         */
        paths: [
          'req.headers.authorization',
          'req.body.parola',
          'req.body.yeni_parola',
          'req.body.yenileme_token',
          'req.body.cevaplar',
          'req.body.fotograflar',
          'req.body.fotograf',
          'req.body.kod',
          'req.body.mesaj',
        ],
        remove: true,
      },
    },
    // Vücut fotoğrafı üç poz olarak gelebilir; sınır yine de dar tutulur.
    bodyLimit: 12 * 1024 * 1024,
    disableRequestLogging: yapilandirma.NODE_ENV === 'test',
  });

  app.decorate('db', db);
  app.decorate('yapilandirma', yapilandirma);
  if (secenekler.aiIstemcisi) app.decorate('aiIstemcisi', secenekler.aiIstemcisi);
  app.decorate('postaci', secenekler.postaci ?? loglayanPostaci((mesaj) => app.log.warn(mesaj)));
  app.decorate('barkodSaglayici', secenekler.barkodSaglayici ?? offSaglayici());

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: yapilandirma.CORS_KAYNAKLAR === '*' ? true : yapilandirma.CORS_KAYNAKLAR.split(','),
    credentials: true,
  });
  await app.register(rateLimit, {
    max: yapilandirma.NODE_ENV === 'test' ? 10_000 : 120,
    timeWindow: '1 minute',
  });
  await app.register(jwt, {
    secret: yapilandirma.JWT_SECRET,
    sign: { expiresIn: yapilandirma.ERISIM_TOKEN_OMRU },
  });

  app.decorate('kimlikDogrula', async (istek) => {
    try {
      const yuk = await istek.jwtVerify<{ sub: string }>();
      istek.kullaniciId = yuk.sub;
    } catch {
      throw new UygulamaHatasi(401, 'yetkisiz', 'Oturumun sona ermiş. Tekrar giriş yap.');
    }
  });

  app.setErrorHandler((hata: unknown, istek, cevap) => {
    if (hata instanceof UygulamaHatasi) {
      // `degerler` istemcinin cümleyi kendi dilinde kurmasını sağlar; mesaj yedek kalır.
      return cevap.status(hata.durum).send({
        kod: hata.kod,
        mesaj: hata.mesaj,
        ...(hata.degerler ? { degerler: hata.degerler } : {}),
      });
    }
    if (hata instanceof ZodError) {
      const ilk = hata.issues[0];
      return cevap.status(400).send({
        kod: 'gecersiz_istek',
        mesaj: ilk ? `${ilk.path.join('.')}: ${ilk.message}` : 'İstek geçersiz.',
      });
    }
    if (
      typeof hata === 'object' &&
      hata !== null &&
      'statusCode' in hata &&
      hata.statusCode === 429
    ) {
      return cevap.status(429).send({
        kod: 'cok_fazla_istek',
        mesaj: 'Çok hızlı gidiyorsun. Bir dakika sonra tekrar dene.',
      });
    }

    istek.log.error({ hata }, 'beklenmeyen hata');
    return cevap.status(500).send({
      kod: 'sunucu_hatasi',
      mesaj: 'Bir şeyler ters gitti. Tekrar deneyebilirsin.',
    });
  });

  app.setNotFoundHandler((_istek, cevap) =>
    cevap.status(404).send({ kod: 'bulunamadi', mesaj: 'Böyle bir uç yok.' }),
  );

  app.get('/saglik', async () => ({ durum: 'iyi', surum: 1 }));

  await app.register(ilgiRotalari, { prefix: '/v1/ilgi' });
  await app.register(kimlikRotalari, { prefix: '/v1/kimlik' });
  await app.register(hesapRotalari, { prefix: '/v1/hesap' });
  await app.register(degerlendirmeRotalari, { prefix: '/v1/degerlendirme' });
  await app.register(programRotalari, { prefix: '/v1/program' });
  await app.register(vucutRotalari, { prefix: '/v1/vucut' });
  await app.register(beslenmeRotalari, { prefix: '/v1/beslenme' });
  await app.register(abonelikRotalari, { prefix: '/v1/abonelik' });
  await app.register(hareketRotalari, { prefix: '/v1/hareket' });
  await app.register(tanimaRotalari, { prefix: '/v1/beslenme' });
  await app.register(kocRotalari, { prefix: '/v1/koc' });
  await app.register(ogunRotalari, { prefix: '/v1/ogun' });
  await app.register(analitikRotalari, { prefix: '/v1/analitik' });

  return app;
}

export { HataliIstek };
