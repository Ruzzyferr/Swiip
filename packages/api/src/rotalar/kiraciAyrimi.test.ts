import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';

/**
 * A kullanıcısı B'nin verisine dokunabiliyor mu?
 *
 * Bu, sağlık uygulamasında en pahalı hata sınıfı: kimlik doğrulaması **var**, yetki
 * kontrolü **yok**. Oturum açmış herkes geçerli bir token taşır; kayıt sahipliğini
 * ayrıca sınamayan bir uç, tüm kullanıcıların verisini tüm kullanıcılara açar.
 *
 * `erisim.test.ts` oturumsuz erişimi kapatıyordu — yani "token var mı" sorusunu.
 * Buradaki soru farklı: **token başkasının kaydına yetiyor mu.**
 *
 * Kimlik taşıyan her uç burada tek tek sınanıyor. Doğru davranış "sessizce hiçbir şey
 * yapma" da olabilir, 404 da; kabul edilemez olan **B'nin kaydının değişmesi veya
 * görünmesi.**
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

interface Kullanici {
  token: string;
  basliklar: { authorization: string };
}

const CEVAPLAR = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K6: 'Hayır',
  K7: 'Evet',
  H1: 'Kas kazanımı',
  H10: 1,
  A1: '1-3 yıl',
  A3: 10,
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
  E1: 'Spor salonu',
  E3: ['Barbell ve plaka', 'Dumbbell'],
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
};

const HAFTA = '2026-08-17';

async function kur(email: string): Promise<Kullanici> {
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true, olcum_onayi: true },
  });
  const token = kayit.json().erisim_token as string;
  const basliklar = { authorization: `Bearer ${token}` };

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: basliklar,
    payload: { cevaplar: CEVAPLAR },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: basliklar,
    payload: {},
  });
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: basliklar,
    payload: { plan: 'pro' },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/program/uret',
    headers: basliklar,
    payload: { hafta: 1 },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/ogun/plan',
    headers: basliklar,
    payload: { hafta_basi: HAFTA },
  });

  return { token, basliklar };
}

let a: Kullanici;
let b: Kullanici;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
  await besinleriTohumla(uygulama.ortam.db);
  await tarifleriTohumla(uygulama.ortam.db);

  a = await kur('kiraci-a@swiip.app');
  b = await kur('kiraci-b@swiip.app');
}, 180_000);

afterAll(async () => {
  await uygulama?.kapat();
});

async function aktifProgram(k: Kullanici) {
  const cevap = await app.inject({
    method: 'GET',
    url: '/v1/program/aktif',
    headers: k.basliklar,
  });
  expect(cevap.statusCode).toBe(200);
  return cevap.json();
}

describe('seans kayıtları sahibine bağlı', () => {
  it("B, A'nın seansına geri bildirim veremez", async () => {
    const aProgram = await aktifProgram(a);
    const aSeans = aProgram.gunler[0].seans.id;
    const aHareket = aProgram.gunler[0].hareketler[0].exercise_id;
    const oncekiSet = aProgram.gunler[0].hareketler[0].target_sets;

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/geri-bildirim',
      headers: b.basliklar,
      payload: {
        seans_id: aSeans,
        kalemler: [{ hareket_id: aHareket, sonuc: 'yapamadim', agri: true }],
      },
    });

    expect(cevap.statusCode).toBeGreaterThanOrEqual(400);

    // Asıl garanti: A'nın planı değişmemiş olmalı.
    const sonra = await aktifProgram(a);
    expect(sonra.gunler[0].seans.status).toBe('planlandi');
    expect(sonra.gunler[0].hareketler[0].target_sets).toBe(oncekiSet);
  });

  it("B, A'nın seansını atlayamaz", async () => {
    const aProgram = await aktifProgram(a);
    const aSeans = aProgram.gunler[0].seans.id;

    const cevap = await app.inject({
      method: 'POST',
      url: `/v1/program/seans/${aSeans}/atla`,
      headers: b.basliklar,
      payload: { sebep: 'canım istemedi' },
    });

    expect(cevap.statusCode).toBeGreaterThanOrEqual(400);
    expect((await aktifProgram(a)).gunler[0].seans.status).toBe('planlandi');
  });

  it("B, A'nın programındaki hareketi değiştiremez", async () => {
    const aProgram = await aktifProgram(a);
    const aSeans = aProgram.gunler[0].seans.id;
    const aHareket = aProgram.gunler[0].hareketler[0].exercise_id;

    // Okuma yolu: muadil listesi bile baskasinin seansi icin acilmamali.
    const liste = await app.inject({
      method: 'POST',
      url: '/v1/program/hareket-degistir',
      headers: b.basliklar,
      payload: { seans_id: aSeans, eski_hareket_id: aHareket },
    });
    expect(liste.statusCode).toBeGreaterThanOrEqual(400);

    /**
     * Yazma yolu — asıl tehlike burada.
     *
     * Muadil zinciri isteği YAPANIN profilinden hesaplanıyor. Sahiplik kontrolü
     * olmadan, B'nin kısıtlarına uyan bir hareket A'nın programına yazılabilirdi:
     * A'nın bel fıtığı kısıtı hiç değerlendirilmeden.
     */
    const aMuadiller = await app.inject({
      method: 'POST',
      url: '/v1/program/hareket-degistir',
      headers: a.basliklar,
      payload: { seans_id: aSeans, eski_hareket_id: aHareket },
    });
    const aday = (aMuadiller.json().muadiller as Array<{ id: string }> | undefined)?.[0];

    if (aday) {
      const yazma = await app.inject({
        method: 'POST',
        url: '/v1/program/hareket-degistir',
        headers: b.basliklar,
        payload: { seans_id: aSeans, eski_hareket_id: aHareket, yeni_hareket_id: aday.id },
      });
      expect(yazma.statusCode).toBeGreaterThanOrEqual(400);
    }

    const sonra = await aktifProgram(a);
    expect(sonra.gunler[0].hareketler[0].exercise_id).toBe(aHareket);
  });

  it("B, A'nın sonraki haftasını üretemez — kendi programını üretir", async () => {
    const aOnce = await aktifProgram(a);

    await app.inject({
      method: 'POST',
      url: '/v1/program/sonraki-hafta',
      headers: b.basliklar,
      payload: {},
    });

    const aSonra = await aktifProgram(a);
    expect(aSonra.hafta).toBe(aOnce.hafta);
    expect(aSonra.program_id).toBe(aOnce.program_id);
  });
});

