import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Cakisma, HataliIstek, UygulamaHatasi, Yetkisiz } from '../hatalar';
import {
  parolaGucKontrolu,
  parolaHashle,
  parolaKarsilastir,
  tokenOzeti,
  tokenUret,
} from '../kimlik/parola';
import { dogrulama_kodlari, refresh_tokens, subscriptions, users } from '../db/sema';
import { kodGecerliMi, kodSonGecerlilik, kodUret, KOD_OMRU_DAKIKA } from '../kimlik/kod';
import { epostaDogrulamaPostasi, parolaSifirlamaPostasi } from '../servisler/postaci';
import { DILLER } from '@swiip/shared';
import { istekSayaciKur } from '../servisler/istekSayaci';

/**
 * Kimlik akışları.
 *
 * İki kural:
 *  - Hesabın var olup olmadığı hiçbir cevaptan sızmaz (kullanıcı sayımı saldırısı).
 *  - Yenileme tokenı tek kullanımlıktır ve rotasyona tabidir; çalınan token bir kez işe yarar,
 *    ikinci kullanımda zincir kırılır.
 */

const kayitSemasi = z.object({
  email: z.string().email('Geçerli bir e-posta gir.').max(254),
  parola: z.string().min(1).max(200),
  /** KVKK: sağlık verisi özel niteliklidir, açık rıza şarttır. */
  saglik_onayi: z.boolean(),
  olcum_onayi: z.boolean().optional(),
  yurt_disi_onayi: z.boolean().optional(),
  locale: z.string().default('tr-TR'),
});

const girisSemasi = z.object({
  email: z.string().email().max(254),
  parola: z.string().min(1).max(200),
});

// Biçim doğrulaması bilerek gevşek: geçersiz token her durumda 401 döner.
// 400/401 ayrımı, saldırgana "token formatın doğruydu" bilgisini verirdi.
const yenilemeSemasi = z.object({ yenileme_token: z.string().min(1).max(500) });

const sifirlamaIstegiSemasi = z.object({ email: z.string().email().max(254) });

const sifirlamaSemasi = z.object({
  email: z.string().email().max(254),
  kod: z.string().length(6),
  yeni_parola: z.string().min(1).max(200),
});

const dogrulamaSemasi = z.object({ kod: z.string().length(6) });

