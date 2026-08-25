import { and, count, eq, gte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Yasak } from '../hatalar';
import { body_analyses, kanca_olaylari, quotas, subscriptions, users } from '../db/sema';
import { HAK_TABLOSU, planHaklari, type Haklar, type Plan } from '../servisler/haklar';
import { dilCozumle, metinleriAl } from '@swiip/shared';
import { planGecerliMi } from '../servisler/planOku';

/**
 * Abonelik, hak ve kota (F6).
 *
 * Kota adalet kuralları (spec bölüm 13):
 *  - Önbellekten gelen tanıma kotadan düşmez (bize maliyeti sıfır).
 *  - Yanlış tanıma sonrası tekrar deneme kotadan düşmez (bizim hatamız).
 *
 * Kota günlük tavan değil aylık havuzdur.
 */

/** RevenueCat ürün kimliği → plan. Mağaza panelindeki kimliklerle birebir aynı olmalı. */
const URUN_PLANI: Record<string, Plan> = {
  swiip_temel_aylik: 'temel',
  swiip_temel_yillik: 'temel',
  swiip_pro_aylik: 'pro',
  swiip_pro_yillik: 'pro',
};

/**
 * İki mağaza aynı ürünü farklı yazıyor.
 *
 * App Store kimliği olduğu gibi gönderiyor (`swiip_pro_aylik`), Google Play ise taban
 * plan kimliğini iki nokta üst üste ile ekliyor (`swiip_pro_aylik:aylik`). Tabloda
 * yalnızca eksiz hâli var; kırpmadan bakınca Play'den gelen her kanca eşleşmiyor ve
 * `if (!plan) return` dalına düşüyor — yani **abonelik sessizce hiç açılmıyor.**
 * Sessiz olduğu için de ancak parayı ödemiş kullanıcı şikâyet edince fark edilirdi.
 */
export function urunPlani(urunId: string | undefined): Plan | undefined {
  if (!urunId) return undefined;
  const eksiz = urunId.split(':')[0] ?? urunId;
  return URUN_PLANI[urunId] ?? URUN_PLANI[eksiz];
}

/**
 * Kanca gövdesi.
 *
 * `app_user_id` artık ZORUNLU DEĞİL. `TRANSFER` ve `SUBSCRIBER_ALIAS` olayları tek bir
 * kullanıcı kimliği taşımıyor; `transferred_from` / `transferred_to` dizileriyle
 * geliyor. Zorunlu olduğu sürece bu olaylar ZodError'a düşüp 400 dönüyordu; RevenueCat
 * için bu "teslim edilemedi" demek ve olay hiç işlenmiyordu. Somut sonucu: abonelik
 * başka bir hesaba taşındığında ESKİ hesap Pro kalıyor, YENİ hesap hiç Pro olmuyordu —
 * iki hesap, tek abonelik.
 *
 * Bilinmeyen alanlar yok sayılıyor; RevenueCat gövdeye alan eklediğinde 400 dönmemeli.
 */
const kancaSemasi = z.object({
  event: z.object({
    /** Tekrar oynatma koruması. Eski gövdelerde olmayabilir. */
    id: z.string().optional(),
    type: z.string(),
    app_user_id: z.string().min(1).optional(),
    product_id: z.string().optional(),
    /** PRODUCT_CHANGE'te YENİ ürün burada; `product_id` eskisini taşır. */
    new_product_id: z.string().optional(),
    expiration_at_ms: z.number().optional(),
    event_timestamp_ms: z.number().optional(),
    /** 'PRODUCTION' | 'SANDBOX' */
    environment: z.string().optional(),
    /** CANCELLATION alt sebebi: UNSUBSCRIBE | BILLING_ERROR | CUSTOMER_SUPPORT | ... */
    cancel_reason: z.string().optional(),
    transferred_from: z.array(z.string()).optional(),
    transferred_to: z.array(z.string()).optional(),
  }),
});

/**
 * İade sayılan iptal sebepleri.
 *
 * RevenueCat iadeyi ayrı bir olay tipi olarak göndermiyor; `CANCELLATION` altında
 * `cancel_reason` ile bildiriyor. Kod tüm CANCELLATION'ları "dönemin parası ödendi"
 * diye yutuyordu — doğru varsayım, ama iade için yanlış: parasını geri alan kullanıcı
 * dönem sonuna kadar Pro kalıyordu.
 */