describe('öğün planı sahibine bağlı', () => {
  it("B, A'nın haftalık planındaki öğünü değiştiremez", async () => {
    const aPlanOnce = await app.inject({
      method: 'GET',
      url: `/v1/ogun/plan/${HAFTA}`,
      headers: a.basliklar,
    });
    const onceki = aPlanOnce.json().plan.days_jsonb[0].ogunler[0].tarif;

    const bDeste = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste?ogun=kahvalti',
      headers: b.basliklar,
    });
    const baskaTarif = (bDeste.json().kartlar as Array<{ id: string }>).find(
      (k) => k.id !== onceki?.id,
    );

    await app.inject({
      method: 'POST',
      url: '/v1/ogun/degistir',
      headers: b.basliklar,
      payload: { hafta_basi: HAFTA, gun: 0, ogun_kod: 'kahvalti', tarif_id: baskaTarif!.id },
    });

    const aPlanSonra = await app.inject({
      method: 'GET',
      url: `/v1/ogun/plan/${HAFTA}`,
      headers: a.basliklar,
    });

    // B kendi planını değiştirebilir; A'nınki dokunulmamış olmalı.
    expect(aPlanSonra.json().plan.days_jsonb[0].ogunler[0].tarif).toEqual(onceki);
  });

  it("B, A'nın dolabını göremez ve ezemez", async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/ogun/dolap',
      headers: a.basliklar,
      payload: { malzemeler: ['aya-ozel-malzeme'] },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/ogun/dolap',
      headers: b.basliklar,
      payload: { malzemeler: ['beye-ozel-malzeme'] },
    });

    const aDolap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/dolap',
      headers: a.basliklar,
    });

    expect(aDolap.json().malzemeler).toContain('aya-ozel-malzeme');
    expect(aDolap.json().malzemeler).not.toContain('beye-ozel-malzeme');
  });
});

describe('beslenme kayıtları sahibine bağlı', () => {
  it("B, A'nın yemek kaydını silemez", async () => {
    const ara = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=yumurta',
      headers: a.basliklar,
    });
    const besin = (ara.json().sonuclar ?? ara.json().besinler)?.[0];
    expect(besin, 'arama sonuç döndürmedi').toBeTruthy();

    const GUN = '2026-08-18';
    const ekle = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: a.basliklar,
      payload: { food_id: besin.id, miktar: 100, gun: GUN },
    });
    expect(ekle.statusCode).toBe(200);
    const kayitId = (ekle.json().kayit?.id ?? ekle.json().id) as string;
    expect(kayitId, 'kayıt kimliği dönmedi').toBeTruthy();

    await app.inject({
      method: 'DELETE',
      url: `/v1/beslenme/kayit/${kayitId}`,
      headers: b.basliklar,
    });

    // A'nın kaydı hâlâ yerinde olmalı.
    const gun = await app.inject({
      method: 'GET',
      url: `/v1/beslenme/gun/${GUN}`,
      headers: a.basliklar,
    });
    expect(JSON.stringify(gun.json())).toContain(kayitId);
  });

  it("B'nin dışa aktarması yalnızca kendi verisini içerir", async () => {
    const disa = await app.inject({
      method: 'GET',
      url: '/v1/hesap/disa-aktar',
      headers: b.basliklar,
    });
    expect(disa.statusCode).toBe(200);

    const metin = JSON.stringify(disa.json());
    expect(metin).toContain('kiraci-b@swiip.app');
    expect(metin).not.toContain('kiraci-a@swiip.app');
  });
});
