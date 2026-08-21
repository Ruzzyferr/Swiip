import { and, desc, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  besinToplami,
  kalemleriEslestir,
  kotaDusulmeliMi,
  maliyetHesapla,
  modelSec,
  tanimaCiktisiniAyristir,
  TANIMA_SISTEM_MESAJI,
  turkceNormalize,
  type BesinKaydi,
  type EslesmisKalem,
  type TanimaKalemi,
} from '@swiip/core';
import { veriYereli } from '@swiip/shared';
import { Bulunamadi, HataliIstek, KotaDoldu, PlanYetersiz } from '../hatalar';
import {
  ai_usage,
  food_logs,
  foods,
  quotas,
  subscriptions,
  tanima_eslemeleri,
  tanima_onbellegi,
  users,
} from '../db/sema';
import { gorselParmakIzi } from '../servisler/gorselAnaliz';
import { planHaklari, type Plan } from '../servisler/haklar';
import { donemBitisi, donemKodu } from './abonelik';
import { kotaIadeEt, kotaRezerveEt } from '../servisler/kotaRezerve';
import { butceDurumu, fotografBoyutuUygunMu } from '@swiip/core';

/**
 * Fotoğraftan yemek tanıma (F7).
 *
 * Sistemin en yüksek hacimli ve en pahalı noktası. Sıra bilinçli:
 *
 *   1. Yerel önbellek  → AI çağrısı YOK, kota YEMEZ
 *   2. Tanıma + miktar → ucuz görsel model; çıktı kalem listesi, kalori DEĞİL
 *   3. Veritabanı eşleme → bileşim buradan; toplam = miktar × bileşim
 *   4. Kullanıcı doğrulama → düzeltme akışı
 *   5. Geri besleme → düzeltme önbelleğe ve global eşleme tablosuna
 *
 * Fotoğrafın kendisi hiçbir aşamada saklanmaz; yalnızca özeti (parmak izi) tutulur.
 */