export async function kimlikRotalari(app: FastifyInstance): Promise<void> {
  const { db, yapilandirma } = app;

  /**
   * Kimlik uçlarına dar ve **ortak** sınır.
   *
   * Genel sınır (120/dk) normal kullanım için doğru, parola denemesi için değil.
   * Sayaç uçlar arasında paylaşılıyor: ayrı sayaçlar saldırgana her uçtan ayrı hak verirdi.
   * Sınır başarısız denemeye değil her denemeye uygulanır; başarılıları saymamak
   * ücretsiz deneme hakkı vermek olurdu.
   */
  const kimlikSayaci = istekSayaciKur({
    sinir: yapilandirma.KIMLIK_ISTEK_SINIRI,
    pencereMs: 60_000,
  });

  const darSinir = async (istek: FastifyRequest, cevap: FastifyReply) => {
    if (!kimlikSayaci.izinVar(istek.ip, Date.now())) {
      await cevap.code(429).send({
        kod: 'cok_fazla_istek',
        mesaj: 'Çok fazla deneme yapıldı. Bir dakika sonra tekrar dene.',
      });
    }
  };

  async function oturumAc(kullaniciId: string, cihaz?: string) {
    const erisim_token = app.jwt.sign({ sub: kullaniciId });
    const ham = tokenUret();

    const sonGecerlilik = new Date();
    sonGecerlilik.setDate(sonGecerlilik.getDate() + yapilandirma.YENILEME_TOKEN_GUN);

    await db.insert(refresh_tokens).values({
      user_id: kullaniciId,
      token_hash: tokenOzeti(ham),
      expires_at: sonGecerlilik,
      ...(cihaz ? { cihaz } : {}),
    });

    return { erisim_token, yenileme_token: ham };
  }

  app.post('/kayit', { preHandler: darSinir }, async (istek, cevap) => {
    const govde = kayitSemasi.parse(istek.body);

    if (!govde.saglik_onayi) {
      throw HataliIstek(
        'Sağlık verilerin özel nitelikli kişisel veridir; işleyebilmemiz için açık rıza vermen gerekiyor.',
        'riza_gerekli',
      );
    }

    const guc = parolaGucKontrolu(govde.parola);
    if (!guc.gecerli) throw HataliIstek(guc.mesaj!, 'zayif_parola');

    const mevcut = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${govde.email})`)
      .limit(1);

    if (mevcut.length > 0) {
      throw Cakisma(
        'Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyebilirsin.',
        'eposta_kullanimda',
      );
    }

    const simdi = new Date();
    const [kullanici] = await db
      .insert(users)
      .values({
        email: govde.email,
        parola_hash: await parolaHashle(govde.parola),
        locale: govde.locale,
        consent_health: simdi,
        ...(govde.olcum_onayi ? { consent_measurements: simdi } : {}),
        ...(govde.yurt_disi_onayi ? { consent_yurt_disi: simdi } : {}),
      })
      .returning({ id: users.id, email: users.email, locale: users.locale });

    await db.insert(subscriptions).values({ user_id: kullanici!.id, plan: 'ucretsiz' });

    const oturum = await oturumAc(kullanici!.id);
    return cevap.status(201).send({ ...oturum, kullanici });
  });

  app.post('/giris', { preHandler: darSinir }, async (istek) => {
    const govde = girisSemasi.parse(istek.body);

    const [kullanici] = await db
      .select({ id: users.id, email: users.email, parola_hash: users.parola_hash })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${govde.email})`)
      .limit(1);

    // Hesap yoksa da parola kontrolü yapılır: yanıt süresi hesabın varlığını ele vermesin.
    const hash = kullanici?.parola_hash ?? 'scrypt$131072$8$1$AAAA$AAAA';
    const dogru = await parolaKarsilastir(govde.parola, hash);

    if (!kullanici || !dogru) {
      throw new UygulamaHatasi(401, 'gecersiz_kimlik', 'E-posta veya parola hatalı.');
    }

    await db.update(users).set({ son_giris_at: new Date() }).where(eq(users.id, kullanici.id));

    const oturum = await oturumAc(kullanici.id);
    return { ...oturum, kullanici: { id: kullanici.id, email: kullanici.email } };
  });

  app.post('/yenile', { preHandler: darSinir }, async (istek) => {
    const { yenileme_token } = yenilemeSemasi.parse(istek.body);
    const ozet = tokenOzeti(yenileme_token);

    const [kayit] = await db
      .select()
      .from(refresh_tokens)
      .where(and(eq(refresh_tokens.token_hash, ozet), isNull(refresh_tokens.iptal_at)))
      .limit(1);

    if (!kayit || kayit.expires_at.getTime() < Date.now()) {
      /**
       * İPTAL EDİLMİŞ bir token yeniden sunulduysa zincir kırılır.
       *
       * Rotasyon doğru çalışıyordu — eski token anında iptal ediliyor — ama tekrar
       * kullanım yalnızca 401 alıyordu. Oysa iptal edilmiş bir tokenın ikinci kez
       * gelmesinin tek makul açıklaması var: token kopyalanmış ve iki taraf da onu
       * kullanıyor. Hangisinin saldırgan olduğunu bilemeyiz.
       *
       * Eski davranışta çalınan token bir kez kullanılınca saldırgan taze ve geçerli
       * bir çift alıyordu; kurbanın bir sonraki yenilemesi 401 alıp yeniden giriş
       * yapıyor, saldırganın oturumu 30 gün yaşamaya devam ediyordu. Dosyanın
       * başındaki "ikinci kullanımda zincir kırılır" notu kodun yaptığından fazlasını
       * söylüyordu.
       *
       * Artık o kullanıcının bütün yenileme tokenları iptal ediliyor: iki taraf da
       * düşer, gerçek kullanıcı yeniden giriş yapar. Rahatsız edici ama doğru taraf.
       */
      const [iptalli] = await db
        .select({ user_id: refresh_tokens.user_id })
        .from(refresh_tokens)
        .where(eq(refresh_tokens.token_hash, ozet))
        .limit(1);

      if (iptalli) {
        await db
          .update(refresh_tokens)
          .set({ iptal_at: new Date() })
          .where(and(eq(refresh_tokens.user_id, iptalli.user_id), isNull(refresh_tokens.iptal_at)));
        app.log.warn(
          { kullaniciId: iptalli.user_id },
          'iptal edilmiş yenileme tokenı tekrar sunuldu; zincir kırıldı',
        );
      }

      throw Yetkisiz('Oturumun sona ermiş. Tekrar giriş yap.', 'oturum_bitti');
    }

    // Rotasyon: eski token anında iptal edilir.
    await db
      .update(refresh_tokens)
      .set({ iptal_at: new Date() })
      .where(eq(refresh_tokens.id, kayit.id));

    return oturumAc(kayit.user_id, kayit.cihaz ?? undefined);
  });

  app.post('/cikis', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { yenileme_token } = yenilemeSemasi.parse(istek.body);

    await db
      .update(refresh_tokens)
      .set({ iptal_at: new Date() })
      .where(
        and(
          eq(refresh_tokens.token_hash, tokenOzeti(yenileme_token)),
          eq(refresh_tokens.user_id, istek.kullaniciId),
        ),
      );

    return { durum: 'cikildi' };
  });

  /**
   * Parola sıfırlama isteği.
   *
   * Hesap olsa da olmasa da AYNI cevabı döner. Aksi hâlde bu uç bir kullanıcı sayım
   * aracına dönüşür: saldırgan e-posta listesini buraya verip hangilerinin kayıtlı
   * olduğunu öğrenir.
   */
  app.post('/parola-sifirla-istek', { preHandler: darSinir }, async (istek) => {
    const { email } = sifirlamaIstegiSemasi.parse(istek.body);

    const [kullanici] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    if (kullanici) {
      const kod = kodUret();

      // Önceki kullanılmamış kodlar iptal edilir: aynı anda birden fazla geçerli kod olmaz.
      await db
        .update(dogrulama_kodlari)
        .set({ kullanildi_at: new Date() })
        .where(
          and(
            eq(dogrulama_kodlari.user_id, kullanici.id),
            eq(dogrulama_kodlari.tip, 'parola_sifirlama'),
            isNull(dogrulama_kodlari.kullanildi_at),
          ),
        );

      await db.insert(dogrulama_kodlari).values({
        user_id: kullanici.id,
        tip: 'parola_sifirlama',
        kod_hash: tokenOzeti(kod),
        expires_at: kodSonGecerlilik(),
      });

      const sonuc = await app.postaci.gonder(
        parolaSifirlamaPostasi(kullanici.email, kod, KOD_OMRU_DAKIKA),
      );
      if (!sonuc.gonderildi) {
        istek.log.warn({ sebep: sonuc.sebep }, 'parola sıfırlama postası gönderilemedi');
      }
    }

    return {
      durum: 'gonderildi',
      mesaj:
        'Bu adrese kayıtlı bir hesap varsa sıfırlama kodu gönderildi. Gelen kutunu ve ' +
        'gereksiz klasörünü kontrol et.',
      gecerlilik_dakika: KOD_OMRU_DAKIKA,
    };
  });

  app.post('/parola-sifirla', { preHandler: darSinir }, async (istek) => {
    const govde = sifirlamaSemasi.parse(istek.body);

    const guc = parolaGucKontrolu(govde.yeni_parola);
    if (!guc.gecerli) throw HataliIstek(guc.mesaj!, 'zayif_parola');

    const [kullanici] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${govde.email})`)
      .limit(1);

    if (!kullanici) throw Yetkisiz('Kod geçersiz veya süresi dolmuş.', 'kod_gecersiz');

    const [kayit] = await db
      .select()
      .from(dogrulama_kodlari)
      .where(
        and(
          eq(dogrulama_kodlari.user_id, kullanici.id),
          eq(dogrulama_kodlari.tip, 'parola_sifirlama'),
          isNull(dogrulama_kodlari.kullanildi_at),
        ),
      )
      .limit(1);

    if (!kayit || !kodGecerliMi(kayit, govde.kod)) {
      throw Yetkisiz('Kod geçersiz veya süresi dolmuş.', 'kod_gecersiz');
    }

    await db
      .update(users)
      .set({ parola_hash: await parolaHashle(govde.yeni_parola) })
      .where(eq(users.id, kullanici.id));

    await db
      .update(dogrulama_kodlari)
      .set({ kullanildi_at: new Date() })
      .where(eq(dogrulama_kodlari.id, kayit.id));

    // Parola değişince tüm oturumlar kapanır: tokenı çalan kişi içeride kalmaz.
    await db
      .update(refresh_tokens)
      .set({ iptal_at: new Date() })
      .where(and(eq(refresh_tokens.user_id, kullanici.id), isNull(refresh_tokens.iptal_at)));

    return {
      durum: 'degistirildi',
      mesaj: 'Parolan değişti. Güvenlik için açık olan tüm oturumlar kapatıldı.',
    };
  });

  app.post('/eposta-dogrula-gonder', { preHandler: app.kimlikDogrula }, async (istek) => {
    const [kullanici] = await db
      .select({ email: users.email, dogrulandi: users.email_dogrulandi_at })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);

    if (!kullanici) throw Yetkisiz();
    if (kullanici.dogrulandi) return { durum: 'zaten_dogrulanmis' };

    const kod = kodUret();

    await db
      .update(dogrulama_kodlari)
      .set({ kullanildi_at: new Date() })
      .where(
        and(
          eq(dogrulama_kodlari.user_id, istek.kullaniciId),
          eq(dogrulama_kodlari.tip, 'eposta_dogrulama'),
          isNull(dogrulama_kodlari.kullanildi_at),
        ),
      );

    await db.insert(dogrulama_kodlari).values({
      user_id: istek.kullaniciId,
      tip: 'eposta_dogrulama',
      kod_hash: tokenOzeti(kod),
      expires_at: kodSonGecerlilik(),
    });

    const sonuc = await app.postaci.gonder(
      epostaDogrulamaPostasi(kullanici.email, kod, KOD_OMRU_DAKIKA),
    );
    if (!sonuc.gonderildi) {
      istek.log.warn({ sebep: sonuc.sebep }, 'doğrulama postası gönderilemedi');
    }

    return { durum: 'gonderildi', gecerlilik_dakika: KOD_OMRU_DAKIKA };
  });

  app.post('/eposta-dogrula', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { kod } = dogrulamaSemasi.parse(istek.body);

    const [kayit] = await db
      .select()
      .from(dogrulama_kodlari)
      .where(
        and(
          eq(dogrulama_kodlari.user_id, istek.kullaniciId),
          eq(dogrulama_kodlari.tip, 'eposta_dogrulama'),
          isNull(dogrulama_kodlari.kullanildi_at),
        ),
      )
      .limit(1);

    if (!kayit || !kodGecerliMi(kayit, kod)) {
      throw Yetkisiz('Kod geçersiz veya süresi dolmuş.', 'kod_gecersiz');
    }

    await db
      .update(users)
      .set({ email_dogrulandi_at: new Date() })
      .where(eq(users.id, istek.kullaniciId));

    await db
      .update(dogrulama_kodlari)
      .set({ kullanildi_at: new Date() })
      .where(eq(dogrulama_kodlari.id, kayit.id));

    return { durum: 'dogrulandi' };
  });

  app.get('/ben', { preHandler: app.kimlikDogrula }, async (istek) => {
    const [kullanici] = await db
      .select({
        id: users.id,
        email: users.email,
        locale: users.locale,
        ed_mode: users.ed_mode,
        ed_sayilar_acik: users.ed_sayilar_acik,
        medical_gate_status: users.medical_gate_status,
        consent_health: users.consent_health,
        consent_photo: users.consent_photo,
        email_dogrulandi_at: users.email_dogrulandi_at,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, istek.kullaniciId))
      .limit(1);

    if (!kullanici) throw Yetkisiz();
    return kullanici;
  });

  /** ED modunda sayıları kullanıcı kendisi açar; biz açmayız. */
  /**
   * Arayüz dili (F10.1).
   *
   * Yalnızca tam çevrilmiş diller kabul edilir. Desteklenmeyen bir kodu sessizce kabul edip
   * varsayılana düşmek, kullanıcıya dili değiştirdiğini sanmasına yol açar.
   */
  app.post('/dil', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { dil } = z.object({ dil: z.enum(DILLER) }).parse(istek.body);

    await db.update(users).set({ locale: dil }).where(eq(users.id, istek.kullaniciId));
    return { locale: dil };
  });

  app.post('/ed-sayilar', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { acik } = z.object({ acik: z.boolean() }).parse(istek.body);

    await db.update(users).set({ ed_sayilar_acik: acik }).where(eq(users.id, istek.kullaniciId));
    return { ed_sayilar_acik: acik };
  });
}
