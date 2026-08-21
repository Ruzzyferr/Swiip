import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  gerekceAnlat,
  hareketBul,
  ilerlemeUygula,
  muadilZinciri,
  programUret,
  seansAtla,
  seanslariYerlestir,
  seansTarihleri,
} from '@swiip/core';
import type { IlerlemeSonucu } from '@swiip/core';
import type { Karar, Profil } from '@swiip/shared';
import {
  dilCozumle,
  ilerlemeKuraliMetni,
  kararCevrildiMi,
  kararMetni,
  metinleriAl,
  programUyarilari,
  splitGerekcesi,
} from '@swiip/shared';
import { Bulunamadi, HataliIstek, PlanYetersiz, Yasak } from '../hatalar';
import {
  ai_usage,
  decisions,
  profiles,
  programs,
  progression_state,
  session_items,
  sessions,
  subscriptions,
  users,
} from '../db/sema';

/**
 * Program üretimi ve seans döngüsü (F3).
 *
 * Ücretsiz katman 1. günü görür; 2. gün ve sonrası ödemeli. Bu duvar programın kendisinde
 * değil, teslimde: motor tüm haftayı hesaplar, biz yalnızca ilk günü göstereriz.
 */

const geriBildirimSemasi = z.object({
  seans_id: z.string().uuid(),
  kalemler: z.array(
    z.object({
      hareket_id: z.string(),
      sonuc: z.enum(['tamamladim', 'zorlandim', 'yapamadim']),
      agri: z.boolean().default(false),
    }),
  ),
});

