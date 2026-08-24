import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { aramaAnahtari, KATLANAN, KATLANMIS, veriYereli } from '@swiip/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { beslenmeHedefiHesapla, porsiyonRehberi, tdeeDuzelt } from '@swiip/core';
import type { Profil } from '@swiip/shared';
import { Bulunamadi, HataliIstek } from '../hatalar';
import { food_logs, foods, profiles, subscriptions, users, weight_logs } from '../db/sema';
import { planHaklari, type Plan } from '../servisler/haklar';
import { planGecerliMi } from '../servisler/planOku';

/**
 * Beslenme çekirdeği (F5).
 *
 * "Aynı yemek her zaman aynı makro": besin değeri veritabanından gelir, modelden değil.
 * Toplam = miktar × bileşim. Bu çarpım dışında hiçbir yerde kalori üretilmez.
 */

const kayitSemasi = z.object({
  food_id: z.string().uuid(),
  miktar: z.number().positive().max(10_000),
  /** Porsiyon id'si verilirse miktar o porsiyonun katıdır; verilmezse gram. */
  portion_id: z.string().optional(),
  ogun: z.enum(['kahvalti', 'ogle', 'aksam', 'ara']).optional(),
  gun: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  entry_method: z.enum(['manuel', 'barkod', 'foto', 'onbellek', 'tarif']).default('manuel'),
});

interface BesinDegeri {
  kalori: number;
  protein_g: number;
  yag_g: number;
  karbonhidrat_g: number;
  lif_g?: number;
}

interface Porsiyon {
  id: string;
  ad: string;
  gram: number;
}

