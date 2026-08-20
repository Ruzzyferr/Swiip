import { and, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  blokGeriBildirimi,
  blokIlerlemesi,
  cevabiDogrula,
  gorunurSorular,
  kapilariDegerlendir,
  profilDerle,
  sonrakiSoru,
  type Cevaplar,
} from '@made2fit/core';
import { blokGeriBildirimiMetni, dilCozumle, metinleriAl, SORU_BANKASI } from '@made2fit/shared';
import { HataliIstek, Yasak } from '../hatalar';
import { analytics_events, assessments, profiles, users } from '../db/sema';

/**
 * Değerlendirme akışı (F2).
 *
 * Her blok bittiğinde kayıt yapılır: 134 soruyu yarıda bırakan kullanıcı en değerli yeniden
 * pazarlama hedefimiz ve kaldığı yerden devam edebilmeli.
 */

const cevapSemasi = z.record(z.string(), z.unknown());

const kaydetSemasi = z.object({
  cevaplar: cevapSemasi,
  blok_id: z.string().optional(),
  son_soru_id: z.string().optional(),
});

export async function degerlendirmeRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  async function aktifDegerlendirme(kullaniciId: string) {
    const [mevcut] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.user_id, kullaniciId))
      .orderBy(desc(assessments.version))
      .limit(1);

    if (mevcut) return mevcut;

    const [yeni] = await db
      .insert(assessments)
      .values({ user_id: kullaniciId, version: 1, answers_jsonb: {} })
      .returning();
    return yeni!;
  }

  /** Soru bankasının tamamı; istemci çevrimdışı da render edebilsin diye tek seferde. */
  app.get('/sorular', { preHandler: app.kimlikDogrula }, async () => ({
    version: SORU_BANKASI.version,
    locale: SORU_BANKASI.locale,
    blocks: SORU_BANKASI.blocks,
  }));

  app.get('/durum', { preHandler: app.kimlikDogrula }, async (istek) => {
    const kayit = await aktifDegerlendirme(istek.kullaniciId);
    const cevaplar = kayit.answers_jsonb as Cevaplar;

    const sirada = sonrakiSoru(cevaplar);
    return {
      degerlendirme_id: kayit.id,
      version: kayit.version,
      ilerleme: blokIlerlemesi(cevaplar),
      sonraki_soru: sirada ?? null,
      toplam_gorunur: gorunurSorular(cevaplar).length,
      tamamlandi: kayit.completed_at !== null,
    };
  });

  app.post('/cevap', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = kaydetSemasi.parse(istek.body);
    const kayit = await aktifDegerlendirme(istek.kullaniciId);
    const mevcut = kayit.answers_jsonb as Cevaplar;

    const birlesik: Cevaplar = { ...mevcut, ...(govde.cevaplar as Cevaplar) };

    // Gelen her cevap soru tanımına göre doğrulanır; istemciye güvenilmez.
    const sorular = new Map(gorunurSorular(birlesik).map((s) => [s.id, s]));
    for (const [soruId, deger] of Object.entries(govde.cevaplar)) {
      const soru = sorular.get(soruId);
      if (!soru) continue;
      const dogrulama = cevabiDogrula(soru, deger as never);
      if (!dogrulama.gecerli) {
        throw HataliIstek(`${soruId}: ${dogrulama.mesaj}`, 'gecersiz_cevap');
      }
    }

    const kapiDurumu = kapilariDegerlendir(birlesik, { bugun: new Date() });

    if (kapiDurumu.kayit_engelli) {
      // Veri silinmez; kullanıcı döndüğünde devam eder. Ama kayıt tamamlanmaz.
      await db
        .update(users)
        .set({ medical_gate_status: 'yas_engeli' })
        .where(eq(users.id, istek.kullaniciId));
    }

    const ilerleme = blokIlerlemesi(birlesik);
    const tamamlandi = ilerleme.tamamlandi;

    await db
      .update(assessments)
      .set({
        answers_jsonb: birlesik,
        tamamlanan_bloklar: ilerleme.tamamlanan_bloklar,
        updated_at: new Date(),
        ...(govde.son_soru_id ? { son_soru_id: govde.son_soru_id } : {}),
        ...(tamamlandi ? { completed_at: new Date() } : {}),
      })
      .where(eq(assessments.id, kayit.id));

    await db
      .update(users)
      .set(kullaniciAlanlari(birlesik, kapiDurumu.sayilar_gizli))
      .where(eq(users.id, istek.kullaniciId));

    // Terk analizi: hangi soruda kaç kişi düşüyor.
    await db.insert(analytics_events).values({
      user_id: istek.kullaniciId,
      olay: 'degerlendirme_ilerleme',
      ozellikler: { blok: ilerleme.blok_id, yuzde: ilerleme.yuzde },
    });

    return {
      ilerleme,
      kapi_durumu: kapiDurumu,
      sonraki_soru: sonrakiSoru(birlesik) ?? null,
      blok_geri_bildirimi:
        govde.blok_id && ilerleme.tamamlanan_bloklar.includes(govde.blok_id)
          ? await geriBildirimCevir(
              istek.kullaniciId,
              blokGeriBildirimi(govde.blok_id, birlesik) ?? null,
            )
          : null,
    };
  });

  /**
   * Blok geri bildirimini kullanıcının dilinde anlatır.
   *
   * Motor anahtar ve parametre üretiyor; cümle sözlükte kuruluyor. `metin` alanı motorun
   * Türkçe izi olarak kalıyor — çeviremediğimiz bir anahtarda ona düşülüyor.
   */
  async function geriBildirimCevir<T extends { anahtar: string; metin: string } | null>(
    kullaniciId: string,
    geri: T,
  ): Promise<T> {
    if (!geri) return geri;

    const [kayit] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, kullaniciId))
      .limit(1);

    const metinler = metinleriAl(dilCozumle(kayit?.locale)).blokGeriBildirimi;

    return { ...geri, metin: blokGeriBildirimiMetni(geri, metinler) };
  }

  app.get('/blok/:blokId/geri-bildirim', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { blokId } = z.object({ blokId: z.string() }).parse(istek.params);
    const kayit = await aktifDegerlendirme(istek.kullaniciId);

    const geri = blokGeriBildirimi(blokId, kayit.answers_jsonb as Cevaplar);
    if (!geri) throw HataliIstek('Böyle bir blok yok.', 'bilinmeyen_blok');

    return geriBildirimCevir(istek.kullaniciId, geri);
  });

  /** Profili derler ve kaydeder. Program üretiminin ön koşulu. */
  app.post('/tamamla', { preHandler: app.kimlikDogrula }, async (istek) => {
    const kayit = await aktifDegerlendirme(istek.kullaniciId);
    const cevaplar = kayit.answers_jsonb as Cevaplar;

    const [kullanici] = await db
      .select({ onay: users.doktor_onayi_at, edAcik: users.ed_sayilar_acik })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);

    const profil = profilDerle(cevaplar, {
      bugun: new Date(),
      userId: istek.kullaniciId,
      doktorOnayiVar: kullanici?.onay !== null && kullanici?.onay !== undefined,
      kullaniciSayilariActi: kullanici?.edAcik ?? false,
    });

    if (profil.kapi_durumu.kayit_engelli) {
      throw Yasak(profil.kapi_durumu.kapilar[0]!.mesaj, 'kapi_yas');
    }

    await db
      .insert(profiles)
      .values({
        user_id: istek.kullaniciId,
        assessment_id: kayit.id,
        training_age: profil.antrenman_yasi,
        recovery_score: profil.toparlanma_skoru,
        volume_budget_jsonb: {},
        constraints_jsonb: profil.kisitlar,
        goal_vector_jsonb: profil.hedef_vektoru,
        profil_jsonb: profil,
      })
      .onConflictDoUpdate({
        target: profiles.user_id,
        set: {
          assessment_id: kayit.id,
          training_age: profil.antrenman_yasi,
          recovery_score: profil.toparlanma_skoru,
          constraints_jsonb: profil.kisitlar,
          goal_vector_jsonb: profil.hedef_vektoru,
          profil_jsonb: profil,
          updated_at: new Date(),
        },
      });

    await db
      .update(assessments)
      .set({ completed_at: new Date() })
      .where(eq(assessments.id, kayit.id));

    return { profil, kapi_durumu: profil.kapi_durumu };
  });

  /** Değerlendirmeyi ayarlardan güncelleme (F2.12): yeni sürüm açılır, eskisi durur. */
  app.post('/yeni-surum', { preHandler: app.kimlikDogrula }, async (istek) => {
    const mevcut = await aktifDegerlendirme(istek.kullaniciId);

    const [yeni] = await db
      .insert(assessments)
      .values({
        user_id: istek.kullaniciId,
        version: mevcut.version + 1,
        // Eski cevaplar taşınır: kullanıcı 134 soruyu baştan cevaplamak zorunda değil.
        answers_jsonb: mevcut.answers_jsonb,
      })
      .returning();

    return { degerlendirme_id: yeni!.id, version: yeni!.version };
  });

  app.get('/gecmis', { preHandler: app.kimlikDogrula }, async (istek) => {
    const kayitlar = await db
      .select({
        id: assessments.id,
        version: assessments.version,
        started_at: assessments.started_at,
        completed_at: assessments.completed_at,
      })
      .from(assessments)
      .where(and(eq(assessments.user_id, istek.kullaniciId)))
      .orderBy(desc(assessments.version));

    return { surumler: kayitlar };
  });
}

/** Cevaplardan doğrudan kullanıcı tablosuna düşen alanlar. */
function kullaniciAlanlari(cevaplar: Cevaplar, edModu: boolean) {
  const alanlar: Record<string, unknown> = { ed_mode: edModu };

  const dogum = cevaplar['K1'];
  if (typeof dogum === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dogum)) alanlar.birth_date = dogum;

  const cinsiyet = cevaplar['K2'];
  if (cinsiyet === 'Erkek' || cinsiyet === 'Kadın') alanlar.sex = cinsiyet;

  const boy = cevaplar['K3'];
  if (typeof boy === 'number') alanlar.height_cm = boy;

  return alanlar;
}
