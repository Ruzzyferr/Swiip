import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SORU_BANKASI } from '@made2fit/shared';
import { Yasak } from '../hatalar';
import { ai_usage, analytics_events, assessments, subscriptions, users } from '../db/sema';

/**
 * Analitik (kesişen iş).
 *
 * Plan F2'nin "Dikkat" notu: *"Terk oranı burada ölçülür. Blok bazlı analitik ilk günden
 * kurulur — hangi soruda kaç kişi düştüğünü bilmeden iyileştirilemez."*
 *
 * Bu uçlar o notun karşılığı. Üç şeyi ölçüyoruz ve üçü de karar değiştiriyor:
 *  1. Terk noktaları — hangi soru insanları kaybettiriyor
 *  2. Dönüşüm hunisi — kayıttan programa kaç kişi ulaşıyor
 *  3. Birim ekonomisi — kullanıcı başına AI maliyeti (en büyük riskimiz)
 *
 * Kişisel veri döndürmez: yalnızca sayımlar. Kullanıcı kimliği hiçbir cevapta yer almaz.
 */

/** Yönetim uçları yalnızca bu ortam değişkeni tanımlıysa açıktır. */
function yonetimAnahtariniDogrula(app: FastifyInstance, anahtar: string | undefined): void {
  const beklenen = process.env.YONETIM_ANAHTARI;

  if (!beklenen || beklenen.length < 32) {
    throw Yasak(
      'Yönetim uçları kapalı. Açmak için YONETIM_ANAHTARI ortam değişkenini tanımla (en az 32 karakter).',
      'yonetim_kapali',
    );
  }
  if (anahtar !== beklenen) {
    throw Yasak('Geçersiz yönetim anahtarı.', 'yonetim_yetkisiz');
  }
  void app;
}