export async function programRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function profiliGetir(kullaniciId: string): Promise<Profil> {
    const [kayit] = await db
      .select({ profil: profiles.profil_jsonb })
      .from(profiles)
      .where(eq(profiles.user_id, kullaniciId))
      .limit(1);

    if (!kayit) {
      throw HataliIstek(
        'Önce değerlendirmeyi tamamlaman gerekiyor. Program cevaplarından hesaplanıyor.',
        'profil_yok',
      );
    }
    return kayit.profil as Profil;
  }

  async function planGetir(kullaniciId: string): Promise<string> {
    const [abonelik] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.user_id, kullaniciId))
      .limit(1);
    return abonelik?.plan ?? 'ucretsiz';
  }

  /**
   * Bir haftalık program üretir ve kaydeder.
   *
   * `/uret` ve `/sonraki-hafta` aynı gövdeyi paylaşır: iki ayrı üretim yolu,
   * ayrışan iki program demekti.
   */
  async function programKur(kullaniciId: string, hafta: number) {
    const profil = await profiliGetir(kullaniciId);

    /**
     * Kazanılan ilerleme yeni haftaya TAŞINIR.
     *
     * Bu okuma yeni satırlar yazılmadan ÖNCE yapılıyor: aşağıdaki tohumlama
     * `onConflictDoNothing` ile çalışıyor, yani sonradan okusaydık yeni hareketlerin
     * taze tahminini "önceki durum" sanardık.
     */
    const oncekiDurumlar = await db
      .select()
      .from(progression_state)
      .where(eq(progression_state.user_id, kullaniciId));
    const oncekiDurum = new Map(oncekiDurumlar.map((d) => [d.exercise_id, d]));

    /**
     * Yeni hareketin başlangıç yükü de ölçülen güce göre hesaplanır.
     *
     * Altı hafta gerçek veri topladıktan sonra e1RM artık tahmin değil ölçüm;
     * değerlendirmedeki ilk beyana geri dönmek o veriyi çöpe atmak olurdu.
     */
    const bilinenYukler = { ...profil.bilinen_yukler };
    for (const d of oncekiDurumlar) {
      if (d.e1rm > 0) bilinenYukler[d.exercise_id] = d.e1rm;
    }

    const sonuc = programUret({ ...profil, bilinen_yukler: bilinenYukler }, { hafta });

    if (sonuc.durum === 'engellendi') {
      throw Yasak(
        sonuc.kapilar[0]?.mesaj ??
          'Değerlendirmedeki bazı sorular cevaplanmadığı için program üretemiyorum.',
        'kapi_engeli',
      );
    }

    const program = sonuc.program;

    /**
     * Z3 yerleşimi: seanslar kullanıcının uygun dediği günlere, aralarını en çok açacak
     * biçimde konur. Uygun gün belirtilmemişse haftaya dengeli dağıtılır.
     *
     * Tarih üretimi burada, motorda değil: çekirdek makine saatine bakmaz.
     */
    const yerlesim = seanslariYerlestir(program.seanslar.length, profil.uygun_gunler);
    const tarihler = seansTarihleri(yerlesim.gunler, bugunISO());

    // Önceki program pasife alınır; kullanıcı geçmişini kaybetmez.
    await db
      .update(programs)
      .set({ aktif: false })
      .where(and(eq(programs.user_id, kullaniciId), eq(programs.aktif, true)));

    const [kayit] = await db
      .insert(programs)
      .values({
        user_id: kullaniciId,
        hafta,
        split_tipi: program.split.tip,
        split_jsonb: program.split,
        butce_jsonb: program.butce,
        uyarilar: yerlesim.uygunGunSayisiYetersiz
          ? [...program.uyarilar, yerlesim.gerekce]
          : program.uyarilar,
        /**
         * Takvim uyarısının kodu yok: metni Z3 cevabından hesaplanıyor ve henüz
         * çevrilmiş değil. Kod listesi metin listesinden kısa kaldığında çevirici
         * **tümünü** Türkçe bırakıyor — yarım çevrilmiş uyarı listesi, hiç
         * çevrilmemişten kötü.
         */
        uyari_kodlari_jsonb: yerlesim.uygunGunSayisiYetersiz ? [] : program.uyari_kodlari,
      })
      .returning({ id: programs.id });

    for (const seans of program.seanslar) {
      const [seansKaydi] = await db
        .insert(sessions)
        .values({
          user_id: kullaniciId,
          program_id: kayit!.id,
          gun_indeksi: seans.gun_indeksi,
          gun_tipi: seans.gun_tipi,
          tahmini_dakika: seans.tahmini_dakika,
          // Uygun gün sayısı seanstan azsa fazla seans tarihsiz kalır; uyarıda söylenir.
          planned_for: tarihler[seans.gun_indeksi] ?? null,
        })
        .returning({ id: sessions.id });

      for (const hareket of seans.hareketler) {
        /**
         * Daha önce çalışılmış hareket, kaldığı yerden devam eder.
         *
         * Motorun hedef yükü bir TAHMİN ve güven çarpanlarını taşıyor (yeni başlayan
         * için 0,78'e kadar iniyor). Bu çarpan ilk haftada doğru; altı hafta veri
         * topladıktan sonra yeniden uygulanırsa kullanıcı geri gönderilir.
         */
        const onceki = oncekiDurum.get(hareket.hareket_id);
        const katalogKaydi = hareketBul(hareket.hareket_id);
        const vucutAgirligi = katalogKaydi?.vucut_agirligi === true;

        const hedefKg =
          onceki && !vucutAgirligi && onceki.current_weight > 0
            ? onceki.current_weight
            : hareket.hedef_kg;
        const tekrarUst = onceki && vucutAgirligi ? onceki.current_reps : hareket.tekrar_ust;
        const tekrarAlt = Math.min(hareket.tekrar_alt, tekrarUst);

        await db.insert(session_items).values({
          session_id: seansKaydi!.id,
          exercise_id: hareket.hareket_id,
          order_index: hareket.sira,
          target_sets: hareket.set,
          target_weight: hedefKg,
          target_reps_low: tekrarAlt,
          target_reps_high: tekrarUst,
          rest_seconds: hareket.dinlenme_sn,
          progression_rule_text: hareket.ilerleme_kurali,
          rationale_id: hareket.gerekce_id,
          alternatifler: hareket.alternatifler,
        });

        // Başlangıç ilerleme durumu: bir sonraki seans buradan hesaplanır.
        await db
          .insert(progression_state)
          .values({
            user_id: kullaniciId,
            exercise_id: hareket.hareket_id,
            current_weight: hedefKg ?? 0,
            current_reps: tekrarUst,
            e1rm: bilinenYukler[hareket.hareket_id] ?? 0,
          })
          .onConflictDoNothing();
      }
    }

    // Karar izi: ürünün kalbi. Gerekçe ekranı buradan beslenir.
    const anlatim = await gerekceAnlat(
      program.kararlar.filter((k) => k.entity_tipi === 'hareket'),
      app.aiIstemcisi,
    );

    if (anlatim.girdi_token > 0) {
      await db.insert(ai_usage).values({
        user_id: kullaniciId,
        is_tipi: 'gerekce_anlatimi',
        model: 'gecit',
        girdi_token: anlatim.girdi_token,
        cikti_token: anlatim.cikti_token,
        maliyet_usd: String(anlatim.maliyet_usd),
      });
    }

    for (const karar of program.kararlar) {
      await db.insert(decisions).values({
        user_id: kullaniciId,
        program_id: kayit!.id,
        entity_type: karar.entity_tipi,
        entity_id: karar.entity_id,
        rule_fired: karar.kurallar,
        inputs_jsonb: karar.girdiler,
        parametreler_jsonb: karar.parametreler ?? {},
        explanation_tr: anlatim.metinler[karar.entity_id] ?? karar.aciklama_tr,
        ai_anlatimi: anlatim.ai_kullanildi,
      });
    }

    /**
     * Üretim ucu programın KENDİSİNİ döndürmüyor; yalnızca üretildiğini söylüyor.
     *
     * Programı burada da döndürmek, kullanıcıya görünen metni iki ayrı yerde üretmek
     * demekti. İkisi ayrışıyordu: `/aktif` cevabı kullanıcının diline çevriliyor,
     * buradaki ham hâli çevrilmiyordu. İstemci zaten bu cevabı atıp `/aktif`i okuyor.
     *
     * Tek üretim yeri = çevrilmeyi unutabileceğimiz tek yer.
     */
    return { program_id: kayit!.id, hafta, uretildi: true };
  }

  app.post('/uret', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { hafta } = z
      .object({ hafta: z.number().int().min(1).max(52).default(1) })
      .parse(istek.body ?? {});

    return programKur(istek.kullaniciId, hafta);
  });

  /**
   * Bir sonraki haftayı üretir.
   *
   * Bu uç eksikti ve eksikliği ürünün ana vaadini boşa düşürüyordu: `CLAUDE.md`
   * "her seans önceki geri bildirimden hesaplanır" diyor, ama uygulamada 1. haftadan
   * sonrası hiç yoktu. Kullanıcı dört seansını bitiriyor, hepsi "TAMAM" oluyor ve
   * program orada donuyordu. İki hafta sonra dönen kullanıcı aynı haftayı görüyordu.
   *
   * Yan etkisi sessiz ama önemliydi: `programs.hafta` hep 1 kaldığı için takvim
   * tabanlı deload koşulu (`hafta - son_deload >= 4..6`) HİÇ sağlanamıyordu. Deload'un
   * tek çalışan yolu üst üste zorlanma sinyaliydi.
   */
  app.post('/sonraki-hafta', { preHandler: app.kimlikDogrula }, async (istek) => {
    const plan = await planGetir(istek.kullaniciId);
    if (plan === 'ucretsiz') {
      throw PlanYetersiz(
        'Programın hafta hafta ilerlemesi Temel plandan itibaren açık. ' +
          'Ücretsiz planda 1. gün programı ve hareket açıklamaları açık kalır.',
        'sonraki_hafta_plan_yetersiz',
      );
    }

    const [program] = await db
      .select({ id: programs.id, hafta: programs.hafta })
      .from(programs)
      .where(and(eq(programs.user_id, istek.kullaniciId), eq(programs.aktif, true)))
      .orderBy(desc(programs.created_at))
      .limit(1);

    if (!program) throw Bulunamadi('Henüz bir programın yok.', 'program_yok');

    /**
     * Hafta, yapılan iş kadar ilerler.
     *
     * Ucu serbest bıraksaydık peş peşe basmak haftayı 52'ye taşır ve deload takvimini
     * anlamsızlaştırırdı: kullanıcı hiç antrenman yapmadan "deload haftası" alırdı.
     */
    const [bekleyen] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.program_id, program.id), eq(sessions.status, 'planlandi')))
      .limit(1);

    const [biten] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.program_id, program.id), ne(sessions.status, 'planlandi')))
      .limit(1);

    if (!biten) {
      throw HataliIstek(
        'Bu haftanın seanslarından hiçbirini işaretlemedin. Önce seanslarını yap, ' +
          'sonra yeni haftayı hesaplayayım.',
        'hafta_yarim',
      );
    }

    if (program.hafta >= 52) {
      throw HataliIstek(
        'Bir programda en fazla 52 hafta ilerlenebilir. Değerlendirmeni güncelleyerek ' +
          'yeni bir program çıkarabilirsin.',
        'hafta_tavani',
      );
    }

    const yeni = await programKur(istek.kullaniciId, program.hafta + 1);
    return { ...yeni, bekleyen_seans_vardi: bekleyen !== undefined };
  });

  app.get('/aktif', { preHandler: app.kimlikDogrula }, async (istek) => {
    const [program] = await db
      .select()
      .from(programs)
      .where(and(eq(programs.user_id, istek.kullaniciId), eq(programs.aktif, true)))
      .orderBy(desc(programs.created_at))
      .limit(1);

    if (!program) throw Bulunamadi('Henüz bir programın yok.', 'program_yok');

    const seanslar = await db
      .select()
      .from(sessions)
      .where(eq(sessions.program_id, program.id))
      .orderBy(sessions.gun_indeksi);

    const plan = await planGetir(istek.kullaniciId);
    const gorunurSeanslar = plan === 'ucretsiz' ? seanslar.slice(0, 1) : seanslar;

    const kalemler = await Promise.all(
      gorunurSeanslar.map(async (seans) => ({
        seans,
        hareketler: await db
          .select()
          .from(session_items)
          .where(eq(session_items.session_id, seans.id))
          .orderBy(session_items.order_index),
      })),
    );

    /**
     * Program metinleri kullanıcının dilinde anlatılıyor.
     *
     * Split gerekçesi ve ilerleme kuralı programın her satırında görünüyor. Kayıtta duran
     * Türkçe metinler motorun izi; çeviremediğimiz yerde onlara düşülüyor.
     *
     * İlerleme kuralı, kaydedilmiş sayılardan **yeniden kuruluyor**: cümleyi saklamak
     * yerine parçalarını saklamak zaten doğru olan, ve yeni bir sütun gerektirmiyor.
     */
    const programMetinleri = metinleriAl(dilCozumle(await kullaniciDili(istek.kullaniciId))).program
      .motor;

    const splitKaydi = program.split_jsonb as Parameters<typeof splitGerekcesi>[0];

    return {
      program_id: program.id,
      hafta: program.hafta,
      split: { ...splitKaydi, gerekce: splitGerekcesi(splitKaydi, programMetinleri) },
      butce: program.butce_jsonb,
      uyarilar: programUyarilari(
        {
          uyarilar: program.uyarilar as string[],
          uyari_kodlari: program.uyari_kodlari_jsonb as Array<{ kod: string }>,
        },
        programMetinleri,
      ),
      plan,
      // Bildirim zamanlayıcısı ve haftalık görünüm bunu kullanır.
      takvim: {
        gunler: seanslar
          .map((s) => haftaGunu(s.planned_for))
          .filter((g): g is number => g !== null),
      },
      kilitli_gun_sayisi: seanslar.length - gorunurSeanslar.length,
      gunler: kalemler.map((gun) => ({
        ...gun,
        hareketler: gun.hareketler.map((h) => ({
          ...h,
          /**
           * Cümle kaydedilmiş sayılardan **yeniden kuruluyor**.
           *
           * Cümleyi saklamak yerine parçalarını saklamak zaten doğru olan; burada ek
           * faydası, yeni bir sütun gerektirmemesi. Hareketin vücut ağırlığı olup
           * olmadığı ve artış miktarı katalogdan geliyor.
           */
          progression_rule_text: ilerlemeKuraliMetni(
            {
              ilerleme_kurali: h.progression_rule_text,
              ...(ilerlemeKodu(h) ? { ilerleme_kurali_kodu: ilerlemeKodu(h)! } : {}),
            },
            programMetinleri,
          ),
        })),
      })),
    };
  });

  /**
   * Kaydedilmiş seans kaleminden ilerleme kuralı kodunu çıkarır.
   *
   * Katalogda olmayan bir hareket için kod üretmiyoruz; o zaman kayıttaki Türkçe cümle
   * kullanılıyor. Uydurulmuş bir kural, yanlış ağırlık artışı demek.
   */
  function ilerlemeKodu(kalem: {
    exercise_id: string;
    target_sets: number;
    target_reps_low: number | null;
    target_reps_high: number | null;
  }) {
    const hareket = hareketBul(kalem.exercise_id);
    if (!hareket || kalem.target_reps_low === null || kalem.target_reps_high === null) {
      return undefined;
    }

    return {
      kod: hareket.vucut_agirligi ? 'vucut_agirligi' : 'agirlik',
      set: kalem.target_sets,
      tekrar_alt: kalem.target_reps_low,
      tekrar_ust: kalem.target_reps_high,
      ...(hareket.vucut_agirligi ? {} : { artis: hareket.artis_kg > 0 ? hareket.artis_kg : 2.5 }),
    };
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

  app.get('/gerekce/:hareketId', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { hareketId } = z.object({ hareketId: z.string() }).parse(istek.params);

    const kayitlar = await db
      .select()
      .from(decisions)
      .where(and(eq(decisions.user_id, istek.kullaniciId), eq(decisions.entity_id, hareketId)))
      .orderBy(desc(decisions.created_at))
      .limit(1);

    if (kayitlar.length === 0)
      throw Bulunamadi('Bu hareket için kayıtlı bir gerekçe yok.', 'gerekce_yok');

    const karar = kayitlar[0]!;

    /**
     * Gerekçe kullanıcının dilinde kuruluyor.
     *
     * Motor metin üretmiyor; kural kimliği ve parametre üretiyor. Cümle burada, sözlükle
     * kuruluyor — böylece "programın neden o program olduğunu da söyleriz" vaadi tek bir
     * dile bağlı kalmıyor.
     *
     * `aciklama_tr` alanı da dönüyor ve adı doğruyu söylüyor: motorun Türkçe izi. Kayıtta
     * duran o; çeviremediğimiz bir kararda cümle uydurmak yerine ona düşüyoruz.
     */
    const dil = dilCozumle(await kullaniciDili(istek.kullaniciId));
    const izKarari: Karar = {
      id: karar.id,
      entity_tipi: karar.entity_type as Karar['entity_tipi'],
      entity_id: karar.entity_id,
      kurallar: karar.rule_fired as string[],
      girdiler: karar.inputs_jsonb as Karar['girdiler'],
      parametreler: karar.parametreler_jsonb as Karar['parametreler'],
      aciklama_tr: karar.explanation_tr,
    };

    return {
      hareket: hareketBul(hareketId) ?? null,
      kurallar: karar.rule_fired,
      girdiler: karar.inputs_jsonb,
      aciklama: kararMetni(izKarari, metinleriAl(dil).gerekce),
      aciklama_tr: karar.explanation_tr,
      cevrildi: kararCevrildiMi(izKarari, metinleriAl(dil).gerekce),
    };
  });

  /** Seans sonrası üç dokunuş (F3.9). Motor kararı anında döner. */
  app.post('/geri-bildirim', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = geriBildirimSemasi.parse(istek.body);
    const profil = await profiliGetir(istek.kullaniciId);
    const gerekceMetinleri = metinleriAl(
      dilCozumle(await kullaniciDili(istek.kullaniciId)),
    ).gerekce;

    const [seans] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, govde.seans_id), eq(sessions.user_id, istek.kullaniciId)))
      .limit(1);

    if (!seans) throw Bulunamadi('Seans bulunamadı.', 'seans_yok');

    const plan = await planGetir(istek.kullaniciId);
    if (plan === 'ucretsiz') {
      throw PlanYetersiz(
        'Seans sonrası geri bildirim ve programın buna göre güncellenmesi Temel plandan itibaren açık.',
        'geri_bildirim_plan_yetersiz',
      );
    }

    const [program] = await db
      .select({ hafta: programs.hafta })
      .from(programs)
      .where(eq(programs.id, seans.program_id!))
      .limit(1);
    const hafta = program?.hafta ?? 1;

    const kararlar: string[] = [];

    for (const kalem of govde.kalemler) {
      const hareket = hareketBul(kalem.hareket_id);
      if (!hareket) continue;

      const [durum] = await db
        .select()
        .from(progression_state)
        .where(
          and(
            eq(progression_state.user_id, istek.kullaniciId),
            eq(progression_state.exercise_id, kalem.hareket_id),
          ),
        )
        .limit(1);

      const [planlanan] = await db
        .select()
        .from(session_items)
        .where(
          and(
            eq(session_items.session_id, seans.id),
            eq(session_items.exercise_id, kalem.hareket_id),
          ),
        )
        .limit(1);

      const sonuc = ilerlemeUygula({
        durum: {
          hareket_id: kalem.hareket_id,
          mevcut_kg: durum?.current_weight ?? planlanan?.target_weight ?? 0,
          mevcut_tekrar: durum?.current_reps ?? planlanan?.target_reps_high ?? 10,
          ustuste_basari: durum?.consecutive_success ?? 0,
          ustuste_zorlanma: durum?.consecutive_struggle ?? 0,
          e1rm: durum?.e1rm ?? 0,
          ...(durum?.last_deload_week !== null && durum?.last_deload_week !== undefined
            ? { son_deload_hafta: durum.last_deload_week }
            : {}),
        },
        hareket,
        sonuc: kalem.sonuc,
        agri: kalem.agri,
        hafta,
        toparlanmaSkoru: profil.toparlanma_skoru,
        tekrarAlt: planlanan?.target_reps_low ?? 8,
        tekrarUst: planlanan?.target_reps_high ?? 12,
        set: planlanan?.target_sets ?? 3,
      });

      await db
        .insert(progression_state)
        .values({
          user_id: istek.kullaniciId,
          exercise_id: kalem.hareket_id,
          current_weight: sonuc.durum.mevcut_kg,
          current_reps: sonuc.durum.mevcut_tekrar,
          consecutive_success: sonuc.durum.ustuste_basari,
          consecutive_struggle: sonuc.durum.ustuste_zorlanma,
          e1rm: sonuc.durum.e1rm,
          last_deload_week: sonuc.durum.son_deload_hafta ?? null,
          updated_at: new Date(),
        })
        .onConflictDoUpdate({
          target: [progression_state.user_id, progression_state.exercise_id],
          set: {
            current_weight: sonuc.durum.mevcut_kg,
            current_reps: sonuc.durum.mevcut_tekrar,
            consecutive_success: sonuc.durum.ustuste_basari,
            consecutive_struggle: sonuc.durum.ustuste_zorlanma,
            e1rm: sonuc.durum.e1rm,
            last_deload_week: sonuc.durum.son_deload_hafta ?? null,
            updated_at: new Date(),
          },
        });

      await db
        .update(session_items)
        .set({ feedback: kalem.sonuc, pain_flag: kalem.agri })
        .where(
          and(
            eq(session_items.session_id, seans.id),
            eq(session_items.exercise_id, kalem.hareket_id),
          ),
        );

      // Motor kararı PLANA yazılır. Yoksa cümle ile program ayrışır.
      await planaYansit(istek.kullaniciId, seans.program_id!, kalem.hareket_id, sonuc);

      await db.insert(decisions).values({
        user_id: istek.kullaniciId,
        session_id: seans.id,
        entity_type: 'ilerleme',
        entity_id: kalem.hareket_id,
        rule_fired: sonuc.karar.kurallar,
        inputs_jsonb: sonuc.karar.girdiler,
        parametreler_jsonb: sonuc.karar.parametreler ?? {},
        explanation_tr: sonuc.karar.aciklama_tr,
      });

      // Motor kararı kullanıcının dilinde anlatılır; kayıtta duran Türkçe iz değişmiyor.
      kararlar.push(kararMetni(sonuc.karar, gerekceMetinleri));
    }

    await db
      .update(sessions)
      .set({ status: 'tamamlandi', feedback_at: new Date() })
      .where(eq(sessions.id, seans.id));

    return { motor_kararlari: kararlar };
  });

  /**
   * Motor kararını programın HENÜZ YAPILMAMIŞ seanslarına yazar.
   *
   * Bu bağlantı eksikti ve eksikliği sessizdi: motor "Bench 52,5 kg'a çıkıyor" cümlesini
   * döndürüyor, kullanıcı cümleyi görüyor, sonra programı açtığında hâlâ 50 kg yazıyordu.
   * `progression_state` güncelleniyordu ama onu okuyan tek yer bir sonraki geri bildirim
   * hesabıydı — plana hiç dokunulmuyordu.
   *
   * `set_degisimi` ise motorda hesaplanıp hiçbir yerde okunmuyordu. Yani "hacmi bir set
   * düşürdüm" ve deload'un "set sayısını düşürdüm" cümleleri gerçekleşmeyen bir şeyi
   * anlatıyordu. Sağlık bağlamında bu kozmetik değil: deload haftası hafiflemiyorsa
   * deload olmaz.
   *
   * Yalnızca `planlandi` seanslar güncellenir; tamamlanmış seans bir kayıttır,
   * geriye dönük değiştirilmesi kullanıcının yaptığı işi değiştirmek olurdu.
   */
  async function planaYansit(
    kullaniciId: string,
    programId: string,
    hareketId: string,
    sonuc: IlerlemeSonucu,
  ): Promise<void> {
    const bekleyen = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.program_id, programId),
          eq(sessions.user_id, kullaniciId),
          eq(sessions.status, 'planlandi'),
        ),
      );

    if (bekleyen.length === 0) return;

    const hareket = hareketBul(hareketId);

    const kalemler = await db
      .select()
      .from(session_items)
      .where(
        and(
          inArray(
            session_items.session_id,
            bekleyen.map((s) => s.id),
          ),
          eq(session_items.exercise_id, hareketId),
        ),
      );

    for (const kalem of kalemler) {
      const guncel: {
        target_sets: number;
        target_weight?: number;
        target_reps_low?: number;
        target_reps_high?: number;
      } = {
        // Taban bir set: hareketi sıfıra indirmek deload değil, iptal olur.
        target_sets: Math.max(1, kalem.target_sets + sonuc.set_degisimi),
      };

      if (hareket?.vucut_agirligi) {
        // Yük eklenemeyen harekette ilerleme tekrar hedefinde görünür.
        const ust = sonuc.durum.mevcut_tekrar;
        guncel.target_reps_high = ust;
        guncel.target_reps_low = Math.min(kalem.target_reps_low, ust);
      } else {
        guncel.target_weight = sonuc.durum.mevcut_kg;
      }

      await db.update(session_items).set(guncel).where(eq(session_items.id, kalem.id));
    }
  }

  app.post('/seans/:seansId/atla', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { seansId } = z.object({ seansId: z.string().uuid() }).parse(istek.params);
    const { sebep } = z.object({ sebep: z.string().min(1).max(200) }).parse(istek.body);

    const [seans] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, seansId), eq(sessions.user_id, istek.kullaniciId)))
      .limit(1);

    if (!seans) throw Bulunamadi('Seans bulunamadı.', 'seans_yok');

    const sonuc = seansAtla(seans.gun_indeksi, sebep, 1);

    await db
      .update(sessions)
      .set({ status: 'atlandi', skip_reason: sebep })
      .where(eq(sessions.id, seansId));

    await db.insert(decisions).values({
      user_id: istek.kullaniciId,
      session_id: seansId,
      entity_type: 'ilerleme',
      entity_id: sonuc.karar.entity_id,
      rule_fired: sonuc.karar.kurallar,
      inputs_jsonb: sonuc.karar.girdiler,
      explanation_tr: sonuc.karar.aciklama_tr,
    });

    return { mesaj: sonuc.mesaj };
  });

  /** Hareket değiştirme: ücretsiz ve sınırsız. Hacim bütçesi korunur. */
  app.post('/hareket-degistir', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = z
      .object({
        seans_id: z.string().uuid(),
        eski_hareket_id: z.string(),
        yeni_hareket_id: z.string().optional(),
      })
      .parse(istek.body);

    const profil = await profiliGetir(istek.kullaniciId);

    /**
     * Seans kullanıcının kendi seansı mı?
     *
     * Burada sahiplik kontrolü YOKTU: `session_items` yalnızca `session_id` ile
     * seçiliyor, güncelleme de `session_items.id` ile yazılıyordu. Kimliği doğrulanmış
     * herhangi bir kullanıcı, başkasının seans kimliğiyle onun programını
     * değiştirebiliyordu.
     *
     * Sağlık tarafı asıl mesele: muadil zinciri `istek.kullaniciId`'nin profilinden
     * hesaplanıyor. Yani saldırganın ekipmanı ve kontrendikasyonları, kurbanın
     * programına yazılacak hareketi belirliyordu — bel fıtığı olan kullanıcının
     * programına yerden çekiş girebilirdi. Kısıt çözücüsünün tamamı atlanmış olurdu.
     *
     * Aynı dosyadaki `/geri-bildirim` ve `/seans/:id/atla` bu kontrolü yapıyordu;
     * unutulan tek uç buydu.
     */
    const [seansSahibi] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, govde.seans_id), eq(sessions.user_id, istek.kullaniciId)))
      .limit(1);

    if (!seansSahibi) throw Bulunamadi('Seans bulunamadı.', 'seans_yok');

    const [kalem] = await db
      .select()
      .from(session_items)
      .where(
        and(
          eq(session_items.session_id, govde.seans_id),
          eq(session_items.exercise_id, govde.eski_hareket_id),
        ),
      )
      .limit(1);

    if (!kalem) throw Bulunamadi('Bu seansta böyle bir hareket yok.', 'seansta_hareket_yok');

    const zincir = muadilZinciri(govde.eski_hareket_id, {
      ekipman: profil.kisitlar.ekipman,
      kontrendikasyonlar: profil.kisitlar.kontrendikasyonlar,
    });

    if (!govde.yeni_hareket_id) {
      /**
       * İngilizce adı da gönderiliyor.
       *
       * İstemci muadil listesini `ad_tr` ile basıyordu; İngilizce arayüzde aynı hareket
       * gerekçede "Hammer Curl", listede "Çekiç curl" olarak görünüyordu. Kullanıcı
       * bunların aynı hareket olduğunu bilemez.
       */
      return {
        muadiller: zincir.map((h) => ({
          id: h.id,
          ad_tr: h.ad_tr,
          ad_en: h.ad_en,
          patern: h.patern,
        })),
      };
    }

    const yeni = zincir.find((h) => h.id === govde.yeni_hareket_id);
    if (!yeni) {
      throw HataliIstek(
        'Bu hareket senin ekipmanın ve kısıtlarınla yapılamıyor; listedeki muadillerden birini seç.',
        'uygun_olmayan_muadil',
      );
    }

    await db
      .update(session_items)
      .set({
        exercise_id: yeni.id,
        degistirildi_from: govde.eski_hareket_id,
        alternatifler: zincir.filter((h) => h.id !== yeni.id).map((h) => h.id),
      })
      .where(eq(session_items.id, kalem.id));

    return {
      degistirildi: { eski: govde.eski_hareket_id, yeni: yeni.id },
      mesaj: `${yeni.ad_tr} olarak değiştirildi. Haftalık hacmin aynı kaldı.`,
    };
  });
}

/*
 * `programCevabi` kaldırıldı.
 *
 * Programı hem üretim hem okuma ucunda biçimlendiriyordu; iki ayrı yerde üretilen aynı
 * metin ayrışmıştı: okuma ucu kullanıcının diline çeviriyor, üretim ucu ham Türkçe
 * döndürüyordu. Artık programı yalnızca `/aktif` döndürüyor.
 */

/** API zamanı bilir, çekirdek bilmez: tarih üretimi yalnızca bu katmanda. */
function bugunISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function haftaGunu(planlanan: string | null): number | null {
  if (!planlanan) return null;
  const zaman = Date.parse(`${planlanan}T00:00:00.000Z`);
  return Number.isNaN(zaman) ? null : new Date(zaman).getUTCDay();
}
