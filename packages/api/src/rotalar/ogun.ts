import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  alisverisListesi,
  beslenmeHedefiHesapla,
  desteHazirla,
  kaydirmaOgren,
  ogunHedefleriniBol,
  ramazanMi,
  tarifleriFiltrele,
  type Ogrenme,
  type OgunKisitlari,
  type Tarif,
} from '@swiip/core';
import type { Profil } from '@swiip/shared';
import { dilCozumle, metinleriAl, veriYereli } from '@swiip/shared';
import { Bulunamadi, HataliIstek, PlanYetersiz } from '../hatalar';
import {
  assessments,
  meal_plans,
  ogun_tercihleri,
  pantry,
  profiles,
  recipes,
  shopping_lists,
  subscriptions,
  users,
} from '../db/sema';
import { planHaklari, type Plan } from '../servisler/haklar';

/**
 * Öğün planlama, buzdolabı ve kaydırmalı deste (F8).
 *
 * Deste açmak bir VERİTABANI SORGUSUDUR, AI çağrısı değil. Tarifler makroları
 * hesaplanmış ve etiketlenmiş olarak saklanır; çözücü yalnızca filtreler ve sıralar.
 */

export async function ogunRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function planGetir(kullaniciId: string): Promise<Plan> {
    const [kayit] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    return (kayit?.plan as Plan) ?? 'ucretsiz';
  }

  /**
   * Öğün planı katmanının kapısı.
   *
   * `ozellik` parametresi bilerek var: paywall ekranı "öğün planı" ile "kaydırmalı öğün
   * değiştirme"yi **ayrı satırlar** olarak satıyor. Sattığımız her satırın uygulandığı bir
   * yer olmalı; tek bayrağa bağlamak, tabloda yazan ama kodda karşılığı olmayan bir hak
   * bırakmak olurdu.
   */
  async function ozellikKontrol(
    kullaniciId: string,
    ozellik: 'ogun_plani' | 'kaydirmali_ogun' = 'ogun_plani',
  ) {
    const plan = await planGetir(kullaniciId);
    if (!planHaklari(plan)[ozellik]) {
      throw PlanYetersiz(
        'Öğün planı ve kaydırmalı değiştirme Temel plandan itibaren açık. ' +
          'Manuel kalori girişi ve arama her planda sınırsız.',
        'ogun_plan_yetersiz',
      );
    }
    return plan;
  }

  /** Kullanıcının kayıtlı dili; yoksa varsayılan. */
  async function kullaniciDili(kullaniciId: string): Promise<string | null> {
    const [kayit] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    return kayit?.locale ?? null;
  }

  /**
   * Tarif kütüphanesi — kullanıcının veri yereline göre.
   *
   * `recipes.locale` sütunu başından beri vardı ama hiçbir sorgu okumuyordu. İkinci
   * pazarın tarifleri eklendiği an Türk kullanıcının destesine yabancı mutfak
   * karışırdı. `veriYereli` tek karar noktası.
   */
  async function tarifleriGetir(kullaniciId: string): Promise<Tarif[]> {
    const yerel = veriYereli(await kullaniciDili(kullaniciId));
    const kayitlar = await db.select().from(recipes).where(eq(recipes.locale, yerel)).limit(2000);

    return kayitlar.map((k) => ({
      id: k.id,
      ad: k.name_tr,
      malzemeler: k.ingredients_jsonb as Tarif['malzemeler'],
      makrolar: k.macros_jsonb as Tarif['makrolar'],
      maliyet_kademesi: k.cost_tier,
      hazirlik_dakika: k.prep_minutes,
      etiketler: k.tags as string[],
      adimlar_tr: k.steps_tr as string[],
      insan_kontrollu: k.verified_by_human,
    }));
  }

  /** Kısıtlar değerlendirme cevaplarından çıkar; her istekte yeniden hesaplanır. */
  /**
   * `bugun` disaridan gecirilebiliyor.
   *
   * Ramazan penceresi takvime bagli ve haftalik plan gelecekteki bir haftaya da
   * kurulabiliyor; kisiti "su an"a gore cozmek, o haftanin gercegini kaciririr.
   */
  async function kisitlariGetir(
    kullaniciId: string,
    bugun: Date = new Date(),
  ): Promise<{
    kisitlar: OgunKisitlari;
    profil: Profil;
  }> {
    const [profilKaydi] = await db
      .select({ profil: profiles.profil_jsonb, assessment: profiles.assessment_id })
      .from(profiles)
      .where(eq(profiles.user_id, kullaniciId))
      .limit(1);

    if (!profilKaydi) {
      throw HataliIstek('Önce değerlendirmeyi tamamla.', 'profil_yok');
    }

    const [degerlendirme] = await db
      .select({ cevaplar: assessments.answers_jsonb })
      .from(assessments)
      .where(eq(assessments.user_id, kullaniciId))
      .limit(1);

    const cevaplar = (degerlendirme?.cevaplar ?? {}) as Record<string, unknown>;
    const tercihler = await tercihleriGetir(kullaniciId);

    return {
      profil: profilKaydi.profil as Profil,
      kisitlar: cevaplardanKisit(cevaplar, tercihler, bugun),
    };
  }

  async function tercihleriGetir(kullaniciId: string): Promise<Ogrenme> {
    const [kayit] = await db
      .select()
      .from(ogun_tercihleri)
      .where(eq(ogun_tercihleri.user_id, kullaniciId))
      .limit(1);

    return {
      sevilen: (kayit?.sevilen_jsonb ?? {}) as Record<string, number>,
      sevilmeyen: (kayit?.sevilmeyen_jsonb ?? {}) as Record<string, number>,
    };
  }

  async function envanterGetir(kullaniciId: string): Promise<string[]> {
    const [kayit] = await db.select().from(pantry).where(eq(pantry.user_id, kullaniciId)).limit(1);
    return (kayit?.items_jsonb ?? []) as string[];
  }

  // -------------------------------------------------------------------------

  app.get('/tarifler', { preHandler: app.kimlikDogrula }, async (istek) => {
    await ozellikKontrol(istek.kullaniciId);
    const { kisitlar } = await kisitlariGetir(istek.kullaniciId);
    const tumu = await tarifleriGetir(istek.kullaniciId);
    const uygun = tarifleriFiltrele(tumu, kisitlar);

    return {
      toplam: uygun.length,
      elenen: tumu.length - uygun.length,
      tarifler: uygun.map((t) => ({
        id: t.id,
        ad: t.ad,
        makrolar: t.makrolar,
        hazirlik_dakika: t.hazirlik_dakika,
        maliyet_kademesi: t.maliyet_kademesi,
        etiketler: t.etiketler,
      })),
    };
  });

  app.get('/tarif/:id', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { id } = z.object({ id: z.string() }).parse(istek.params);
    await ozellikKontrol(istek.kullaniciId);

    const [tarif] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
    if (!tarif) throw Bulunamadi('Tarif bulunamadı.', 'tarif_yok');
    if (!tarif.verified_by_human) throw Bulunamadi('Tarif bulunamadı.', 'tarif_yok');

    return tarif;
  });

  /** Kaydırmalı öğün destesi (F8.10). */
  /**
   * Kullanıcının öğün bölümünü ve istenen öğünü çözer.
   *
   * Eskiden öğün, Türkçe ADIN küçük harfli ilk üç harfiyle eşleştiriliyordu:
   * `'Akşam'.toLocaleLowerCase('tr-TR')` → `'akşam'`, aranan önek `'aks'`. Türkçe
   * 'ş' harfi ASCII 's' değil, yani eşleşme HİÇ tutmuyor ve kod sessizce
   * `ogunler[1]` yedeğine, yani öğleye düşüyordu. Akşam öğünü günlüğün %40'ı,
   * öğle %35'i: kullanıcı akşam için öğle boyunda tarifler görüyordu ve
   * "makro kilidi ±%8" sözü tam burada kırılıyordu.
   *
   * Ramazan'da daha kötüydü: kodlar sahur/iftar/iftar_sonrasi olduğu için
   * ÜÇ öğünün üçü birden yedeğe düşüyordu.
   *
   * Artık dilden bağımsız `kod` alanı kullanılıyor ve tanınmayan kod sessizce
   * başka bir öğüne düşmek yerine hata veriyor.
   */
  async function ogunCozumle(kullaniciId: string, kod: string | undefined) {
    const { kisitlar, profil } = await kisitlariGetir(kullaniciId);
    const beslenme = beslenmeHedefiHesapla(profil);
    const ogunler = ogunHedefleriniBol(beslenme, 3, kisitlar.ramazan);

    const ogunAdlari = metinleriAl(dilCozumle(await kullaniciDili(kullaniciId))).ogun
      .ogunAdlari as Record<string, string>;

    // Öğün belirtilmezse günün ana öğünü: en büyük kalori payı olan.
    const secili =
      kod === undefined
        ? ogunler.reduce((a, b) => (b.hedef.kalori > a.hedef.kalori ? b : a))
        : ogunler.find((o) => o.kod === kod);

    if (!secili) {
      throw HataliIstek(
        `Böyle bir öğün yok: ${kod}. Geçerli öğünler: ${ogunler.map((o) => o.kod).join(', ')}.`,
        'ogun_kodu_gecersiz',
      );
    }

    return {
      kisitlar,
      secili,
      /** İstemci sekmeleri buradan çizer; Ramazan'da liste kendiliğinden değişir. */
      ogunler: ogunler.map((o) => ({ kod: o.kod, ad: ogunAdlari[o.kod] ?? o.ad })),
    };
  }

  app.get('/deste', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { ogun, dolaptan } = z
      .object({ ogun: z.string().optional(), dolaptan: z.coerce.boolean().default(false) })
      .parse(istek.query);

    await ozellikKontrol(istek.kullaniciId, 'kaydirmali_ogun');

    const { kisitlar, secili, ogunler } = await ogunCozumle(istek.kullaniciId, ogun);
    const hedef = secili.hedef;

    const tarifler = await tarifleriGetir(istek.kullaniciId);
    const envanter = dolaptan ? await envanterGetir(istek.kullaniciId) : undefined;

    const deste = desteHazirla({
      tarifler,
      hedef,
      kisitlar,
      ...(envanter ? { envanter } : {}),
    });

    /**
     * Deste mesajı kullanıcının dilinde kuruluyor.
     *
     * Motor Türkçe izi (`mesaj`) ve kod üretiyor; cümle sözlükte kuruluyor. Kod
     * çözülemezse motorun izine düşülüyor — uydurmak yerine izi göstermek.
     */
    const desteMetinleri = metinleriAl(dilCozumle(await kullaniciDili(istek.kullaniciId))).ogun
      .deste.mesaj as Record<string, (d: Record<string, string | number>) => string>;
    const uretici = desteMetinleri[deste.mesaj_kodu.kod];

    return {
      ogun: secili.kod,
      ogunler,
      hedef,
      ...deste,
      mesaj: uretici ? uretici(deste.mesaj_kodu.degerler ?? {}) : deste.mesaj,
      kartlar: deste.kartlar.map((t) => ({
        id: t.id,
        ad: t.ad,
        makrolar: t.makrolar,
        hazirlik_dakika: t.hazirlik_dakika,
        maliyet_kademesi: t.maliyet_kademesi,
        etiketler: t.etiketler,
        malzemeler: t.malzemeler,
      })),
    };
  });

  /** Kaydırma tercih öğrenmesi (F8.11). */
  app.post('/kaydirma', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = z
      .object({ tarif_id: z.string(), yon: z.enum(['saga', 'sola']) })
      .parse(istek.body);

    await ozellikKontrol(istek.kullaniciId, 'kaydirmali_ogun');

    const [kayit] = await db.select().from(recipes).where(eq(recipes.id, govde.tarif_id)).limit(1);
    if (!kayit) throw Bulunamadi('Tarif bulunamadı.', 'tarif_yok');

    const tarif: Tarif = {
      id: kayit.id,
      ad: kayit.name_tr,
      malzemeler: kayit.ingredients_jsonb as Tarif['malzemeler'],
      makrolar: kayit.macros_jsonb as Tarif['makrolar'],
      maliyet_kademesi: kayit.cost_tier,
      hazirlik_dakika: kayit.prep_minutes,
      etiketler: kayit.tags as string[],
      adimlar_tr: kayit.steps_tr as string[],
      insan_kontrollu: kayit.verified_by_human,
    };

    const mevcut = await tercihleriGetir(istek.kullaniciId);
    const yeni = kaydirmaOgren({ tarif, yon: govde.yon }, mevcut);

    await db
      .insert(ogun_tercihleri)
      .values({
        user_id: istek.kullaniciId,
        sevilen_jsonb: yeni.sevilen,
        sevilmeyen_jsonb: yeni.sevilmeyen,
      })
      .onConflictDoUpdate({
        target: ogun_tercihleri.user_id,
        set: {
          sevilen_jsonb: yeni.sevilen,
          sevilmeyen_jsonb: yeni.sevilmeyen,
          updated_at: new Date(),
        },
      });

    return {
      ogrenildi: true,
      sevmediklerine_onerilen: yeni.sevmediklerine_ekle ?? [],
    };
  });

  /** Buzdolabı envanteri (F8.9). Fotoğraf, ses ve liste girişi aynı uca yazar. */
  app.get('/dolap', { preHandler: app.kimlikDogrula }, async (istek) => ({
    malzemeler: await envanterGetir(istek.kullaniciId),
  }));

  app.post('/dolap', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { malzemeler } = z
      .object({ malzemeler: z.array(z.string().min(1).max(60)).max(200) })
      .parse(istek.body);

    await db
      .insert(pantry)
      .values({ user_id: istek.kullaniciId, items_jsonb: malzemeler })
      .onConflictDoUpdate({
        target: pantry.user_id,
        set: { items_jsonb: malzemeler, updated_at: new Date() },
      });

    return { malzemeler, sayi: malzemeler.length };
  });

  /** Haftalık plan (F8.7). */
  app.post('/plan', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { hafta_basi } = z
      .object({ hafta_basi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .parse(istek.body);

    await ozellikKontrol(istek.kullaniciId);
    // Plan hangi haftaya kuruluyorsa kisit da o haftaya gore cozuluyor.
    const { kisitlar, profil } = await kisitlariGetir(
      istek.kullaniciId,
      new Date(`${hafta_basi}T12:00:00.000Z`),
    );

    const beslenme = beslenmeHedefiHesapla(profil);
    const ogunler = ogunHedefleriniBol(beslenme, 3, kisitlar.ramazan);
    const ogunAdlari = metinleriAl(dilCozumle(await kullaniciDili(istek.kullaniciId))).ogun
      .ogunAdlari as Record<string, string>;
    const tarifler = await tarifleriGetir(istek.kullaniciId);

    /**
     * Deste öğün başına bir kez hazırlanır.
     *
     * Eskiden gün döngüsünün içindeydi: aynı argümanlarla 21 kez, yani 18 gereksiz kez
     * tüm tarif kütüphanesi filtreleniyordu. Sonuç değişmiyordu, yalnızca iş artıyordu.
     */
    const desteler = ogunler.map((ogun) => desteHazirla({ tarifler, hedef: ogun.hedef, kisitlar }));

    const gunler = Array.from({ length: 7 }, (_, gunIndeksi) => ({
      gun: gunIndeksi,
      ogunler: ogunler.map((ogun, ogunIndeksi) => {
        const deste = desteler[ogunIndeksi]!;
        // Deterministik dağılım: aynı hafta aynı planı verir, ama günler tekrar etmez.
        const secim =
          deste.kartlar[
            (gunIndeksi * ogunler.length + ogunIndeksi) % Math.max(1, deste.kartlar.length)
          ];
        return {
          // Öğün adı kullanıcının dilinde; motorun Türkçe adı yalnızca yedek.
          ad: ogunAdlari[ogun.kod] ?? ogun.ad,
          /**
           * Dilden bağımsız kod da yazılır.
           *
           * Ad kullanıcının diline göre değişiyor; tek öğünü değiştirebilmek için
           * plandaki öğünü ada bakarak bulmak, dil değiştiren kullanıcıda tutmazdı.
           */
          kod: ogun.kod,
          hedef: ogun.hedef,
          tarif: secim ? { id: secim.id, ad: secim.ad, makrolar: secim.makrolar } : null,
          secenek_sayisi: deste.kartlar.length,
        };
      }),
    }));

    const [plan] = await db
      .insert(meal_plans)
      .values({
        user_id: istek.kullaniciId,
        week_of: hafta_basi,
        days_jsonb: gunler,
        constraints_snapshot: kisitlar,
      })
      .onConflictDoUpdate({
        target: [meal_plans.user_id, meal_plans.week_of],
        set: { days_jsonb: gunler, constraints_snapshot: kisitlar },
      })
      .returning({ id: meal_plans.id });

    // Alışveriş listesi plandan otomatik üretilir, reyona göre gruplanır.
    const seciliTarifler = gunler
      .flatMap((g) => g.ogunler.map((o) => o.tarif?.id))
      .filter((id): id is string => id !== undefined && id !== null)
      .map((id) => tarifler.find((t) => t.id === id))
      .filter((t): t is Tarif => t !== undefined);

    const envanter = await envanterGetir(istek.kullaniciId);
    const liste = alisverisListesi(seciliTarifler, envanter);

    await db.insert(shopping_lists).values({
      plan_id: plan!.id,
      items_jsonb: liste.kalemler,
      grouped_by_aisle: liste.reyonlar,
    });

    return { plan_id: plan!.id, hafta_basi, gunler, alisveris: liste };
  });

  /**
   * Plandaki TEK bir öğünü değiştirir (F8.10).
   *
   * Bu uç eksikti ve eksikliği ürünün sattığı bir özelliği boşa düşürüyordu.
   * "Kaydırmalı öğün değiştirme" yazan düğme desteyi açıyor, kullanıcı beğendiği
   * tarifi sağa kaydırıyordu — ve o kaydırma yalnızca TERCİH ÖĞRENİYORDU.
   * `meal_plans.days_jsonb` hiç güncellenmiyordu, yani kullanıcı plana döndüğünde
   * beğenmediği öğünü aynen görüyordu. Sessiz, çünkü hiçbir yerde hata çıkmıyordu.
   *
   * Tarif desteden seçilmek zorunda: deste zaten sert kısıtları (alerji, dini/etik,
   * intolerans, bütçe, süre) ve makro kilidini geçmiş tariflerdir. Kullanıcının
   * göremediği bir tarifi plana yazmak, kısıt çözücüsünü atlatmak olurdu.
   */
  app.post('/degistir', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = z
      .object({
        hafta_basi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        gun: z.number().int().min(0).max(6),
        ogun_kod: z.string().min(1),
        tarif_id: z.string().min(1),
      })
      .parse(istek.body);

    await ozellikKontrol(istek.kullaniciId, 'kaydirmali_ogun');

    const [plan] = await db
      .select()
      .from(meal_plans)
      .where(
        and(eq(meal_plans.user_id, istek.kullaniciId), eq(meal_plans.week_of, govde.hafta_basi)),
      )
      .limit(1);

    if (!plan) throw Bulunamadi('Bu hafta için plan yok.', 'haftalik_plan_yok');

    const gunler = plan.days_jsonb as Array<{
      gun: number;
      ogunler: Array<{
        ad: string;
        kod?: string;
        hedef: { kalori: number };
        tarif: { id: string; ad: string; makrolar: Tarif['makrolar'] } | null;
        secenek_sayisi: number;
      }>;
    }>;

    const gun = gunler.find((g) => g.gun === govde.gun);
    if (!gun) throw Bulunamadi('Bu gün planda yok.', 'plan_gunu_yok');

    const { kisitlar, secili } = await ogunCozumle(istek.kullaniciId, govde.ogun_kod);

    /**
     * Eski planlarda `kod` yok; onlarda sıraya düşülüyor.
     *
     * Göç yazmak yerine yedek koymak bilinçli: plan haftalık ve kısa ömürlü bir kayıt,
     * bir hafta sonra zaten kodlu hâli üretiliyor.
     */
    const ogunIndeksi = gun.ogunler.findIndex((o) => o.kod === govde.ogun_kod);
    const hedefOgun =
      ogunIndeksi >= 0
        ? gun.ogunler[ogunIndeksi]
        : gun.ogunler.find((o) => o.hedef.kalori === secili.hedef.kalori);

    if (!hedefOgun) throw Bulunamadi('Bu öğün planda yok.', 'plan_ogunu_yok');

    const tarifler = await tarifleriGetir(istek.kullaniciId);
    const deste = desteHazirla({ tarifler, hedef: secili.hedef, kisitlar });
    const secim = deste.kartlar.find((k) => k.id === govde.tarif_id);

    if (!secim) {
      throw HataliIstek(
        'Bu tarif o öğünün makro bütçesine ya da kısıtlarına uymuyor. ' +
          'Destede gördüğün tariflerden birini seçebilirsin.',
        'makro_kilidi',
      );
    }

    hedefOgun.tarif = { id: secim.id, ad: secim.ad, makrolar: secim.makrolar };
    hedefOgun.secenek_sayisi = deste.kartlar.length;

    await db.update(meal_plans).set({ days_jsonb: gunler }).where(eq(meal_plans.id, plan.id));

    /**
     * Alışveriş listesi plandan türer; öğün değişince onun da değişmesi gerekir.
     * Yoksa kullanıcı markette artık pişirmeyeceği yemeğin malzemesini alır.
     */
    const seciliTarifler = gunler
      .flatMap((g) => g.ogunler.map((o) => o.tarif?.id))
      .filter((id): id is string => id !== undefined && id !== null)
      .map((id) => tarifler.find((t) => t.id === id))
      .filter((t): t is Tarif => t !== undefined);

    const envanter = await envanterGetir(istek.kullaniciId);
    const liste = alisverisListesi(seciliTarifler, envanter);

    await db
      .update(shopping_lists)
      .set({ items_jsonb: liste.kalemler, grouped_by_aisle: liste.reyonlar })
      .where(eq(shopping_lists.plan_id, plan.id));

    return { degistirildi: true, gun: govde.gun, ogun_kod: govde.ogun_kod, tarif: hedefOgun.tarif };
  });

  app.get('/plan/:haftaBasi', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { haftaBasi } = z
      .object({ haftaBasi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .parse(istek.params);

    const [plan] = await db
      .select()
      .from(meal_plans)
      .where(and(eq(meal_plans.user_id, istek.kullaniciId), eq(meal_plans.week_of, haftaBasi)))
      .limit(1);

    if (!plan) throw Bulunamadi('Bu hafta için plan yok.', 'haftalik_plan_yok');

    const [liste] = await db
      .select()
      .from(shopping_lists)
      .where(eq(shopping_lists.plan_id, plan.id))
      .limit(1);

    /**
     * Öğün adı OKUMA ANINDA çözülüyor, kayıttan okunmuyor.
     *
     * Plan üretilirken kullanıcının o anki dilindeki ad `days_jsonb`'ye yazılıyordu.
     * Kullanıcı dilini değiştirdiğinde kayıt olduğu gibi kaldığı için İngilizce
     * arayüzde "KAHVALTI" görünüyordu — cihazda böyle görüldü.
     *
     * Projenin kendi ilkesi: cümleyi saklamak yerine parçalarını saklamak. `kod`
     * kayıtta duruyor, ad her okumada sözlükten kuruluyor. Kodu olmayan eski
     * planlarda kayıttaki ada düşülüyor: uydurmak yerine izi göstermek.
     */
    const ogunAdlari = metinleriAl(dilCozumle(await kullaniciDili(istek.kullaniciId))).ogun
      .ogunAdlari as Record<string, string>;

    const gunler = (plan.days_jsonb as Array<{ ogunler: Array<{ ad: string; kod?: string }> }>).map(
      (gun) => ({
        ...gun,
        ogunler: gun.ogunler.map((ogun) => ({
          ...ogun,
          ad: (ogun.kod ? ogunAdlari[ogun.kod] : undefined) ?? ogun.ad,
        })),
      }),
    );

    return { plan: { ...plan, days_jsonb: gunler }, alisveris: liste ?? null };
  });
}

