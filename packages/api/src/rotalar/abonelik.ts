import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Yasak } from '../hatalar';
import { quotas, subscriptions, users } from '../db/sema';
import { HAK_TABLOSU, planHaklari, type Plan } from '../servisler/haklar';
import { dilCozumle, metinleriAl } from '@swiip/shared';

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

const kancaSemasi = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string().min(1),
    product_id: z.string().optional(),
    expiration_at_ms: z.number().optional(),
  }),
});

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
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    return (kayit?.plan as Plan) ?? 'ucretsiz';
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
        vucut_analizi: {
          kullanilan: kota.body_analyses_used,
          toplam: haklar.vucut_analizi_aylik,
          kalan: Math.max(0, haklar.vucut_analizi_aylik - kota.body_analyses_used),
        },
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
  ): Promise<void> {
    const [kullanici] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    if (!kullanici) {
      app.log.warn({ kullaniciId }, 'kanca bilinmeyen kullanıcı için geldi');
      return;
    }

    await db
      .insert(subscriptions)
      .values({
        user_id: kullaniciId,
        plan,
        product_id: urunId,
        renews_at: yenilenme,
      })
      .onConflictDoUpdate({
        target: subscriptions.user_id,
        set: { plan, product_id: urunId, renews_at: yenilenme, updated_at: new Date() },
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

      const { event } = kancaSemasi.parse(istek.body);
      const plan = urunPlani(event.product_id);

      // Hakkı kapatan olaylar ürün kimliği taşımayabilir; tip yeterli.
      if (event.type === 'EXPIRATION' || event.type === 'BILLING_ISSUE') {
        await planYaz(event.app_user_id, 'ucretsiz', null, null);
        return { alindi: true };
      }

      // İptal hakkı hemen kapatmaz: kullanıcı dönemin parasını ödedi.
      if (event.type === 'CANCELLATION') return { alindi: true };

      if (!plan) return { alindi: true };

      await planYaz(
        event.app_user_id,
        plan,
        event.product_id ?? null,
        event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
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
