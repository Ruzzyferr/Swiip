import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { vucutRaporuUret, type GorselAnalizCiktisi } from '@made2fit/core';
import { dilCozumle, metinleriAl, raporMetinleri } from '@made2fit/shared';
import { Bulunamadi, HataliIstek, Yasak } from '../hatalar';
import { body_analyses, users } from '../db/sema';
import { fotografiAnalizEt } from '../servisler/gorselAnaliz';
import { fotografBoyutuUygunMu } from '@made2fit/core';

/**
 * Vücut analizi (F4).
 *
 * GİZLİLİK MİMARİSİ — pazarlık konusu değil:
 *  1. Fotoğraf istek gövdesinde gelir, bellekte tutulur.
 *  2. Analiz servisine gönderilir, sayısal çıktı alınır.
 *  3. Fotoğraf referansı aynı istek içinde bırakılır; diske hiç yazılmaz.
 *  4. Veritabanına yalnızca sayılar gider (`body_analyses` tablosunda foto alanı yoktur).
 *
 * Bu dosyada hiçbir `writeFile`, `createWriteStream` veya nesne deposu çağrısı yoktur ve
 * olmamalıdır; test bunu kod incelemesiyle doğrular.
 */

const olcuSemasi = z.object({
  bel_cm: z.number().min(40).max(200).optional(),
  kalca_cm: z.number().min(50).max(220).optional(),
  gogus_cm: z.number().min(50).max(200).optional(),
  kol_cm: z.number().min(15).max(80).optional(),
  uyluk_cm: z.number().min(25).max(120).optional(),
  boyun_cm: z.number().min(20).max(70).optional(),
});

const analizSemasi = z.object({
  olculer: olcuSemasi.optional(),
  /** base64 kodlu fotoğraflar; yalnızca bellekte kalır. */
  fotograflar: z
    .array(
      z.object({
        poz: z.enum(['on', 'yan', 'arka']),
        veri: z.string().min(100).refine(fotografBoyutuUygunMu, {
          message:
            'Fotoğraf çok büyük. Uygulamanın kendi çektiği kare bu sınırın altında kalıyor; galeriden seçtiysen küçültüp tekrar dene.',
        }),
      }),
    )
    .max(4)
    .optional(),
  /** Jiroskop doğrulaması istemcide yapılır; sonucu burada kaydedilir. */
  aci_dogrulandi: z.boolean().optional(),
});