const IADE_SEBEPLERI = new Set(['CUSTOMER_SUPPORT', 'REFUND', 'UNKNOWN_REFUND']);

/** `users.id` bir uuid sütunu; biçime uymayan dize sorguyu patlatır. */
const UUID_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Bu olay üretimde yok sayılmalı mı?
 *
 * RevenueCat panelinde kanca "Both Production and Sandbox" olarak ayarlı. `environment`
 * hiç okunmadığı sürece her TestFlight kullanıcısı ve her Play lisans testçisi, sandbox
 * satın almasıyla ÜRETİM veritabanına gerçek bir `pro` planı yazdırabiliyordu.
 *
 * Saf fonksiyon: karar üretim yapılandırması olmadan da test edilebilsin.
 */
export function sandboxYokSayilsinMi(ortam: string, olayOrtami: string | undefined): boolean {
  if (ortam !== 'production') return false;
  if (!olayOrtami) return false;
  return olayOrtami.toUpperCase() !== 'PRODUCTION';
}

/** Sabit zamanlı karşılaştırma: uzunluk farkı bile bilgi sızdırmasın. */
function sirEsit(gelen: string, beklenen: string): boolean {
  const a = Buffer.from(gelen);
  const b = Buffer.from(beklenen);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function abonelikRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function planGetir(kullaniciId: string): Promise<Plan> {
    const [kayit] = await db
      .select({ plan: subscriptions.plan, yenilenme: subscriptions.renews_at })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    if (!kayit || !planGecerliMi(kayit.yenilenme)) return 'ucretsiz';
    return (kayit.plan as Plan) ?? 'ucretsiz';
  }

  /**
   * Vücut analizi kullanımı — `body_analyses` defterinden.
   *
   * Ücretsiz katmanda hak ömür boyu tek, o yüzden toplam sayılıyor. Ödemelide aylık,
   * o yüzden ay başından beri sayılıyor. `vucut.ts`'teki kapı ile aynı mantık; iki
   * yerde iki farklı cevap vermemeleri için ikisi de aynı defteri okuyor.
   */
  async function vucutAnaliziSayaci(kullaniciId: string, plan: Plan, haklar: Haklar) {
    const ayBasi = new Date();
    ayBasi.setUTCDate(1);
    ayBasi.setUTCHours(0, 0, 0, 0);

    const [toplam] = await db
      .select({ adet: count() })
      .from(body_analyses)
      .where(eq(body_analyses.user_id, kullaniciId));

    const [buAy] = await db
      .select({ adet: count() })
      .from(body_analyses)
      .where(and(eq(body_analyses.user_id, kullaniciId), gte(body_analyses.taken_at, ayBasi)));

    const kullanilan = plan === 'ucretsiz' ? (toplam?.adet ?? 0) : (buAy?.adet ?? 0);
    const tavan = plan === 'ucretsiz' ? 1 : haklar.vucut_analizi_aylik;

    return { kullanilan, toplam: tavan, kalan: Math.max(0, tavan - kullanilan) };
  }

  async function kotaGetir(kullaniciId: string) {
    const donem = donemKodu();
    const [kayit] = await db
      .select()
      .from(quotas)
      .where(and(eq(quotas.user_id, kullaniciId), eq(quotas.period, donem)))
      .limit(1);

    if (kayit) return kayit;

    const [yeni] = await db
      .insert(quotas)
      .values({ user_id: kullaniciId, period: donem })
      .onConflictDoNothing()
      .returning();

    return (
      yeni ?? {
        user_id: kullaniciId,
        period: donem,
        food_photos_used: 0,
        coach_messages_used: 0,
        body_analyses_used: 0,
        onbellek_isabeti: 0,
        hatali_tanima_tekrari: 0,
      }
    );
  }

  /**
   * Plan adı cevapta GÖNDERİLMİYOR.
   *
   * `HAK_TABLOSU.ad` Türkçe bir görünen ad ("Ücretsiz", "Temel") ve doğrudan
   * gönderiliyordu: İngilizce kullanıcı ayarlarda "Ücretsiz" okuyordu. Dil süpürmesi
   * bunu kaçırdı çünkü alan adı `ad` ve süpürme `ad` alanlarını veri sayıp muaf tutuyor
   * (hareket adı, besin adı gerçekten Türkçe veri).
   *
   * Çözüm alanı çevirmek değil, göndermemek: kod zaten cevapta, ismi istemci sözlükten
   * kuruyor. `ad` tabloda kalıyor — kayıt ve yönetim tarafında işe yarıyor.
   */
  const adsiz = ({ ad: _ad, ...kalan }: (typeof HAK_TABLOSU)['ucretsiz']) => kalan;

  app.get('/durum', { preHandler: app.kimlikDogrula }, async (istek) => {
    const plan = await planGetir(istek.kullaniciId);
    const kota = await kotaGetir(istek.kullaniciId);
    const haklar = planHaklari(plan);

    const [kullanici] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);
    const kullaniciLocale = kullanici?.locale ?? null;

    return {
      plan,
      haklar: adsiz(haklar),
      kota: {
        donem: kota.period,
        yenilenme: donemBitisi(),
        yemek_tanima: {
          kullanilan: kota.food_photos_used,
          toplam: haklar.yemek_tanima_aylik,
          kalan: Math.max(0, haklar.yemek_tanima_aylik - kota.food_photos_used),
        },
        koc_sohbeti: {
          kullanilan: kota.coach_messages_used,
          toplam: haklar.koc_mesaji_aylik,
          kalan: Math.max(0, haklar.koc_mesaji_aylik - kota.coach_messages_used),
        },
        /**
         * Vücut analizi sayacı DEFTERDEN okunuyor.
         *
         * `quotas.body_analyses_used` kolonu hiçbir yerde YAZILMIYOR — sadece burada
         * okunuyordu, yani her zaman 0. Sonuç: ömür boyu tek hakkını çoktan kullanmış
         * ücretsiz kullanıcı ayarlarda "1 kalan" görüyor, deniyor ve 403 alıyordu.
         *
         * Gerçek defter `body_analyses` tablosu ve hakkı belirleyen kural da
         * `vucutAnaliziHakki` — gösterim artık ikisiyle aynı kaynaktan besleniyor.
         * Ücretsiz katmanda kural ömür boyu, ödemelide aylık; o yüzden iki farklı
         * sayım.
         */
        vucut_analizi: await vucutAnaliziSayaci(istek.kullaniciId, plan, haklar),
        // Kota adalet kuralı kullanıcının dilinde; kural her dilde aynı.
        adalet_notu: metinleriAl(dilCozumle(kullaniciLocale)).ayarlar.kotaAdaletNotu,
        kotadan_dusmeyen: {
          onbellek_isabeti: kota.onbellek_isabeti,
          hatali_tanima_tekrari: kota.hatali_tanima_tekrari,
        },
      },
      // Ödeyen kullanıcıya hiçbir promosyon arayüzü gösterilmez.
      promosyon_goster: plan === 'ucretsiz',
    };
  });

  /**
   * RevenueCat web kancası (F6.1) — üretimde hakkı açan tek yol.
   *
   * Doğrulama paylaşılan sır ile: RevenueCat panelinde `Authorization` başlığı olarak
   * ayarlanır. Sır tanımlı değilse uç hiç kurulmaz; doğrulanmamış bir kanca, ödeme
   * duvarını herkese açmak demek olurdu.
   *
   * Karşılaştırma sabit zamanlı: kısa devre karşılaştırma sırrı harf harf tahmin etmeye
   * kapı bırakır.
   *
   * Bilinmeyen kullanıcı ve bilinmeyen ürün 200 ile yutulur. RevenueCat 2xx almazsa
   * saatlerce yeniden dener; bizim veri sorunumuz onların kuyruğunu tıkamamalı.
   */
  /**
   * Planı yazar. Bilinmeyen kullanıcı sessizce yutulur: kanca kaynağı bizim
   * veritabanımızı bilmiyor ve 2xx almazsa saatlerce yeniden dener.
   */
  async function planYaz(
    kullaniciId: string,
    plan: Plan,
    urunId: string | null,
    yenilenme: Date | null,
    olayDamgasiMs?: number,
  ): Promise<void> {
    /**
     * UUID olmayan kimlik sorgulanmadan elenir.
     *
     * `users.id` bir `uuid` sütunu; oraya UUID biçiminde olmayan bir dize sorulduğunda
     * Postgres cast hatası atıyor ve kanca 500 dönüyordu. Bu teorik bir durum değil:
     * RevenueCat oturum açmamış cihazlar için `$RCAnonymousID:...` gönderiyor ve
     * `TRANSFER` olayları da bizim veritabanımızda hiç bulunmayan kimlikler taşıyor.
     * 500, RevenueCat için "teslim edilemedi" demek — yani her anonim olay sonsuz
     * yeniden denemeye giriyor ve kancanın sağlığını bozuyordu.
     */
    if (!UUID_DESENI.test(kullaniciId)) {
      app.log.info({ kullaniciId }, 'kanca UUID olmayan kimlikle geldi; yok sayıldı');
      return;
    }

    const [kullanici] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    if (!kullanici) {
      app.log.warn({ kullaniciId }, 'kanca bilinmeyen kullanıcı için geldi');
      return;
    }

    /**
     * Geç gelen ESKİ olay, yenisinin üstüne yazmaz.
     *
     * RevenueCat teslimatları sırayla göndermiyor ve başarısızları yeniden deniyor.
     * Sıra koruması olmadan, birkaç saat gecikmiş bir `EXPIRATION` daha sonra işlenmiş
     * bir `RENEWAL`'ı ezip parasını ödemiş kullanıcının planını düşürebiliyordu.
     */
    if (olayDamgasiMs !== undefined) {
      const [mevcut] = await db
        .select({ guncellendi: subscriptions.updated_at })
        .from(subscriptions)
        .where(eq(subscriptions.user_id, kullaniciId))
        .limit(1);

      if (mevcut?.guncellendi && mevcut.guncellendi.getTime() > olayDamgasiMs) {
        app.log.info({ kullaniciId }, 'daha eski kanca olayı yok sayıldı');
        return;
      }
    }

    const damga = olayDamgasiMs !== undefined ? new Date(olayDamgasiMs) : new Date();

    await db
      .insert(subscriptions)
      .values({
        user_id: kullaniciId,
        plan,
        product_id: urunId,
        renews_at: yenilenme,
        updated_at: damga,
      })
      .onConflictDoUpdate({
        target: subscriptions.user_id,
        set: { plan, product_id: urunId, renews_at: yenilenme, updated_at: damga },
      });
  }

  const kancaSirri = app.yapilandirma.REVENUECAT_KANCA_SIRRI;

  if (kancaSirri) {
    app.post('/kanca', async (istek, cevap) => {
      const baslik = istek.headers.authorization ?? '';
      const gelen = baslik.startsWith('Bearer ') ? baslik.slice(7) : baslik;

      if (!sirEsit(gelen, kancaSirri)) {
        return cevap.code(401).send({ kod: 'yetkisiz', mesaj: 'Kanca doğrulanamadı.' });
      }

      const ayristirma = kancaSemasi.safeParse(istek.body);

      /**
       * Tanımadığımız gövde 200 ile yutuluyor.
       *
       * `parse` fırlatınca 400 dönüyorduk; RevenueCat bunu "teslim edilemedi" sayıp
       * saatlerce yeniden deniyor, sonra bırakıyor. Bizim anlamadığımız bir gövde
       * onların kuyruğunu tıkamamalı — ama sessizce de kaybolmamalı.
       */
      if (!ayristirma.success) {
        app.log.warn({ hata: ayristirma.error.issues }, 'kanca gövdesi çözümlenemedi');
        return { alindi: true, islenmedi: 'govde_cozumlenemedi' };
      }

      const { event } = ayristirma.data;

      /**
       * SANDBOX olayı üretim hakkını AÇMAZ.
       *
       * RevenueCat panelinde kanca "Both Production and Sandbox" olarak ayarlı ve
       * `event.environment` hiç okunmuyordu. Yani her TestFlight kullanıcısı ve her
       * Play lisans testçisi, sandbox satın almasıyla üretim veritabanına gerçek bir
       * `pro` planı yazdırabiliyordu — bedava Pro yolu.
       *
       * Sandbox olayları test ortamında işlenmeye devam ediyor; kapanan yalnızca
       * üretim.
       */
      if (sandboxYokSayilsinMi(app.yapilandirma.NODE_ENV, event.environment)) {
        app.log.info({ tip: event.type }, 'sandbox kancası üretimde yok sayıldı');
        return { alindi: true, islenmedi: 'sandbox' };
      }

      /**
       * Tekrar oynatma ve sıra koruması.
       *
       * `event.id` daha önce işlendiyse hiçbir şey yapılmaz. Kimlik taşımayan eski
       * gövdeler eskisi gibi işlenir — koruma eklemek, çalışan akışı durdurmamalı.
       */
      if (event.id) {
        const [yeni] = await db
          .insert(kanca_olaylari)
          .values({
            event_id: event.id,
            tip: event.type,
            app_user_id: event.app_user_id ?? null,
            olay_at: event.event_timestamp_ms ? new Date(event.event_timestamp_ms) : null,
          })
          .onConflictDoNothing()
          .returning();

        if (!yeni) return { alindi: true, islenmedi: 'tekrar' };
      }

      /**
       * TRANSFER: abonelik hesap değiştirdi.
       *
       * Eskisinin hakkı kapanır, yenisininki açılır. Bu olay hiç işlenmiyordu (şema
       * `app_user_id` istiyordu, TRANSFER onu göndermiyor) ve sonuç iki hesabın tek
       * abonelikle Pro kalmasıydı.
       */
      if (event.type === 'TRANSFER') {
        for (const eski of event.transferred_from ?? []) {
          await planYaz(eski, 'ucretsiz', null, null, event.event_timestamp_ms);
        }
        const yeniPlan = urunPlani(event.new_product_id ?? event.product_id);
        for (const yeni of event.transferred_to ?? []) {
          await planYaz(
            yeni,
            yeniPlan ?? 'ucretsiz',
            event.new_product_id ?? event.product_id ?? null,
            event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
            event.event_timestamp_ms,
          );
        }
        return { alindi: true };
      }

      if (!event.app_user_id) return { alindi: true, islenmedi: 'kullanici_yok' };

      // Hakkı kapatan olaylar ürün kimliği taşımayabilir; tip yeterli.
      if (event.type === 'EXPIRATION' || event.type === 'SUBSCRIPTION_PAUSED') {
        await planYaz(event.app_user_id, 'ucretsiz', null, null, event.event_timestamp_ms);
        return { alindi: true };
      }

      /**
       * BILLING_ISSUE hakkı HEMEN kapatmaz.
       *
       * Eskiden EXPIRATION ile aynı kefedeydi. Ama bu olay "ödeme alınamadı, mağaza
       * yeniden deneyecek" demek: Apple ve Google'ın grace period'u sürerken kullanıcı
       * hâlâ abone ve büyük ihtimalle ödeme düzelecek. Parasını ödeyen müşteriden
       * dönem ortasında hakkı almak yanlış yöndü.
       *
       * `renews_at`'e dokunulmuyor; süre zaten dolduğunda `planOku` kendi kapatacak.
       */
      if (event.type === 'BILLING_ISSUE') {
        app.log.info({ kullaniciId: event.app_user_id }, 'ödeme sorunu; hak süreye bırakıldı');
        return { alindi: true };
      }

      /**
       * İptal: normalde hak dönem sonuna kadar açık kalır — kullanıcı parasını ödedi.
       * İADE ise ayrı: para geri gittiyse hak hemen kapanır.
       */
      if (event.type === 'CANCELLATION') {
        const iade = event.cancel_reason && IADE_SEBEPLERI.has(event.cancel_reason.toUpperCase());
        if (iade) {
          await planYaz(event.app_user_id, 'ucretsiz', null, null, event.event_timestamp_ms);
        }
        return { alindi: true };
      }

      /**
       * PRODUCT_CHANGE'te YENİ ürün `new_product_id` alanında.
       *
       * `product_id` eski ürünü taşıyor. Yalnızca ona bakıldığı için Pro'dan Temel'e
       * düşen kullanıcı Pro kalmaya devam ediyordu — yıllıkta bir yıl boyunca.
       */
      const plan = urunPlani(event.new_product_id ?? event.product_id);
      if (!plan) return { alindi: true, islenmedi: 'urun_taninmadi' };

      await planYaz(
        event.app_user_id,
        plan,
        event.new_product_id ?? event.product_id ?? null,
        event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
        event.event_timestamp_ms,
      );

      return { alindi: true };
    });
  }

  app.get('/planlar', async () => ({
    planlar: Object.entries(HAK_TABLOSU).map(([kod, haklar]) => ({ kod, ...adsiz(haklar) })),
    /** Paywall kuralı: önceden seçili plan yok. */
    onceden_secili: null,
    iptal_bilgisi:
      'İptal etmek iki dokunuş sürer: Ayarlar → Aboneliği iptal et. Ayarların en üstündedir.',
  }));

  /**
   * Plan güncelleme — **yalnızca geliştirme ve test**.
   *
   * Üretimde hak yalnızca mağazadan gelir. Bu uç açık kalsaydı bir `curl` ile herkes Pro
   * olurdu; ödeme duvarı istemcinin iyi niyetine bırakılmış olurdu.
   *
   * Ayrım ortam değişkeniyle değil `NODE_ENV` ile: yanlışlıkla açık bırakılamaz.
   * Gerçek akış RevenueCat web kancası (`/kanca`) üzerinden.
   */
  app.post('/guncelle', { preHandler: app.kimlikDogrula }, async (istek) => {
    if (app.yapilandirma.NODE_ENV === 'production') {
      throw Yasak(
        'Plan yalnızca mağaza üzerinden değiştirilir. Satın alma uygulamadan yapılır.',
        'magaza_disi_yukseltme',
      );
    }

    const govde = z
      .object({
        plan: z.enum(['ucretsiz', 'temel', 'pro']),
        product_id: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
        renews_at: z.string().datetime().optional(),
      })
      .parse(istek.body);

    await db
      .insert(subscriptions)
      .values({
        user_id: istek.kullaniciId,
        plan: govde.plan,
        product_id: govde.product_id ?? null,
        platform: govde.platform ?? null,
        renews_at: govde.renews_at ? new Date(govde.renews_at) : null,
      })
      .onConflictDoUpdate({
        target: subscriptions.user_id,
        set: {
          plan: govde.plan,
          product_id: govde.product_id ?? null,
          platform: govde.platform ?? null,
          renews_at: govde.renews_at ? new Date(govde.renews_at) : null,
          updated_at: new Date(),
        },
      });

    return { plan: govde.plan, haklar: planHaklari(govde.plan) };
  });

  /** İptal tek adım. Ayarların en üstünde durur ve gerçekten iptal eder. */
  app.post('/iptal', { preHandler: app.kimlikDogrula }, async (istek) => {
    await db
      .update(subscriptions)
      .set({ status: 'iptal_edildi', updated_at: new Date() })
      .where(eq(subscriptions.user_id, istek.kullaniciId));

    return {
      durum: 'iptal_edildi',
      mesaj:
        'Aboneliğin iptal edildi. Dönem sonuna kadar tüm özellikler açık kalır, sonra ücretsiz ' +
        'plana döner. Verilerin duruyor.',
    };
  });

  /**
   * `POST /kota-tuket` bilerek kaldırıldı.
   *
   * İstemcinin "bu istek önbellekten geldi" demesine güvenmek, ücretsiz sınırsız AI
   * demekti. Kota kararı zaten sunucuda veriliyor: `rotalar/tanima.ts` ve `rotalar/koc.ts`
   * `kotaDusulmeliMi()` ile kendi hesabını yapıyor. Ayrı bir uç yalnızca atlama yolu
   * açıyordu.
   */
}

export function donemKodu(tarih = new Date()): string {
  return `${tarih.getUTCFullYear()}-${String(tarih.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function donemBitisi(tarih = new Date()): string {
  const sonraki = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth() + 1, 1));
  return sonraki.toISOString().slice(0, 10);
}
