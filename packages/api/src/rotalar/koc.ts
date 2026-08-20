import { and, desc, eq, sql } from 'drizzle-orm';
import { aramaAnahtari, dilCozumle, KATLANAN, KATLANMIS } from '@made2fit/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ARAC_TANIMLARI,
  baglamKur,
  hareketAdaGoreBul,
  kocSistemMesaji,
  maliyetHesapla,
  modelSec,
  profilOzeti,
  sinirKontrolu,
  type KocMesaji,
} from '@made2fit/core';
import type { Profil } from '@made2fit/shared';
import { HataliIstek, KotaDoldu, PlanYetersiz } from '../hatalar';
import {
  ai_usage,
  coach_messages,
  food_logs,
  foods,
  profiles,
  progression_state,
  quotas,
  sessions,
  subscriptions,
  users,
  weight_logs,
} from '../db/sema';
import { planHaklari, type Plan } from '../servisler/haklar';
import { donemBitisi, donemKodu } from './abonelik';
import { kotaIadeEt, kotaRezerveEt } from '../servisler/kotaRezerve';
import { butceDurumu, ucuzaDusur } from '@made2fit/core';

/**
 * AI koç sohbeti (F9).
 *
 * Üç katmanlı koruma:
 *  1. Sınır kontrolü — istek modele ulaşmadan kesilir (tanı, doz, aşırı hedef, kapsam, ED sayı).
 *  2. Bellek stratejisi — kalıcı özet + son 10 mesaj; token maliyeti konuşma uzadıkça sabit.
 *  3. Araç katmanı — koç genel cevap vermez, kullanıcının kendi verisine bakar.
 */

const mesajSemasi = z.object({
  mesaj: z.string().min(1).max(1000),
});