/** Değerlendirme cevaplarını öğün kısıtlarına çevirir. */
export function cevaplardanKisit(
  cevaplar: Record<string, unknown>,
  tercihler: Ogrenme,
  /** Referans gün dışarıdan geliyor: kısıt çözümü test edilebilir kalsın. */
  bugun: Date = new Date(),
): OgunKisitlari {
  const dizi = (id: string): string[] => {
    const deger = cevaplar[id];
    if (Array.isArray(deger)) return deger.filter((d): d is string => typeof d === 'string');
    return typeof deger === 'string' ? [deger] : [];
  };

  const yok = (liste: string[]) => liste.filter((s) => s !== 'Yok' && s !== 'Hayır');

  // Üç kez sola kaydırılan malzeme artık kısıt sayılır.
  const ogrenilenSevmedikleri = Object.entries(tercihler.sevilmeyen)
    .filter(([, sayi]) => sayi >= 3)
    .map(([ad]) => ad);

  const butce = String(cevaplar['B8'] ?? '');
  const sure = String(cevaplar['B7'] ?? '');
  const kimPisiriyor = String(cevaplar['B5'] ?? '');
  const vazgecilmez = typeof cevaplar['B14'] === 'string' ? [cevaplar['B14']] : [];

  return {
    alerjiler: yok(dizi('B9')),
    intoleranslar: yok(dizi('B10')).map(intoleransKodu),
    dini_etik: yok(dizi('B11')).map(dini),
    sevmedikleri: [...yok(dizi('B13')), ...ogrenilenSevmedikleri],
    vazgecemedikleri: vazgecilmez,
    butce_kademesi: butceKademesi(butce),
    maks_hazirlik_dakika: hazirlikTavani(sure),
    kim_pisiriyor:
      kimPisiriyor === 'Ailem'
        ? 'ailem'
        : kimPisiriyor === 'Dışarıdan alıyorum'
          ? 'disaridan'
          : 'kendim',
    /**
     * Oruç tercihi VE takvim.
     *
     * B12 bir tercih sorusu ("tutar mısın"), durum sorusu değil ("bugün oruçlusun mu").
     * Tek başına okunduğunda Ağustos ayında sahur/iftar planı üretiyordu — kullanıcının
     * gördüğü ilk şey, ürünün onu hiç dinlemediğinin kanıtı olurdu.
     */
    ramazan: ['Evet', 'Bazı günler'].includes(String(cevaplar['B12'] ?? '')) && ramazanMi(bugun),
  };
}

