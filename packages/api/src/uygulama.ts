import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { AiIstemcisi } from '@swiip/core';
import type { Veritabani } from './db/baglanti';
import { users } from './db/sema';
import type { Yapilandirma } from './yapilandirma';
import { loglayanPostaci, type Postaci } from './servisler/postaci';
import { HataliIstek, UygulamaHatasi } from './hatalar';
import { istekAnahtari } from './istekSiniri';
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

/**
 * Istek sinirinin anahtari icin kimlik cozumu.
 *
 * Dogrulama basarisizsa (token yok, suresi gecmis, imza tutmuyor) kimlik yok sayilir ve
 * IP kovasina dusulur. Uydurma token kendine kova acamaz.
 */
function kimlikCoz(
  app: FastifyInstance,
  istek: { headers: { authorization?: string } },
): { kullaniciId: string } | undefined {
  const baslik = istek.headers.authorization;
  if (!baslik?.startsWith('Bearer ')) return undefined;

  try {
    const yuk = app.jwt.verify<{ sub?: string }>(baslik.slice(7));
    return yuk.sub ? { kullaniciId: yuk.sub } : undefined;
  } catch {
    return undefined;
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
  await app.register(jwt, {
    secret: yapilandirma.JWT_SECRET,
    sign: { expiresIn: yapilandirma.ERISIM_TOKEN_OMRU },
  });

  /**
   * Kova anahtari kullanici, IP degil.
   *
   * Varsayilan anahtar kaynak IP'ydi. Turkiye'de mobil operatorlerin buyuk kismi CGNAT
   * kullaniyor: binlerce abone ayni genel IP'den cikiyor ve ayni hucredeki kullanicilar
   * siniri BIRLIKTE dolduruyor. Kimse hizli gitmemisken hepsi birden "Cok hizli
   * gidiyorsun" gorur.
   *
   * Token BURADA dogrulaniyor. `keyGenerator` kimlik dogrulama preHandler'indan ONCE
   * calisiyor; `istek.kullaniciId` o anda hep bos olurdu ve degisiklik hicbir sey
   * yapmazdi. Dogrulamadan okumak ise daha kotusu olurdu: uydurma bir `sub` yazan
   * istemci kendine sinirsiz kova acardi.
   *
   * Bu yuzden `jwt` eklentisi sinirdan ONCE kaydediliyor.
   */
  await app.register(rateLimit, {
    max: yapilandirma.NODE_ENV === 'test' ? 10_000 : 120,
    timeWindow: '1 minute',
    keyGenerator: (istek) => istekAnahtari({ ...(kimlikCoz(app, istek) ?? {}), ip: istek.ip }),
  });

  const yetkisiz = () =>
    new UygulamaHatasi(401, 'yetkisiz', 'Oturumun sona ermiş. Tekrar giriş yap.');

  app.decorate('kimlikDogrula', async (istek) => {
    let kullaniciId: string;
    try {
      const yuk = await istek.jwtVerify<{ sub: string }>();
      kullaniciId = yuk.sub;
    } catch {
      throw yetkisiz();
    }

    /**
     * İmzanın geçerli olması kullanıcının VAR olduğu anlamına gelmiyor.
     *
     * Hesap silindiğinde elindeki erişim tokeni ömrünü doldurana kadar geçerli kalıyor.
     * Kimlik katmanı isteği geçiriyordu ve rotalar olmayan bir kullanıcıya göre çalışmaya
     * kalkışıyordu: üretimde denendi, `/v1/degerlendirme/durum` 500, `/v1/program/aktif`
     * 404, `/v1/ogun/deste` 402 dönüyordu. Üçü de yanlış — doğru cevap 401.
     *
     * Bedeli istek başına bir birincil anahtar okuması. Silme akışının doğru davranması
     * bunu fazlasıyla hak ediyor; kullanıcı kendi hatası olmayan bir "sunucu hatası"
     * görmemeli.
     */
    const [kullanici] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    if (!kullanici) throw yetkisiz();

    istek.kullaniciId = kullaniciId;
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
    /**
     * Çerçevenin kendi 4xx hataları 500'e düşmemeli.
     *
     * Burada yalnızca 429 tanınıyordu; boş gövde, bozuk JSON, desteklenmeyen içerik
     * tipi ve gövde sınırı aşımı gibi Fastify hataları — hepsi kendi `statusCode`'unu
     * taşıdığı hâlde — `500 sunucu_hatasi` oluyordu.
     *
     * Üç ayrı zarar veriyordu: kullanıcıya kendi hatası için "sunucu hatası" deniyordu,
     * istemci kodu çeviremediği için ne yapacağını söyleyemiyordu, ve her bozuk istemci
     * isteği `beklenmeyen hata` olarak loglanıp gerçek çökmeleri gürültüye gömüyordu.
     */
    const durumKodu =
      typeof hata === 'object' && hata !== null && 'statusCode' in hata
        ? Number((hata as { statusCode?: unknown }).statusCode)
        : Number.NaN;

    if (Number.isInteger(durumKodu) && durumKodu >= 400 && durumKodu < 500) {
      const kodlar: Record<number, string> = {
        413: 'govde_cok_buyuk',
        415: 'desteklenmeyen_icerik',
        429: 'cok_fazla_istek',
      };
      const mesajlar: Record<number, string> = {
        413: 'Gönderdiğin veri çok büyük. Daha küçük bir dosyayla tekrar dene.',
        415: 'Bu içerik tipini okuyamıyorum.',
        429: 'Çok hızlı gidiyorsun. Bir dakika sonra tekrar dene.',
      };

      // Beklenen istemci hatası: `warn`, `error` değil. İzlemeyi boğmamak için.
      istek.log.warn({ hata, durumKodu }, 'istemci hatası');

      return cevap.status(durumKodu).send({
        kod: kodlar[durumKodu] ?? 'gecersiz_istek',
        mesaj: mesajlar[durumKodu] ?? 'İstek geçersiz. Tekrar deneyebilirsin.',
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