export async function kocRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function planGetir(kullaniciId: string): Promise<Plan> {
    const [kayit] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    return (kayit?.plan as Plan) ?? 'ucretsiz';
  }

  app.get('/araclar', { preHandler: app.kimlikDogrula }, async () => ({ araclar: ARAC_TANIMLARI }));

  app.get('/gecmis', { preHandler: app.kimlikDogrula }, async (istek) => {
    const kayitlar = await db
      .select({
        id: coach_messages.id,
        role: coach_messages.role,
        content: coach_messages.content,
        created_at: coach_messages.created_at,
      })
      .from(coach_messages)
      .where(eq(coach_messages.user_id, istek.kullaniciId))
      .orderBy(desc(coach_messages.created_at))
      .limit(50);

    return { mesajlar: kayitlar.reverse() };
  });

  app.post('/mesaj', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { mesaj } = mesajSemasi.parse(istek.body);

    const plan = await planGetir(istek.kullaniciId);
    const haklar = planHaklari(plan);

    if (haklar.koc_mesaji_aylik === 0) {
      throw PlanYetersiz(
        'Koç sohbeti Temel plandan itibaren açık. Programın ve gerekçeleri her planda tam.',
        'koc_plan_yetersiz',
      );
    }

    const [kullanici] = await db
      .select({ ed: users.ed_mode, edAcik: users.ed_sayilar_acik })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);
    const edModu = (kullanici?.ed ?? false) && !(kullanici?.edAcik ?? false);

    // --- 1. Sınır kontrolü: model çağrılmadan önce ---
    const sinir = sinirKontrolu(mesaj, { edModu });
    if (!sinir.izin) {
      await mesajKaydet(istek.kullaniciId, 'user', mesaj);
      await mesajKaydet(istek.kullaniciId, 'assistant', sinir.cevap);

      // Sınıra takılan mesaj kotadan düşmez: model çağrılmadı, maliyeti sıfır.
      return {
        cevap: sinir.cevap,
        kaynak: 'sinir',
        kategori: sinir.kategori,
        kota_dusuldu: false,
      };
    }

    const [profilKaydi] = await db
      .select({ profil: profiles.profil_jsonb })
      .from(profiles)
      .where(eq(profiles.user_id, istek.kullaniciId))
      .limit(1);

    if (!profilKaydi) {
      throw HataliIstek(
        'Koç senin verine bakarak konuşuyor. Önce değerlendirmeyi tamamlaman gerekiyor.',
        'profil_yok',
      );
    }

    const profil = profilKaydi.profil as Profil;
    const ozet = profilOzeti(profil);

    // --- 3. Araç katmanı: mesaja göre ilgili veriyi önden çek ---
    const aracVerisi = await aracVerisiTopla(istek.kullaniciId, mesaj, edModu);

    const gecmis = await gecmisOku(istek.kullaniciId);
    const baglam = baglamKur({ ozet, gecmis, aracVerisi });

    if (!app.aiIstemcisi) {
      const yedek =
        'Koç şu an kullanılamıyor. Programın ve gerekçeleri açık; hareket detayından her ' +
        'hareketin neden orada olduğunu okuyabilirsin.';
      await mesajKaydet(istek.kullaniciId, 'user', mesaj);
      await mesajKaydet(istek.kullaniciId, 'assistant', yedek);
      return { cevap: yedek, kaynak: 'yedek', kota_dusuldu: false };
    }

    /**
     * Hak model çağrılmadan **önce** rezerve edilir.
     *
     * Eskiden "oku, çağır, artır" sırası vardı; okuma ile artırma arasındaki boşlukta
     * paralel istekler sınırı aşabiliyordu. Kota delinmesi doğrudan marj sızıntısı.
     */
    const rezerve = await kotaRezerveEt(db, {
      kullaniciId: istek.kullaniciId,
      donem: donemKodu(),
      alan: 'coach_messages_used',
      satiriAc: true,
      sinir: haklar.koc_mesaji_aylik,
    });

    if (!rezerve) {
      throw KotaDoldu(
        `Bu ayki koç mesajı hakkın doldu (${haklar.koc_mesaji_aylik}). ` +
          `${donemBitisi()} tarihinde sıfırlanır.`,
        'koc_kotasi_doldu',
        { hak: haklar.koc_mesaji_aylik, yenilenme: donemBitisi() },
      );
    }

    /**
     * Bütçe kontrolü: kota çağrı sayısını sınırlıyor, maliyeti değil.
     * Eşiğe yaklaşan kullanıcı ucuz seviyeye düşer — hesap değişmez, anlatım sadeleşir.
     */
    const butce = butceDurumu({
      plan: plan as 'ucretsiz' | 'temel' | 'pro',
      harcananUsd: await aylikHarcama(istek.kullaniciId),
    });

    const secim = butce.ucuzaDus ? ucuzaDusur(modelSec('koc_sohbeti')) : modelSec('koc_sohbeti');

    const [dilKaydi] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);
    const dil = dilCozumle(dilKaydi?.locale);

    let cevap;
    try {
      cevap = await app.aiIstemcisi.metinUret({
        is: 'koc_sohbeti',
        // Koç kullanıcının dilinde konuşur; sert sınırlar iki dilde de aynı.
        sistem: kocSistemMesaji({ ozet, edModu, dil }),
        kullanici: [
          ...baglam.mesajlar.map((m) => `${m.role}: ${m.content}`),
          `user: ${mesaj}`,
        ].join('\n'),
        max_cikti_token: secim.max_cikti_token,
      });
    } catch (hata) {
      // Model çağrısı başarısızsa hak geri verilir: kullanıcı bizim hatamızı ödemez.
      await kotaIadeEt(db, {
        kullaniciId: istek.kullaniciId,
        donem: donemKodu(),
        alan: 'coach_messages_used',
      });
      throw hata;
    }

    // ED modunda modelin sayı sızdırmasına karşı son kontrol.
    const temizCevap = edModu ? sayilariTemizle(cevap.metin) : cevap.metin;

    await mesajKaydet(istek.kullaniciId, 'user', mesaj);
    await mesajKaydet(istek.kullaniciId, 'assistant', temizCevap, Object.keys(aracVerisi));

    await db.insert(ai_usage).values({
      user_id: istek.kullaniciId,
      is_tipi: 'koc_sohbeti',
      model: cevap.model,
      girdi_token: cevap.girdi_token,
      cikti_token: cevap.cikti_token,
      maliyet_usd: String(maliyetHesapla(secim.seviye, cevap)),
    });

    return {
      cevap: temizCevap,
      kaynak: 'model',
      kullanilan_araclar: Object.keys(aracVerisi),
      kota_dusuldu: true,
      kalan: haklar.koc_mesaji_aylik - (await kotaOku(istek.kullaniciId)).coach_messages_used,
      butce_asildi: butce.asildi,
      tahmini_token: baglam.tahmini_token,
    };
  });

  // -------------------------------------------------------------------------

  /** Bu dönemdeki toplam AI harcaması (USD). */
  async function aylikHarcama(kullaniciId: string): Promise<number> {
    const [kayit] = await db
      .select({ toplam: sql<string>`coalesce(sum(${ai_usage.maliyet_usd}), 0)` })
      .from(ai_usage)
      .where(
        and(
          eq(ai_usage.user_id, kullaniciId),
          sql`to_char(${ai_usage.created_at}, 'YYYY-MM') = ${donemKodu()}`,
        ),
      );

    return Number(kayit?.toplam ?? 0);
  }

  async function mesajKaydet(
    kullaniciId: string,
    role: 'user' | 'assistant',
    content: string,
    araclar: string[] = [],
  ) {
    await db.insert(coach_messages).values({
      user_id: kullaniciId,
      role,
      content,
      tools_called: araclar,
    });
  }

  async function gecmisOku(kullaniciId: string): Promise<KocMesaji[]> {
    const kayitlar = await db
      .select({ role: coach_messages.role, content: coach_messages.content })
      .from(coach_messages)
      .where(eq(coach_messages.user_id, kullaniciId))
      .orderBy(desc(coach_messages.created_at))
      .limit(10);

    return kayitlar
      .reverse()
      .map((k) => ({ role: k.role === 'user' ? 'user' : 'assistant', content: k.content }));
  }

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

    return yeni ?? { coach_messages_used: 0, food_photos_used: 0 };
  }

  /**
   * Mesaja göre ilgili aracı çalıştırır.
   *
   * Model araç seçimini kendisi yapmıyor; anahtar kelimeye göre önden çekiyoruz.
   * Bunun iki nedeni var: bir tur daha model çağrısı maliyeti eklemiyor ve modelin
   * "profil_getir" yerine uydurma cevap vermesi mümkün olmuyor.
   */
  async function aracVerisiTopla(
    kullaniciId: string,
    mesaj: string,
    edModu: boolean,
  ): Promise<Record<string, unknown>> {
    const kucuk = mesaj.toLocaleLowerCase('tr-TR');

    /**
     * Niyet tespiti **katlanmış** metin üzerinde yapılıyor.
     *
     * Kullanıcı "yogurt kac kalori" yazdığında niyeti aynı; şapkasız yazdı diye soruyu
     * anlamamış gibi davranmak, veritabanında kayıt varken bilmiyormuş gibi cevap vermek
     * olurdu. Aramayı katlayıp tetiği katlamamak, sorunu yarısında bırakmak olurdu.
     */
    const katlanmisMetin = aramaAnahtari(kucuk);
    const veri: Record<string, unknown> = {};

    if (/antrenman|seans|program|hareket|set|tekrar|ağırlık|takıl/.test(kucuk)) {
      const seanslar = await db
        .select({
          gun_tipi: sessions.gun_tipi,
          status: sessions.status,
          feedback_at: sessions.feedback_at,
        })
        .from(sessions)
        .where(eq(sessions.user_id, kullaniciId))
        .orderBy(desc(sessions.created_at))
        .limit(10);

      const ilerleme = await db
        .select({
          hareket: progression_state.exercise_id,
          kg: progression_state.current_weight,
          tekrar: progression_state.current_reps,
          ustuste_zorlanma: progression_state.consecutive_struggle,
        })
        .from(progression_state)
        .where(eq(progression_state.user_id, kullaniciId))
        .limit(20);

      veri.antrenman_gecmisi = { seanslar, ilerleme };
    }

    if (!edModu && /kalori|makro|protein|beslenme|yemek|öğün|kilo/.test(kucuk)) {
      const [ozet] = await db
        .select({
          gun_sayisi: sql<number>`count(distinct ${food_logs.gun})`,
          ortalama_kalori: sql<number>`coalesce(avg((${food_logs.hesaplanan_jsonb}->>'kalori')::numeric), 0)`,
        })
        .from(food_logs)
        .where(eq(food_logs.user_id, kullaniciId));

      const kilolar = await db
        .select({ gun: weight_logs.gun, kilo: weight_logs.kilo_kg })
        .from(weight_logs)
        .where(eq(weight_logs.user_id, kullaniciId))
        .orderBy(desc(weight_logs.gun))
        .limit(14);

      veri.beslenme_gecmisi = {
        gun_sayisi: Number(ozet?.gun_sayisi ?? 0),
        ortalama_kalori: Math.round(Number(ozet?.ortalama_kalori ?? 0)),
      };
      veri.olcum_gecmisi = { kilolar };
    }

    /**
     * Hareket adı geçiyorsa teknik bilgisi de bağlama girer.
     *
     * İlk hâli adı tireleyip `hareketBul` ile **kimlik** olarak arıyordu; katalog
     * kimlikleri İngilizce slug olduğu için ("ab-wheel") bu arama hiçbir zaman tutmuyordu.
     * Araç yazılıydı ama hiç çalışmıyordu — koç, kataloğu görmeden cevap veriyordu.
     */
    const hareketEslesmesi = HAREKET_KALIBI.exec(katlanmisMetin);
    if (hareketEslesmesi?.[1]) {
      const yakalanan = hareketEslesmesi[1].trim();
      // İki sözcük tutmazsa son sözcüğü dene: "mekik hareketi" ile "dumbbell press" bir
      // arada çalışsın. Kısmi eşleşme yok; tutmazsa araç hiç eklenmez.
      const hareket =
        hareketAdaGoreBul(yakalanan) ?? hareketAdaGoreBul(yakalanan.split(' ').slice(-1)[0]!);
      if (hareket) {
        veri.hareket_bilgisi = {
          ad: hareket.ad_tr,
          talimat: hareket.talimat_tr,
          kaslar: hareket.birincil_kas,
          muadiller: hareket.alternatifler,
        };
      }
    }

    if (/besin|kac kalori|icinde ne var/.test(katlanmisMetin) && !edModu) {
      const sorgu = besinSorgusu(katlanmisMetin);
      if (sorgu.length > 2) {
        const sonuclar = await db
          .select({ ad: foods.name_tr, per_100g: foods.per_100g_jsonb })
          .from(foods)
          // Şapkasız yazan kullanıcıyı da bulur; katlama shared/arama.ts ile ortak.
          .where(
            sql`lower(translate(${foods.name_tr}, ${KATLANAN}, ${KATLANMIS})) like ${'%' + sorgu + '%'}`,
          )
          .limit(3);
        if (sonuclar.length > 0) veri.besin_ara = sonuclar;
      }
    }

    return veri;
  }
}