function intoleransKodu(ad: string): string {
  const kucuk = ad.toLocaleLowerCase('tr-TR');
  if (kucuk.includes('laktoz')) return 'laktoz';
  if (kucuk.includes('gluten')) return 'gluten';
  if (kucuk.includes('fodmap')) return 'fodmap';
  return kucuk;
}

function dini(ad: string): string {
  const kucuk = ad.toLocaleLowerCase('tr-TR');
  if (kucuk.includes('vegan')) return 'vegan';
  if (kucuk.includes('vejetaryen')) return 'vejetaryen';
  if (kucuk.includes('pesketaryen')) return 'pesketaryen';
  if (kucuk.includes('helal') || kucuk.includes('domuz')) return 'helal';
  return kucuk;
}

/** B8 bütçe cevabı -> maliyet kademesi tavanı. Seçenekler `data/sorular.json` ile birebir. */
const BUTCE_KADEMELERI: Record<string, number> = {
  'Çok kısıtlı': 1,
  Orta: 2,
  Rahat: 3,
  'Kısıt yok': 4,
};

function butceKademesi(cevap: string): number {
  return BUTCE_KADEMELERI[cevap] ?? 4;
}

/** B7 pişirme süresi cevabı -> dakika tavanı. */
const HAZIRLIK_TAVANLARI: Record<string, number> = {
  Pişiremem: 10,
  '15 dakikaya kadar': 15,
  '30 dakikaya kadar': 30,
  '45 dakika ve üzeri': 60,
};

function hazirlikTavani(cevap: string): number {
  return HAZIRLIK_TAVANLARI[cevap] ?? 60;
}
