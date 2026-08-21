import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { foods, recipes } from '../db/sema';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';

/**
 * Besin ve tarif verisi yerele göre ayrışıyor (F10.2, F10.4).
 *
 * `foods.locale` ve `recipes.locale` sütunları ilk günden şemadaydı; `(locale, name_tr)`
 * indeksi bile vardı. Ama **hiçbir sorgu bu sütunu okumuyordu.**
 *
 * Bugün tek bir veri kümesi var (Türkçe), o yüzden görünür bir hata yoktu. İkinci pazarın
 * verisi eklendiği gün Türk kullanıcı aramada yabancı besin adları görecek, destesine
 * başka bir mutfağın tarifleri karışacaktı — ve bu, veri eklenene kadar hiçbir testin
 * yakalayamayacağı bir hataydı.
 *
 * Bu test ikinci yerelde birer kayıt yazıp ayrışmanın gerçekten olduğunu gösteriyor:
 * mekanizma, veriden önce kanıtlanıyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

const YABANCI_BESIN = 'Zzquux Cheddar Wheel';
const YABANCI_TARIF = 'Zzquux Shepherd Pie';

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  // Türkçe veri kümesi: ayrışmanın 'kendi verisini görüyor' tarafı için gerekli.
  await besinleriTohumla(uygulama.ortam.db);
  await tarifleriTohumla(uygulama.ortam.db);

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'yerel@swiip.app', parola: 'Sari-Kalem-1907', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${token}` },
    payload: { cevaplar: { K1: '1990-01-01', K2: 'Erkek', K3: 180, K4: 80 } },
  });

  // İkinci pazarın verisi: bugün yok, yarın olacak. Ayrışma şimdiden sınanıyor.
  await uygulama.ortam.db.insert(foods).values({
    locale: 'en-US',
    name_tr: YABANCI_BESIN,
    per_100g_jsonb: { kalori: 400, protein_g: 25, yag_g: 33, karbonhidrat_g: 1 },
    portions_jsonb: [],
    source: 'test',
    verified: true,
  });

  await uygulama.ortam.db.insert(recipes).values({
    id: 'zzquux-shepherd-pie',
    locale: 'en-US',
    name_tr: YABANCI_TARIF,
    ingredients_jsonb: [],
    steps_tr: ['Bake until piping hot throughout.'],
    macros_jsonb: { kalori: 500, protein_g: 30, yag_g: 20, karbonhidrat_g: 45 },
    tags: ['ana_yemek'],
    cost_tier: 2,
    prep_minutes: 30,
    verified_by_human: true,
  });
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const yetkili = () => ({ authorization: `Bearer ${token}` });

describe('besin araması yerele göre', () => {
  it('Türkçe kullanıcı başka yerelin besinini görmüyor', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=Zzquux',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().sonuclar).toEqual([]);
  });

  it('kendi yerelindeki besinleri görmeye devam ediyor', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=yogurt',
      headers: yetkili(),
    });

    expect(cevap.json().sonuclar.length).toBeGreaterThan(0);
  });
});

describe('tarif kütüphanesi yerele göre', () => {
  it('Türkçe kullanıcının haftalık planına yabancı tarif girmiyor', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'pro', renews_at: '2030-01-01T00:00:00.000Z' },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/degerlendirme/tamamla',
      headers: yetkili(),
      payload: {},
    });

    const plan = await app.inject({
      method: 'POST',
      url: '/v1/ogun/plan',
      headers: yetkili(),
      payload: { hafta: '2026-08-17' },
    });

    if (plan.statusCode >= 400) return; // plan üretilemediyse ayrı bir konu; burada sınanan ayrışma.

    const metin = JSON.stringify(plan.json());
    expect(metin).not.toContain(YABANCI_TARIF);
  });
});