export async function beslenmeRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function profiliGetir(kullaniciId: string): Promise<Profil> {
    const [kayit] = await db
      .select({ profil: profiles.profil_jsonb })
      .from(profiles)
      .where(eq(profiles.user_id, kullaniciId))
      .limit(1);
    if (!kayit) throw HataliIstek('Önce değerlendirmeyi tamamla.', 'profil_yok');
    return kayit.profil as Profil;
  }

  /**
   * Sayılar bu kullanıcıdan gizli mi?
   *
   * Tek yerde: kural iki uçta iki kez yazılırsa üçüncü uçta unutulur.
   */
  async function sayilarGizliMi(kullaniciId: string): Promise<boolean> {
    const [kullanici] = await db
      .select({ ed: users.ed_mode, edAcik: users.ed_sayilar_acik })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    return (kullanici?.ed ?? false) && !(kullanici?.edAcik ?? false);
  }

  /**
   * Kullanıcının göreceği besin veri kümesi.
   *
   * `veriYereli` tek karar noktası: veri kümesi olmayan dil Türkçeye düşüyor ve bu
   * bilinçli — İngilizce kullanıcıya boş bir besin veritabanı vermek, uygulamayı onun
   * için çalışmaz hâle getirirdi. Ayarlardaki dil notu bunu söylüyor.
   */
  async function besinYereli(kullaniciId: string): Promise<string> {
    const [kayit] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    return veriYereli(kayit?.locale);
  }

  /** Kullanıcının planı; kaydı yoksa ücretsiz. */
  async function planGetir(kullaniciId: string): Promise<Plan> {
    const [kayit] = await db
      .select({ plan: subscriptions.plan, yenilenme: subscriptions.renews_at })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    if (!kayit || !planGecerliMi(kayit.yenilenme)) return 'ucretsiz';
    return (kayit.plan as Plan) ?? 'ucretsiz';
  }

  app.get('/hedef', { preHandler: app.kimlikDogrula }, async (istek) => {
    const profil = await profiliGetir(istek.kullaniciId);

    const [kayit] = await db
      .select({ duzeltilmis: profiles.tdee_corrected })
      .from(profiles)
      .where(eq(profiles.user_id, istek.kullaniciId))
      .limit(1);

    const hedef = beslenmeHedefiHesapla(profil);

    // TDEE düzeltilmişse hedef gerçek veriye göre yeniden hesaplanır.
    const duzeltilmis = kayit?.duzeltilmis;
    const nihai =
      duzeltilmis && duzeltilmis > 0
        ? { ...hedef, tdee: duzeltilmis, kalori: hedef.kalori + (duzeltilmis - hedef.tdee) }
        : hedef;

    /**
     * ED kapısı sayıları varsayılan olarak kapatır ama **kullanıcı açabilir** — ayarlarda
     * söz verdiğimiz şey bu. Yalnızca `ed_modu` bakmak o anahtarı etkisiz bırakıyordu.
     *
     * Alan adı `/gun` ucuyla aynı: `sayilar_gizli`. İki uçta iki farklı ad, unutulan
     * bir kontrolü davet eder.
     */
    const sayilarGizli = await sayilarGizliMi(istek.kullaniciId);

    if (sayilarGizli) {
      return { ed_modu: true, sayilar_gizli: true, porsiyon_rehberi: porsiyonRehberi(nihai) };
    }

    /**
     * Günlük kalori ve makro hedefi ücretli katman (spec bölüm 13 tablosu). Ücretsiz
     * kullanıcı bakım kalorisini vücut analizi raporunda **bir kez** görüyor; buradaki
     * günlük hedef ve makro dağılımı Temel'den itibaren açılıyor.
     *
     * Kilit **manuel girişi kapatmıyor**: ücretsizin çekirdek vaadi o. Kullanıcı yemeğini
     * kaydeder ve toplamını görür; yalnızca "hedefe göre neredeyim" katmanı kilitli.
     *
     * Bu kural hak tablosunda yazılıydı ama hiçbir yerde okunmuyordu — paywall ekranı
     * özelliği ücretli diye satarken API onu herkese veriyordu.
     *
     * **Sıra bilinçli:** önce profil, sonra ED kapısı, en sonda plan. Değerlendirmesini
     * bitirmemiş kullanıcıya "yükselt" demek yanlış yönlendirme olurdu; ED kapısı ise bir
     * sağlık kapısı ve hiçbir ödeme kararının arkasında kalamaz.
     */
    const haklar = planHaklari(await planGetir(istek.kullaniciId));

    /**
     * Beslenme ekranındaki kısayolların hangileri kilitli.
     *
     * Ekran altı kısayol gösteriyor ve üçü ücretli. Hepsi aynı görünüyordu: ücretsiz
     * kullanıcı "Haftalık plan"a basıyor ve duvara çarpıyordu. Kilidi önceden söylemek
     * baskı değil, dürüstlük — dokunmadan önce ne olacağını bilmek.
     *
     * Hak tablosundan okunuyor, `hedef_kilidi`nden türetilmiyor: ikisi farklı haklar ve
     * bir gün ayrışabilirler.
     */
    const kilitler = {
      ogun_plani: !haklar.ogun_plani,
      kaydirmali_ogun: !haklar.kaydirmali_ogun,
    };

    if (!haklar.kalori_makro_hedefi) {
      return {
        ed_modu: profil.ed_modu,
        sayilar_gizli: false,
        hedef_kilidi: true,
        kilitler,
        kod: 'plan_yetersiz',
        mesaj:
          'Günlük kalori ve makro hedefi Temel plandan itibaren açık. Yemek kaydın ' +
          'ücretsiz ve sınırsız çalışmaya devam ediyor.',
      };
    }

    return { ed_modu: profil.ed_modu, sayilar_gizli: false, hedef: nihai, kilitler };
  });

  app.get('/besin/ara', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { q, limit } = z
      .object({ q: z.string().min(2).max(60), limit: z.coerce.number().min(1).max(50).default(20) })
      .parse(istek.query);

    const sonuclar = await db
      .select({
        id: foods.id,
        name_tr: foods.name_tr,
        per_100g: foods.per_100g_jsonb,
        portions: foods.portions_jsonb,
        source: foods.source,
        verified: foods.verified,
      })
      .from(foods)
      // Şapkasız yazan kullanıcıyı da bulur: iki taraf da aynı şekilde katlanıyor.
      // Sıra önemli — önce harf eşlemesi, sonra küçültme (bkz. shared/arama.ts).
      //
      // Yerel filtresi: `foods.locale` sütunu ve `(locale, name_tr)` indeksi başından
      // beri vardı ama hiçbir sorgu okumuyordu. İkinci pazarın verisi eklendiği an
      // iki dilin besinleri aynı sonuç listesinde karışırdı.
      .where(
        and(
          eq(foods.locale, await besinYereli(istek.kullaniciId)),
          sql`lower(translate(${foods.name_tr}, ${KATLANAN}, ${KATLANMIS})) like ${'%' + aramaAnahtari(q) + '%'}`,
        ),
      )
      .orderBy(desc(foods.verified))
      .limit(limit);

    return { sonuclar };
  });

  /**
   * Barkod arama (F5.5, F5.9).
   *
   * Önce yerel veritabanı; yoksa Open Food Facts. OFF'tan gelen kayıt yerele yazılır,
   * böylece ikinci kullanıcı ağa hiç çıkmaz ve çevrimdışıyken de bulur.
   *
   * OFF kaydı `verified: false` ile yazılır: insan gözünden geçmedi. Arama sonuçları
   * doğrulanmış kayıtları öne alır; bu sıralama bozulmaz.
   */
  app.get('/besin/barkod/:barkod', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { barkod } = z.object({ barkod: z.string().min(6).max(20) }).parse(istek.params);

    const [yerel] = await db.select().from(foods).where(eq(foods.barcode, barkod)).limit(1);
    if (yerel) return { ...yerel, kaynak: 'yerel' };

    const ithal = await app.barkodSaglayici.ara(barkod);
    if (!ithal)
      throw Bulunamadi('Bu barkod veritabanımızda yok. Elle ekleyebilirsin.', 'barkod_yok');

    const [yazilan] = await db
      .insert(foods)
      .values({
        name_tr: ithal.name_tr,
        name_en: ithal.name_en,
        per_100g_jsonb: ithal.per_100g,
        portions_jsonb: ithal.portions,
        barcode: ithal.barcode,
        brand: ithal.brand,
        source: ithal.source,
        verified: false,
      })
      .returning();

    return { ...yazilan!, kaynak: 'openfoodfacts' };
  });

  app.post('/kayit', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = kayitSemasi.parse(istek.body);

    const [besin] = await db.select().from(foods).where(eq(foods.id, govde.food_id)).limit(1);
    if (!besin) throw Bulunamadi('Besin bulunamadı.', 'besin_yok');

    const hesaplanan = besinHesapla(
      besin.per_100g_jsonb as BesinDegeri,
      besin.portions_jsonb as Porsiyon[],
      govde.miktar,
      govde.portion_id,
    );

    const [kayit] = await db
      .insert(food_logs)
      .values({
        user_id: istek.kullaniciId,
        food_id: govde.food_id,
        quantity: String(govde.miktar),
        entry_method: govde.entry_method,
        gun: govde.gun ?? bugunISO(),
        hesaplanan_jsonb: hesaplanan,
        ...(govde.portion_id ? { portion_id: govde.portion_id } : {}),
        ...(govde.ogun ? { ogun: govde.ogun } : {}),
      })
      .returning();

    return { kayit, hesaplanan };
  });

  app.get('/gun/:gun', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { gun } = z.object({ gun: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(istek.params);

    /**
     * Besin ADI da dönüyor.
     *
     * Dönmüyordu. Arayüz "Bugün yediklerin" listesinde `{kayit.quantity}
     * {kayit.portion_id ?? 'g'}` basıyor ve elinde başka bir şey yoktu; kullanıcı
     * gününe baktığında "100 g", "2 kase" gibi satırlar görüyor, NE YEDİĞİNİ
     * göremiyordu. Ücretsiz katmanın teslim ettiği üç şeyden biri manuel kalori
     * girişi; okunamayan bir günlük o özelliği yok hükmünde bırakıyor.
     *
     * `leftJoin`: `food_id` boş olabilen bir kayıt (elle girilen serbest kalem)
     * listeden düşmemeli.
     */
    const kayitlar = await db
      .select({
        id: food_logs.id,
        food_id: food_logs.food_id,
        ad: foods.name_tr,
        ad_en: foods.name_en,
        marka: foods.brand,
        porsiyonlar: foods.portions_jsonb,
        quantity: food_logs.quantity,
        portion_id: food_logs.portion_id,
        ogun: food_logs.ogun,
        entry_method: food_logs.entry_method,
        hesaplanan: food_logs.hesaplanan_jsonb,
        logged_at: food_logs.logged_at,
      })
      .from(food_logs)
      .leftJoin(foods, eq(foods.id, food_logs.food_id))
      .where(and(eq(food_logs.user_id, istek.kullaniciId), eq(food_logs.gun, gun)))
      .orderBy(food_logs.logged_at);

    const toplam = kayitlar.reduce<BesinDegeri>(
      (t, k) => {
        const h = k.hesaplanan as BesinDegeri;
        return {
          kalori: t.kalori + (h.kalori ?? 0),
          protein_g: t.protein_g + (h.protein_g ?? 0),
          yag_g: t.yag_g + (h.yag_g ?? 0),
          karbonhidrat_g: t.karbonhidrat_g + (h.karbonhidrat_g ?? 0),
          lif_g: (t.lif_g ?? 0) + (h.lif_g ?? 0),
        };
      },
      { kalori: 0, protein_g: 0, yag_g: 0, karbonhidrat_g: 0, lif_g: 0 },
    );

    const sayilarGizli = await sayilarGizliMi(istek.kullaniciId);

    /**
     * `portion_id` bir katalog anahtarı; kullanıcıya gösterilecek metin değil.
     *
     * Arayüz onu doğrudan basıyordu ve kullanıcı "2 kase-orta" gibi satırlar
     * görüyordu. Görünen adı burada çözüyoruz — istemcinin katalog bilmesi gerekmesin.
     */
    const gorunurKayitlar = kayitlar.map(({ porsiyonlar, ...kayit }) => {
      const liste = (porsiyonlar ?? []) as Porsiyon[];
      const secilen = kayit.portion_id ? liste.find((x) => x.id === kayit.portion_id) : undefined;
      return { ...kayit, porsiyon_adi: secilen?.ad ?? null };
    });

    return {
      gun,
      kayitlar: gorunurKayitlar,
      toplam: sayilarGizli ? null : yuvarlaBesin(toplam),
      sayilar_gizli: sayilarGizli,
      ogun_sayisi: kayitlar.length,
    };
  });

  app.delete('/kayit/:id', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(istek.params);

    await db
      .delete(food_logs)
      .where(and(eq(food_logs.id, id), eq(food_logs.user_id, istek.kullaniciId)));

    return { durum: 'silindi' };
  });

  app.post('/kilo', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = z
      .object({
        kilo_kg: z.number().min(30).max(300),
        gun: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        olculer: z.record(z.string(), z.number()).optional(),
      })
      .parse(istek.body);

    const gun = govde.gun ?? bugunISO();

    await db
      .insert(weight_logs)
      .values({
        user_id: istek.kullaniciId,
        gun,
        kilo_kg: govde.kilo_kg,
        olculer_jsonb: govde.olculer ?? {},
      })
      .onConflictDoUpdate({
        target: [weight_logs.user_id, weight_logs.gun],
        set: { kilo_kg: govde.kilo_kg, olculer_jsonb: govde.olculer ?? {} },
      });

    return { durum: 'kaydedildi', gun };
  });

  /**
   * TDEE uyum döngüsü (F5.2): iki haftada bir gerçek kilo değişimiyle düzeltme.
   * "Kalori hesabı tutmuyor" şikâyetinin panzehiri.
   */
  app.post('/tdee-uyumla', { preHandler: app.kimlikDogrula }, async (istek) => {
    const profil = await profiliGetir(istek.kullaniciId);
    const hedef = beslenmeHedefiHesapla(profil);

    const iki_hafta_once = new Date();
    iki_hafta_once.setDate(iki_hafta_once.getDate() - 14);
    const baslangic = iki_hafta_once.toISOString().slice(0, 10);

    const kilolar = await db
      .select()
      .from(weight_logs)
      .where(and(eq(weight_logs.user_id, istek.kullaniciId), gte(weight_logs.gun, baslangic)))
      .orderBy(weight_logs.gun);

    if (kilolar.length < 2) {
      return {
        duzeltildi: false,
        mesaj: 'Düzeltme için en az iki haftalık kilo verisi gerekiyor.',
      };
    }

    const ilk = kilolar[0]!;
    const son = kilolar[kilolar.length - 1]!;
    const gunSayisi = Math.max(
      1,
      Math.round((Date.parse(son.gun) - Date.parse(ilk.gun)) / 86_400_000),
    );

    const [alim] = await db
      .select({
        ortalama: sql<number>`coalesce(avg((${food_logs.hesaplanan_jsonb}->>'kalori')::numeric), 0)`,
        gun_sayisi: sql<number>`count(distinct ${food_logs.gun})`,
      })
      .from(food_logs)
      .where(and(eq(food_logs.user_id, istek.kullaniciId), gte(food_logs.gun, baslangic)));

    const gunlukToplam = await db
      .select({
        gun: food_logs.gun,
        toplam: sql<number>`sum((${food_logs.hesaplanan_jsonb}->>'kalori')::numeric)`,
      })
      .from(food_logs)
      .where(and(eq(food_logs.user_id, istek.kullaniciId), gte(food_logs.gun, baslangic)))
      .groupBy(food_logs.gun);

    if (gunlukToplam.length < 10) {
      return {
        duzeltildi: false,
        mesaj:
          'Düzeltme için son iki haftada en az 10 günlük beslenme kaydı gerekiyor. ' +
          `Şu an ${gunlukToplam.length} gün var.`,
      };
    }

    const ortalamaAlim =
      gunlukToplam.reduce((t, g) => t + Number(g.toplam ?? 0), 0) / gunlukToplam.length;

    const sonuc = tdeeDuzelt({
      mevcutTdee: hedef.tdee,
      ortalamaAlim,
      kiloDegisimiKg: son.kilo_kg - ilk.kilo_kg,
      gunSayisi,
    });

    if (sonuc.duzeltildi) {
      await db
        .update(profiles)
        .set({ tdee_corrected: sonuc.tdee, tdee_corrected_at: new Date() })
        .where(eq(profiles.user_id, istek.kullaniciId));
    }

    return {
      ...sonuc,
      ortalama_alim: Math.round(ortalamaAlim),
      veri_gunu: gunlukToplam.length,
      alim,
    };
  });
}

