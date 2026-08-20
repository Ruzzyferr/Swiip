import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HataliIstek, Yetkisiz } from '../hatalar';
import {
  assessments,
  body_analyses,
  decisions,
  food_logs,
  profiles,
  programs,
  progression_state,
  sessions,
  subscriptions,
  users,
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
    ] = await Promise.all([
      db.select().from(assessments).where(eq(assessments.user_id, id)),
      db.select().from(profiles).where(eq(profiles.user_id, id)),
      db.select().from(body_analyses).where(eq(body_analyses.user_id, id)),
      db.select().from(programs).where(eq(programs.user_id, id)),
      db.select().from(sessions).where(eq(sessions.user_id, id)),
      db.select().from(progression_state).where(eq(progression_state.user_id, id)),
      db.select().from(decisions).where(eq(decisions.user_id, id)),
      db.select().from(food_logs).where(eq(food_logs.user_id, id)),
      db.select().from(weight_logs).where(eq(weight_logs.user_id, id)),
      db.select().from(subscriptions).where(eq(subscriptions.user_id, id)),
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