export async function analitikRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  /** Her yönetim ucu aynı kapıdan geçer. */
  const yonetimKapisi = async (istek: { headers: Record<string, unknown> }) => {
    const anahtar = istek.headers['x-yonetim-anahtari'];
    yonetimAnahtariniDogrula(app, typeof anahtar === 'string' ? anahtar : undefined);
  };

  /**
   * Terk noktaları: hangi soruda kaç kişi bıraktı.
   *
   * Yalnızca tamamlanmamış değerlendirmelere bakılır; tamamlayan kimse "terk etti" sayılmaz.
   */
  app.get('/terk-noktalari', { preHandler: yonetimKapisi }, async () => {
    const yarim = await db
      .select({ son_soru: assessments.son_soru_id, sayi: sql<number>`count(*)` })
      .from(assessments)
      .where(and(isNull(assessments.completed_at), sql`${assessments.son_soru_id} is not null`))
      .groupBy(assessments.son_soru_id)
      .orderBy(desc(sql`count(*)`));

    const [toplam] = await db
      .select({
        baslayan: sql<number>`count(*)`,
        tamamlayan: sql<number>`count(*) filter (where ${assessments.completed_at} is not null)`,
      })
      .from(assessments);

    const baslayan = Number(toplam?.baslayan ?? 0);
    const tamamlayan = Number(toplam?.tamamlayan ?? 0);

    // Soru id'sini bloğa ve metne bağla: "S12" tek başına bir şey söylemiyor.
    const soruDizini = new Map<string, { blok: string; metin: string }>();
    for (const blok of SORU_BANKASI.blocks) {
      for (const soru of blok.questions) {
        soruDizini.set(soru.id, { blok: blok.title, metin: soru.text });
      }
    }

    return {
      baslayan,
      tamamlayan,
      tamamlama_orani: baslayan > 0 ? Math.round((tamamlayan / baslayan) * 100) : 0,
      terk_noktalari: yarim.map((satir) => {
        const temelId = String(satir.son_soru ?? '').split(':')[0] ?? '';
        const soru = soruDizini.get(temelId);
        return {
          soru_id: satir.son_soru,
          blok: soru?.blok ?? 'bilinmiyor',
          soru_metni: soru?.metin ?? null,
          terk_eden: Number(satir.sayi),
        };
      }),
    };
  });

  /** Blok bazlı ilerleme: hangi bloktan sonra kayıp hızlanıyor. */
  app.get('/blok-hunisi', { preHandler: yonetimKapisi }, async () => {
    const olaylar = await db
      .select({
        blok: sql<string>`${analytics_events.ozellikler}->>'blok'`,
        sayi: sql<number>`count(distinct ${analytics_events.user_id})`,
      })
      .from(analytics_events)
      .where(eq(analytics_events.olay, 'degerlendirme_ilerleme'))
      .groupBy(sql`${analytics_events.ozellikler}->>'blok'`);

    const sayilar = new Map(olaylar.map((o) => [o.blok, Number(o.sayi)]));
    const siraliBloklar = SORU_BANKASI.blocks.map((b) => b.id);
    const ilk = sayilar.get(siraliBloklar[0] ?? '') ?? 0;

    return {
      huni: siraliBloklar.map((blokId, i) => {
        const blok = SORU_BANKASI.blocks.find((b) => b.id === blokId)!;
        const ulasan = sayilar.get(blokId) ?? 0;
        const oncekiBlok = siraliBloklar[i - 1];
        const onceki = oncekiBlok ? (sayilar.get(oncekiBlok) ?? 0) : ulasan;

        return {
          blok_id: blokId,
          baslik: blok.title,
          ulasan,
          ilkten_oran: ilk > 0 ? Math.round((ulasan / ilk) * 100) : 0,
          // Bir önceki bloktan buraya kaçta kaçı geldi: darboğaz burada görünür.
          adim_orani: onceki > 0 ? Math.round((ulasan / onceki) * 100) : 0,
        };
      }),
    };
  });

  /** Dönüşüm hunisi: kayıttan ödemeye. */
  app.get('/donusum', { preHandler: yonetimKapisi }, async () => {
    const [sayimlar] = await db
      .select({
        kayit: sql<number>`count(*)`,
        saglik_onayi: sql<number>`count(*) filter (where ${users.consent_health} is not null)`,
        foto_onayi: sql<number>`count(*) filter (where ${users.consent_photo} is not null)`,
        ed_modu: sql<number>`count(*) filter (where ${users.ed_mode})`,
      })
      .from(users);

    const [degerlendirme] = await db
      .select({
        baslayan: sql<number>`count(distinct ${assessments.user_id})`,
        tamamlayan: sql<number>`count(distinct ${assessments.user_id}) filter (where ${assessments.completed_at} is not null)`,
      })
      .from(assessments);

    const planlar = await db
      .select({ plan: subscriptions.plan, sayi: sql<number>`count(*)` })
      .from(subscriptions)
      .groupBy(subscriptions.plan);

    const planSayilari = Object.fromEntries(planlar.map((p) => [p.plan, Number(p.sayi)]));
    const kayit = Number(sayimlar?.kayit ?? 0);
    const odeyen = (planSayilari.temel ?? 0) + (planSayilari.pro ?? 0);

    return {
      kayit,
      saglik_onayi: Number(sayimlar?.saglik_onayi ?? 0),
      foto_onayi: Number(sayimlar?.foto_onayi ?? 0),
      // Fotoğrafsız devam edenler: gizlilik çekincesinin büyüklüğünü buradan ölçüyoruz.
      fotografsiz_oran:
        kayit > 0 ? Math.round((1 - Number(sayimlar?.foto_onayi ?? 0) / kayit) * 100) : 0,
      ed_modu: Number(sayimlar?.ed_modu ?? 0),
      degerlendirme_baslayan: Number(degerlendirme?.baslayan ?? 0),
      degerlendirme_tamamlayan: Number(degerlendirme?.tamamlayan ?? 0),
      planlar: planSayilari,
      odeyen,
      odeme_orani: kayit > 0 ? Math.round((odeyen / kayit) * 100) : 0,
    };
  });

  /**
   * Birim ekonomisi (F7.8 · en büyük risk).
   *
   * Kullanıcı başına aylık AI maliyeti hedefin altında mı? Bu sayı marjı yiyorsa
   * ürün ne kadar çok kullanılırsa o kadar çok kaybettirir.
   */
  app.get('/birim-ekonomisi', { preHandler: yonetimKapisi }, async (istek) => {
    const { donem } = z
      .object({
        donem: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
      })
      .parse(istek.query);

    const hedefDonem = donem ?? new Date().toISOString().slice(0, 7);

    const kalemler = await db
      .select({
        is_tipi: ai_usage.is_tipi,
        cagri: sql<number>`count(*)`,
        maliyet: sql<string>`coalesce(sum(${ai_usage.maliyet_usd}), 0)`,
        onbellekten: sql<number>`count(*) filter (where ${ai_usage.onbellekten})`,
      })
      .from(ai_usage)
      .where(sql`to_char(${ai_usage.created_at}, 'YYYY-MM') = ${hedefDonem}`)
      .groupBy(ai_usage.is_tipi);

    const [aktif] = await db
      .select({ sayi: sql<number>`count(distinct ${ai_usage.user_id})` })
      .from(ai_usage)
      .where(sql`to_char(${ai_usage.created_at}, 'YYYY-MM') = ${hedefDonem}`);

    const toplamUsd = kalemler.reduce((t, k) => t + Number(k.maliyet), 0);
    const aktifKullanici = Math.max(1, Number(aktif?.sayi ?? 0));
    const kullaniciBasi = toplamUsd / aktifKullanici;

    // spec bölüm 12: aktif Pro kullanıcı ~$0,70-1,40
    const HEDEF_TAVAN = 1.4;

    return {
      donem: hedefDonem,
      aktif_kullanici: Number(aktif?.sayi ?? 0),
      toplam_usd: Math.round(toplamUsd * 10000) / 10000,
      kullanici_basi_usd: Math.round(kullaniciBasi * 10000) / 10000,
      hedef_tavan_usd: HEDEF_TAVAN,
      hedefin_altinda: kullaniciBasi <= HEDEF_TAVAN,
      kalemler: kalemler.map((k) => ({
        is_tipi: k.is_tipi,
        cagri: Number(k.cagri),
        maliyet_usd: Math.round(Number(k.maliyet) * 10000) / 10000,
        onbellekten: Number(k.onbellekten),
      })),
      uyari:
        kullaniciBasi > HEDEF_TAVAN
          ? 'Kullanıcı başına maliyet hedefin üstünde. Kotaları veya model seçimini gözden geçir; ' +
            'bu sayı marjı yiyorsa ürün ne kadar çok kullanılırsa o kadar çok kaybettirir.'
          : null,
    };
  });
}