const tanimaSemasi = z.object({
  /** base64 fotoğraf; yalnızca bu istek boyunca bellekte kalır. */
  /**
   * Boyut şema düzeyinde sınırlanıyor: plan ve kota kontrolünden **önce** reddedilsin.
   * Maliyet girdi boyutuyla büyür; kota çağrı sayısını sınırlıyor, boyutu değil.
   */
  fotograf: z.string().min(100).refine(fotografBoyutuUygunMu, {
    message:
      'Fotoğraf çok büyük. Uygulamanın kendi çektiği kare bu sınırın altında kalıyor; galeriden seçtiysen küçültüp tekrar dene.',
  }),
  /** Yanlış tanıma sonrası tekrar deneme — kotadan düşmez. */
  tekrar_deneme: z.boolean().default(false),
  gun: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const duzeltmeSemasi = z.object({
  photo_hash: z.string().min(8).max(64),
  kalemler: z.array(
    z.object({
      ad: z.string().min(1).max(80),
      food_id: z.string().uuid(),
      gram: z.number().positive().max(5000),
      miktar: z.number().positive().max(100),
    }),
  ),
  gun: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function tanimaRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function planGetir(kullaniciId: string): Promise<Plan> {
    const [kayit] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    return (kayit?.plan as Plan) ?? 'ucretsiz';
  }

  /** Kullanıcının kayıtlı dili; besin veri kümesi buradan seçiliyor. */
  async function kullaniciDili(kullaniciId: string): Promise<string | null> {
    const [kayit] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    return kayit?.locale ?? null;
  }

  async function besinKataloguGetir(yerel: string): Promise<BesinKaydi[]> {
    const kayitlar = await db
      .select({
        id: foods.id,
        ad: foods.name_tr,
        per_100g: foods.per_100g_jsonb,
        porsiyonlar: foods.portions_jsonb,
      })
      .from(foods)
      // Eşleme havuzu kullanıcının veri yereliyle sınırlı: iki dilin besinleri aynı
      // havuzda olsaydı "rice" fotoğrafı Türkçe "pirinç" kaydına eşleşebilirdi.
      .where(eq(foods.locale, yerel))
      .limit(5000);

    return kayitlar as unknown as BesinKaydi[];
  }

  app.post('/tani', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = tanimaSemasi.parse(istek.body);
    const plan = await planGetir(istek.kullaniciId);
    const haklar = planHaklari(plan);

    if (haklar.yemek_tanima_aylik === 0) {
      throw PlanYetersiz(
        'Fotoğraftan yemek tanıma Pro planda. Manuel giriş ve arama her planda sınırsız.',
        'tanima_plan_yetersiz',
      );
    }

    // --- 1. Yerel önbellek: AI çağrısı yok, kota yemez ---
    const parmakIzi = gorselParmakIzi(govde.fotograf);
    const [onbellek] = await db
      .select()
      .from(tanima_onbellegi)
      .where(
        and(
          eq(tanima_onbellegi.user_id, istek.kullaniciId),
          eq(tanima_onbellegi.photo_hash, parmakIzi),
        ),
      )
      .limit(1);

    const katalog = await besinKataloguGetir(veriYereli(await kullaniciDili(istek.kullaniciId)));

    if (onbellek) {
      await db
        .update(tanima_onbellegi)
        .set({ isabet_sayisi: onbellek.isabet_sayisi + 1, son_kullanim: new Date() })
        .where(
          and(
            eq(tanima_onbellegi.user_id, istek.kullaniciId),
            eq(tanima_onbellegi.photo_hash, parmakIzi),
          ),
        );

      await kotaIsaretle(istek.kullaniciId, { onbellekten: true });

      const kalemler = kalemleriEslestir(onbellek.kalemler_jsonb as TanimaKalemi[], katalog);
      return tanimaCevabi({
        parmakIzi,
        kalemler,
        kaynak: 'onbellek',
        kotaDusuldu: false,
        haklar,
        kullanilan: await kotaOku(istek.kullaniciId),
      });
    }

    // --- Kota kontrolü: yalnızca gerçek AI çağrısı öncesi ---
    const kotaDusecek = kotaDusulmeliMi({
      onbellekten: false,
      hataliTanimaTekrari: govde.tekrar_deneme,
    });

    /**
     * Hak model çağrılmadan **önce** rezerve edilir.
     *
     * Eskiden "oku, çağır, artır" sırası vardı; aradaki boşlukta paralel istekler sınırı
     * aşabiliyordu. Fotoğraf tanıma en pahalı iş: kota delinmesi doğrudan marj sızıntısı.
     */
    if (kotaDusecek) {
      const rezerve = await kotaRezerveEt(db, {
        kullaniciId: istek.kullaniciId,
        donem: donemKodu(),
        alan: 'food_photos_used',
        satiriAc: true,
        sinir: haklar.yemek_tanima_aylik,
      });

      if (!rezerve) {
        throw KotaDoldu(
          `Bu ayki fotoğraf tanıma hakkın doldu (${haklar.yemek_tanima_aylik}). ` +
            `${donemBitisi()} tarihinde sıfırlanır. Bu arada manuel giriş ve barkod sınırsız.`,
          'tanima_kotasi_doldu',
          { hak: haklar.yemek_tanima_aylik, yenilenme: donemBitisi() },
        );
      }
    }

    if (!app.aiIstemcisi) {
      throw HataliIstek(
        'Görsel tanıma şu an kullanılamıyor. Yemeği elle arayıp ekleyebilirsin.',
        'ai_kapali',
      );
    }

    // --- 2. Tanıma: kalem listesi + miktar. Kalori DEĞİL. ---
    /**
     * Bütçe burada **ölçülüyor, uygulanmıyor.**
     *
     * Tanıma zaten en ucuz görsel seviyeden yapılıyor; inecek kademe yok. Geriye kalan tek
     * kaldıraç çıktı uzunluğu, ama çıktı bir JSON kalem listesi — kısaltmak listeyi
     * ortasından keser ve ödeme yapan kullanıcıya bozuk sonuç döndürür.
     *
     * Marjı koruma yeri koç sohbeti: orada kısalan şey anlatım, sayı değil.
     */
    const secim = modelSec('yemek_tanima');

    let cevap;
    try {
      cevap = await app.aiIstemcisi.metinUret({
        is: 'yemek_tanima',
        sistem: TANIMA_SISTEM_MESAJI,
        kullanici: JSON.stringify({ fotograf: govde.fotograf }),
        max_cikti_token: secim.max_cikti_token,
      });
    } catch (hata) {
      // Model çağrısı başarısızsa hak geri verilir: kullanıcı bizim hatamızı ödemez.
      if (kotaDusecek) {
        await kotaIadeEt(db, {
          kullaniciId: istek.kullaniciId,
          donem: donemKodu(),
          alan: 'food_photos_used',
        });
      }
      throw hata;
    }

    const cikti = tanimaCiktisiniAyristir(cevap.metin);

    await db.insert(ai_usage).values({
      user_id: istek.kullaniciId,
      is_tipi: 'yemek_tanima',
      model: cevap.model,
      girdi_token: cevap.girdi_token,
      cikti_token: cevap.cikti_token,
      maliyet_usd: String(maliyetHesapla(secim.seviye, cevap)),
      onbellekten: false,
    });

    if (cikti.kalemler.length === 0) {
      // Boş sonuç kullanıcının hatası değil; kota yemez.
      await kotaIsaretle(istek.kullaniciId, { hatali: true });
      throw HataliIstek(
        'Fotoğrafta tanıyabildiğim bir yemek yok. Daha yakından ve daha aydınlık çekebilir ya da ' +
          'elle arayabilirsin. Bu deneme kotandan düşmedi.',
        'tanima_basarisiz',
      );
    }

    // --- 3. Veritabanı eşleme: global düzeltme tablosu önce ---
    const kalemler = await eslemeleriUygula(cikti.kalemler, katalog);

    // --- Önbelleğe yaz: aynı tabak ikinci kez AI çağrısı yapmaz ---
    await db
      .insert(tanima_onbellegi)
      .values({
        user_id: istek.kullaniciId,
        photo_hash: parmakIzi,
        kalemler_jsonb: cikti.kalemler,
      })
      .onConflictDoNothing();

    // Hak yukarıda rezerve edildi; burada yalnızca adalet sayacı işleniyor.
    if (!kotaDusecek) {
      await kotaIsaretle(istek.kullaniciId, { hatali: true });
    }

    const cevapGovdesi = tanimaCevabi({
      parmakIzi,
      kalemler,
      kaynak: 'model',
      kotaDusuldu: kotaDusecek,
      haklar,
      kullanilan: await kotaOku(istek.kullaniciId),
    });

    return cikti.uyari ? { ...cevapGovdesi, model_uyarisi: cikti.uyari } : cevapGovdesi;
  });

  /** 4-5. Kullanıcı doğrulaması ve geri besleme. */
  app.post('/tani/onayla', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = duzeltmeSemasi.parse(istek.body);
    const gun = govde.gun ?? new Date().toISOString().slice(0, 10);

    const katalog = await besinKataloguGetir(veriYereli(await kullaniciDili(istek.kullaniciId)));
    const kayitlar = [];

    for (const kalem of govde.kalemler) {
      const besin = katalog.find((b) => b.id === kalem.food_id);
      if (!besin) throw Bulunamadi(`Besin bulunamadı: ${kalem.ad}`);

      const hesaplanan = besinToplami([
        { ad: kalem.ad, miktar: kalem.miktar, gram: kalem.gram, eslesti: true, besin },
      ]);

      const [kayit] = await db
        .insert(food_logs)
        .values({
          user_id: istek.kullaniciId,
          food_id: kalem.food_id,
          quantity: String(kalem.gram),
          entry_method: 'foto',
          gun,
          photo_hash: govde.photo_hash,
          hesaplanan_jsonb: hesaplanan,
        })
        .returning();

      kayitlar.push(kayit);

      // Geri besleme: düzeltme global eşleme tablosuna yazılır.
      await db
        .insert(tanima_eslemeleri)
        .values({ taninan_ad: turkceNormalize(kalem.ad), food_id: kalem.food_id })
        .onConflictDoUpdate({
          target: [
            tanima_eslemeleri.locale,
            tanima_eslemeleri.taninan_ad,
            tanima_eslemeleri.food_id,
          ],
          set: { onay_sayisi: sql`${tanima_eslemeleri.onay_sayisi} + 1`, updated_at: new Date() },
        });
    }

    return { kayitlar, kayit_sayisi: kayitlar.length };
  });

  /** Kullanıcı başına aylık AI maliyeti (F7.8). Birim ekonomisi en büyük riskimiz. */
  app.get('/maliyet', { preHandler: app.kimlikDogrula }, async (istek) => {
    const donem = donemKodu();
    const [ozet] = await db
      .select({
        toplam_usd: sql<string>`coalesce(sum(${ai_usage.maliyet_usd}), 0)`,
        cagri_sayisi: sql<number>`count(*)`,
        girdi_token: sql<number>`coalesce(sum(${ai_usage.girdi_token}), 0)`,
        cikti_token: sql<number>`coalesce(sum(${ai_usage.cikti_token}), 0)`,
      })
      .from(ai_usage)
      .where(
        and(
          eq(ai_usage.user_id, istek.kullaniciId),
          sql`to_char(${ai_usage.created_at}, 'YYYY-MM') = ${donem}`,
        ),
      );

    const kota = await kotaOku(istek.kullaniciId);
    const butce = butceDurumu({
      plan: await planGetir(istek.kullaniciId),
      harcananUsd: Number(ozet?.toplam_usd ?? 0),
    });

    return {
      donem,
      toplam_usd: Number(ozet?.toplam_usd ?? 0),
      butce_usd: butce.butceUsd,
      kalan_usd: butce.kalanUsd,
      kullanim_yuzdesi: butce.kullanimYuzdesi,
      ucuza_dus: butce.ucuzaDus,
      butce_asildi: butce.asildi,
      hizmet_kesildi: butce.hizmetKesildi,
      cagri_sayisi: Number(ozet?.cagri_sayisi ?? 0),
      girdi_token: Number(ozet?.girdi_token ?? 0),
      cikti_token: Number(ozet?.cikti_token ?? 0),
      onbellek_isabeti: kota.onbellek_isabeti,
      kotadan_dusmeyen_tekrar: kota.hatali_tanima_tekrari,
    };
  });

  app.get('/onbellek', { preHandler: app.kimlikDogrula }, async (istek) => {
    const kayitlar = await db
      .select({
        photo_hash: tanima_onbellegi.photo_hash,
        kalemler: tanima_onbellegi.kalemler_jsonb,
        isabet: tanima_onbellegi.isabet_sayisi,
        son_kullanim: tanima_onbellegi.son_kullanim,
      })
      .from(tanima_onbellegi)
      .where(eq(tanima_onbellegi.user_id, istek.kullaniciId))
      .orderBy(desc(tanima_onbellegi.son_kullanim))
      .limit(50);

    const toplamIsabet = kayitlar.reduce((t, k) => t + k.isabet, 0);

    return {
      kayitlar,
      toplam_isabet: toplamIsabet,
      not: 'Her önbellek isabeti bir AI çağrısı ve bir kota hakkı kurtardı.',
    };
  });

  // -------------------------------------------------------------------------

  async function kotaOku(kullaniciId: string) {
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

  /** Kotadan düşmeyen kullanımları da sayarız: adalet kuralının işlediğini ölçebilmek için. */
  async function kotaIsaretle(
    kullaniciId: string,
    tip: { onbellekten?: boolean; hatali?: boolean },
  ) {
    await kotaOku(kullaniciId);
    const donem = donemKodu();

    await db
      .update(quotas)
      .set(
        tip.onbellekten
          ? { onbellek_isabeti: sql`${quotas.onbellek_isabeti} + 1` }
          : { hatali_tanima_tekrari: sql`${quotas.hatali_tanima_tekrari} + 1` },
      )
      .where(and(eq(quotas.user_id, kullaniciId), eq(quotas.period, donem)));
  }

  /** Global düzeltme tablosu, model çıktısındaki adı doğrudan bir besine bağlayabilir. */
  async function eslemeleriUygula(
    kalemler: TanimaKalemi[],
    katalog: BesinKaydi[],
  ): Promise<EslesmisKalem[]> {
    const sonuc = kalemleriEslestir(kalemler, katalog);

    for (const [i, kalem] of sonuc.entries()) {
      const [esleme] = await db
        .select({ food_id: tanima_eslemeleri.food_id, onay: tanima_eslemeleri.onay_sayisi })
        .from(tanima_eslemeleri)
        .where(eq(tanima_eslemeleri.taninan_ad, turkceNormalize(kalem.ad)))
        .orderBy(desc(tanima_eslemeleri.onay_sayisi))
        .limit(1);

      // İki kullanıcı aynı düzeltmeyi yaptıysa artık kural odur.
      if (esleme && esleme.onay >= 2) {
        const besin = katalog.find((b) => b.id === esleme.food_id);
        if (besin) sonuc[i] = { ...kalem, besin, eslesti: true, skor: 1 };
      }
    }

    return sonuc;
  }
}

interface CevapGirdisi {
  parmakIzi: string;
  kalemler: EslesmisKalem[];
  kaynak: 'onbellek' | 'model';
  kotaDusuldu: boolean;
  haklar: { yemek_tanima_aylik: number };
  kullanilan: { food_photos_used: number };
}

function tanimaCevabi(girdi: CevapGirdisi) {
  return {
    photo_hash: girdi.parmakIzi,
    kaynak: girdi.kaynak,
    kalemler: girdi.kalemler.map((k) => ({
      ad: k.ad,
      miktar: k.miktar,
      gram: k.gram,
      eslesti: k.eslesti,
      besin: k.besin ? { id: k.besin.id, ad: k.besin.ad } : null,
      skor: k.skor ?? null,
    })),
    toplam: besinToplami(girdi.kalemler),
    kota: {
      dusuldu: girdi.kotaDusuldu,
      kalan: Math.max(0, girdi.haklar.yemek_tanima_aylik - girdi.kullanilan.food_photos_used),
      toplam: girdi.haklar.yemek_tanima_aylik,
      not: girdi.kotaDusuldu
        ? null
        : girdi.kaynak === 'onbellek'
          ? 'Bu tanıma önbellekten geldi, kotandan düşmedi.'
          : 'Bu deneme kotandan düşmedi.',
    },
    /** Kullanıcı doğrulaması bekleniyor: onaylanana kadar hiçbir şey kaydedilmez. */
    onay_bekliyor: true,
  };
}