/**
 * Soru cümlesinden aranacak yemeği çıkarır.
 *
 * İlk hâli son iki sözcüğü alıyordu; "yoğurt kaç kalori" cümlesinde bu **"kac kalori"**
 * demek, yani soruyu değil sorunun kendisini aramak. En doğal Türkçe dizilim yemeği başa
 * koyuyor, İngilizce alışkanlığıyla yazılmış kural onu tersten okuyordu.
 *
 * Doğrusu konumdan değil anlamdan gitmek: soru kalıbını atıp geriye kalanı aramak.
 */
const SORU_SOZCUKLERI = new Set([
  'besin',
  'degeri',
  'kac',
  'kacdir',
  'kalori',
  'kalorisi',
  'protein',
  'proteini',
  'icinde',
  'ne',
  'var',
  'bir',
  'gram',
  'porsiyon',
  'yuz',
  'bu',
  'nedir',
  'ise',
  'mi',
  'midir',
  'yani',
  'acaba',
]);

export function besinSorgusu(katlanmisMetin: string): string {
  return katlanmisMetin
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((sozcuk) => sozcuk.length > 2 && !SORU_SOZCUKLERI.has(sozcuk))
    .slice(-2)
    .join(' ');
}

/**
 * Hareket sorusu kalıbı.
 *
 * Yakalanan ad, kalıbın kendi anahtar sözcüklerini **içeremez**: negatif ileri bakış
 * olmadan "mekik hareketi nasil yapilir" cümlesinde ad olarak "mekik hareketi" yakalanıyor
 * ve katalogda böyle bir hareket olmadığı için arama boşa düşüyordu.
 */
const HAREKET_KALIBI =
  /((?!hareketi|nasil|yapilir)[a-z-]+(?:\s+(?!hareketi|nasil|yapilir)[a-z-]+)?)\s+(?:hareketi|nasil yapilir)/;

/** ED modunda modelin cevabından kaçan sayıları temizler — son savunma hattı. */
export function sayilariTemizle(metin: string): string {
  return metin
    .replace(/\b\d+([.,]\d+)?\s*(kcal|kalori|kg|gram|g|%)\b/gi, 'ölçülü bir miktar')
    .replace(/\b\d+([.,]\d+)?\b/g, 'birkaç');
}
