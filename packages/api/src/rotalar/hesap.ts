import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HataliIstek, Yetkisiz } from '../hatalar';
import {
  assessments,
  body_analyses,
  coach_messages,
  decisions,
  food_logs,
  meal_plans,
  ogun_tercihleri,
  pantry,
  profiles,
  programs,
  progression_state,
  quotas,
  sessions,
  subscriptions,
  tanima_onaylari,
  tanima_onbellegi,
  users,
  water_logs,
  weight_logs,
} from '../db/sema';

/**
 * KVKK hakları: erişim, dışa aktarma ve silme.
 *
 * Silme gerçekten siler. "Pasife alma" değil, satırların kendisi gider. Yabancı anahtarlar
 * cascade tanımlı olduğu için tek delete tüm izleri temizler.
 */

const SILME_ONAY_METNI = 'HESABIMI SİL';

export async function hesapRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  app.get('/disa-aktar', { preHandler: app.kimlikDogrula }, async (istek) => {
    const id = istek.kullaniciId;

    const [kullanici] = await db
      .select({
        id: users.id,
        email: users.email,
        locale: users.locale,
        created_at: users.created_at,
        birth_date: users.birth_date,
        sex: users.sex,
        height_cm: users.height_cm,
        ed_mode: users.ed_mode,
        consent_health: users.consent_health,
        consent_photo: users.consent_photo,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!kullanici) throw Yetkisiz();

    const [
      degerlendirmeler,
      profil,
      analizler,
      programlar,
      seanslar,
      ilerlemeler,
      kararlar,
      yemekler,
      kilolar,
      abonelik,
      kocMesajlari,
      suKayitlari,
      ogunPlanlari,
      dolap,
      ogunTercihleri,
      kotalar,
      tanimaOnaylari,
      tanimaOnbellegi,
    ] = await Promise.all([
      db.select().from(assessments).where(eq(assessments.user_id, id)),
      db.select().from(profiles).where(eq(profiles.user_id, id)),
      db.select().from(body_analyses).where(eq(body_analyses.user_id, id)),
      db.select().from(programs).where(eq(programs.user_id, id)),
      db.select().from(sessions).where(eq(sessions.user_id, id)),
      db.select().from(progression_state).where(eq(progression_state.user_id, id)),
      db.select().from(decisions).where(eq(decisions.user_id, id)),
      db.select().from(food_logs).where(eq(food_logs.user_id, id)),
      // Tarih sırasıyla: İlerleme'deki kilo grafiği sıralı seri varsayıyor.
      db
        .select()
        .from(weight_logs)
        .where(eq(weight_logs.user_id, id))
        .orderBy(asc(weight_logs.gun)),
      db.select().from(subscriptions).where(eq(subscriptions.user_id, id)),
      /**
       * Aşağıdakiler dışa aktarmada YOKTU — ama dosyanın açıklaması "tüm kişisel
       * verini içerir" diyordu. En ağırı koç mesajları: kullanıcı oraya sağlık
       * şikâyetini yazıyor (`uygulama.ts` bu yüzden log'dan bile siliyor) ve KVKK
       * m.11 erişim hakkı tam olarak bunu kapsıyor.
       */
      db.select().from(coach_messages).where(eq(coach_messages.user_id, id)),
      db.select().from(water_logs).where(eq(water_logs.user_id, id)),
      db.select().from(meal_plans).where(eq(meal_plans.user_id, id)),
      db.select().from(pantry).where(eq(pantry.user_id, id)),
      db.select().from(ogun_tercihleri).where(eq(ogun_tercihleri.user_id, id)),
      db.select().from(quotas).where(eq(quotas.user_id, id)),
      db.select().from(tanima_onaylari).where(eq(tanima_onaylari.user_id, id)),
      db.select().from(tanima_onbellegi).where(eq(tanima_onbellegi.user_id, id)),
    ]);

    return {
      disa_aktarma_tarihi: new Date().toISOString(),
      aciklama:
        'Bu dosya hakkındaki tüm kişisel verini içerir. Vücut fotoğrafların hiçbir zaman ' +
        'sunucumuzda saklanmadı; bu yüzden burada da yoktur.',
      kullanici,
      degerlendirmeler,
      profil: profil[0] ?? null,
      vucut_analizleri: analizler,
      programlar,
      seanslar,
      ilerleme_durumu: ilerlemeler,
      kararlar,
      beslenme_kayitlari: yemekler,
      kilo_kayitlari: kilolar,
      abonelik: abonelik[0] ?? null,
      koc_mesajlari: kocMesajlari,
      su_kayitlari: suKayitlari,
      ogun_planlari: ogunPlanlari,
      dolap: dolap[0] ?? null,
      ogun_tercihleri: ogunTercihleri[0] ?? null,
      kullanim_kotalari: kotalar,
      tanima_duzeltmeleri: tanimaOnaylari,
      tanima_gecmisi: tanimaOnbellegi,
    };
  });

  app.delete('/', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { onay } = z.object({ onay: z.string() }).parse(istek.body);

    if (onay !== SILME_ONAY_METNI) {
      throw HataliIstek(
        `Hesabını silmek için onay alanına "${SILME_ONAY_METNI}" yazman gerekiyor. Bu işlem geri alınamaz.`,
        'onay_gerekli',
        { onay: SILME_ONAY_METNI },
      );
    }

    // Cascade zinciri: tüm bağlı kayıtlar bu tek silmeyle gider.
    await db.delete(users).where(eq(users.id, istek.kullaniciId));

    return {
      durum: 'silindi',
      mesaj:
        'Hesabın ve tüm verilerin silindi. Yedeklerde en fazla 30 gün kalır, sonra oradan da ' +
        'düşer. Bizi tercih ettiğin için teşekkürler.',
    };
  });
}