export async function vucutRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  app.post('/analiz', { preHandler: app.kimlikDogrula }, async (istek) => {
    const govde = analizSemasi.parse(istek.body);

    const [kullanici] = await db
      .select({
        cinsiyet: users.sex,
        dogum: users.birth_date,
        boy: users.height_cm,
        fotoOnayi: users.consent_photo,
        edModu: users.ed_mode,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);

    if (!kullanici) throw Bulunamadi('Kullanıcı bulunamadı.', 'kullanici_yok');
    if (!kullanici.boy) {
      throw HataliIstek('Analiz için boy bilgin gerekiyor; değerlendirmeyi tamamla.', 'boy_yok');
    }

    if (govde.fotograflar && govde.fotograflar.length > 0 && !kullanici.fotoOnayi) {
      throw Yasak(
        'Fotoğraf analizi için ayrı açık rıza vermen gerekiyor. Dilersen fotoğrafsız, yalnızca ' +
          'ölçülerinle devam edebilirsin.',
        'foto_riza_yok',
      );
    }

    let gorsel: GorselAnalizCiktisi | undefined;
    if (govde.fotograflar && govde.fotograflar.length > 0) {
      // Fotoğraf yalnızca bu çağrının ömrü boyunca bellekte. Dönüş değeri sayılardır.
      gorsel = await fotografiAnalizEt({
        fotograflar: govde.fotograflar,
        aiIstemcisi: app.aiIstemcisi,
      });
    }

    const kiloKg = 0;
    const rapor = vucutRaporuUret({
      cinsiyet: kullanici.cinsiyet === 'Kadın' ? 'kadin' : 'erkek',
      yas: yasHesapla(kullanici.dogum),
      boyCm: kullanici.boy,
      kiloKg: kiloKg > 0 ? kiloKg : 0,
      ...(govde.olculer ? { olculer: govde.olculer } : {}),
      ...(gorsel ? { gorsel } : {}),
    });

    const [kayit] = await db
      .insert(body_analyses)
      .values({
        user_id: istek.kullaniciId,
        yontem: rapor.yontem,
        bodyfat_low: rapor.yag_orani?.alt ?? null,
        bodyfat_high: rapor.yag_orani?.ust ?? null,
        muscle_map_jsonb: Object.fromEntries(rapor.kas_dagilimi.map((k) => [k.bolge, k.skor])),
        posture_flags: gorsel?.durusBayraklari ?? [],
        measurements_jsonb: govde.olculer ?? {},
        rapor_jsonb: rapor,
      })
      .returning({ id: body_analyses.id, taken_at: body_analyses.taken_at });

    /**
     * Rapor kullanıcının dilinde anlatılıyor.
     *
     * Motor kod üretiyor (duruş bayrağı, sınırlama kodu, özet parametreleri); cümle
     * sözlükte kuruluyor. Kayda giren `rapor_jsonb` motorun izi — Türkçe metinler orada
     * duruyor ve çeviremediğimiz bir kodda ona düşülüyor.
     */
    const metinler = metinleriAl(dilCozumle(kullanici.locale)).rapor.motor;
    const cevrilmis = raporMetinleri(rapor, metinler);

    return {
      analiz_id: kayit!.id,
      taken_at: kayit!.taken_at,
      rapor: {
        ...rapor,
        ozet: cevrilmis.ozet,
        durus: cevrilmis.durus,
        sinirlamalar: cevrilmis.sinirlamalar,
        feragat: cevrilmis.feragat,
        ...(rapor.bel_boy && cevrilmis.belBoyMesaji
          ? { bel_boy: { ...rapor.bel_boy, mesaj: cevrilmis.belBoyMesaji } }
          : {}),
      },
      // ED modunda arayüz aralığı gizler; motor yine hesaplar.
      sayilar_gizli: kullanici.edModu,
      gizlilik_notu:
        'Fotoğrafın analiz edildi ve bu istek biterken bellekten düştü. Sunucumuzun diskine ' +
        'hiç yazılmadı; sadece yukarıdaki sayılar saklandı.',
    };
  });

  app.get('/analizler', { preHandler: app.kimlikDogrula }, async (istek) => {
    const kayitlar = await db
      .select()
      .from(body_analyses)
      .where(eq(body_analyses.user_id, istek.kullaniciId))
      .orderBy(desc(body_analyses.taken_at))
      .limit(24);

    return { analizler: kayitlar };
  });

  /** KVKK: fotoğraf rızası ayrı verilir ve ayrı geri alınır. */
  app.post('/foto-riza', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { onay } = z.object({ onay: z.boolean() }).parse(istek.body);

    await db
      .update(users)
      .set({ consent_photo: onay ? new Date() : null })
      .where(eq(users.id, istek.kullaniciId));

    return {
      consent_photo: onay,
      mesaj: onay
        ? 'Fotoğraf rızan alındı. Fotoğrafın hiçbir zaman sunucumuzda saklanmayacak.'
        : 'Fotoğraf rızan geri alındı. Ölçülerinle devam edebiliriz.',
    };
  });
}

function yasHesapla(dogum: string | null): number {
  if (!dogum) return 30;
  const tarih = new Date(`${dogum.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(tarih.getTime())) return 30;
  const bugun = new Date();
  let yas = bugun.getUTCFullYear() - tarih.getUTCFullYear();
  const ay = bugun.getUTCMonth() - tarih.getUTCMonth();
  if (ay < 0 || (ay === 0 && bugun.getUTCDate() < tarih.getUTCDate())) yas -= 1;
  return yas > 0 && yas < 120 ? yas : 30;
}