/** Toplam = miktar × bileşim. Tek hesap yolu budur; başka yerde kalori üretilmez. */
export function besinHesapla(
  per100g: BesinDegeri,
  porsiyonlar: Porsiyon[],
  miktar: number,
  porsiyonId?: string,
): BesinDegeri {
  const gram = porsiyonId
    ? (porsiyonlar.find((p) => p.id === porsiyonId)?.gram ?? 100) * miktar
    : miktar;

  const oran = gram / 100;
  return yuvarlaBesin({
    kalori: (per100g.kalori ?? 0) * oran,
    protein_g: (per100g.protein_g ?? 0) * oran,
    yag_g: (per100g.yag_g ?? 0) * oran,
    karbonhidrat_g: (per100g.karbonhidrat_g ?? 0) * oran,
    lif_g: (per100g.lif_g ?? 0) * oran,
  });
}

function yuvarlaBesin(deger: BesinDegeri): BesinDegeri {
  return {
    kalori: Math.round(deger.kalori),
    protein_g: Math.round(deger.protein_g * 10) / 10,
    yag_g: Math.round(deger.yag_g * 10) / 10,
    karbonhidrat_g: Math.round(deger.karbonhidrat_g * 10) / 10,
    lif_g: Math.round((deger.lif_g ?? 0) * 10) / 10,
  };
}

function bugunISO(): string {
  return new Date().toISOString().slice(0, 10);
}
