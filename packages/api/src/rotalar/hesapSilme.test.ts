import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Hesap silme — KVKK "unutulma hakkı"nın somut karşılığı.
 *
 * "Sildik" demek yetmez: hiçbir tabloda artık kalmamalı. Kullanıcının verisi silinmiş
 * sanılıp bir yan tabloda kalırsa, hem sözümüzü hem yasayı çiğnemiş oluruz — ve bunu
 * fark etmek için kimsenin bakması gerekir.
 *
 * Bu test cascade zincirini tek tek değil, **kalan satır var mı** diye sınıyor: yeni bir
 * tablo eklenip zincire bağlanmazsa CI kırılır.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;
let kullaniciId: string;

/** `user_id` kolonu taşıyan ve kullanıcıya ait veri tutan tablolar. */
const KULLANICI_TABLOLARI = [
  'assessments',
  'profiles',
  'programs',
  'sessions',
  'progression_state',
  'decisions',
  'body_analyses',
  'food_logs',
  'weight_logs',
  'coach_messages',
  'quotas',
  'subscriptions',
  'ai_usage',
  'refresh_tokens',
  'dogrulama_kodlari',
  'analytics_events',
  'pantry',
  'meal_plans',
  'ogun_tercihleri',
  'tanima_onbellegi',
];

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'silme@made2fit.io', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;
  kullaniciId = kayit.json().kullanici.id;

  const basliklar = { authorization: `Bearer ${token}` };

  // Mümkün olduğunca çok tabloya iz bırak: silmenin gerçekten süpürdüğünü görelim.
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: basliklar,
    payload: {
      cevaplar: {
        K1: '1990-03-15',
        K2: 'Erkek',
        K3: 178,
        K4: 82,
        K6: 'Hayır',
        K7: 'Evet',
        S2: 'Hayır',
        S3: 'Hayır',
        S7: 'Hayır',
        S18: 'Hayır',
        A1: '1-3 yıl',
        A3: 10,
        E1: 'Ev',
        Z1: '3 gün',
        Z2: '45 dakika',
        Y1: '7-8 saat',
        Y4: 'Masa başı, çoğunlukla oturarak',
        Y6: 4,
        H1: 'Genel sağlık',
      },
    },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: basliklar,
    payload: {},
  });
  await app.inject({
    method: 'POST',
    url: '/v1/program/uret',
    headers: basliklar,
    payload: { hafta: 1 },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/ilerleme/kilo',
    headers: basliklar,
    payload: { kilo_kg: 82, gun: '2026-09-01' },
  });
}, 90_000);

afterAll(async () => {
  await uygulama?.kapat();
});

/**
 * `shopping_lists` kullanıcıya doğrudan değil, `meal_plans` üzerinden bağlı.
 * Dolaylı zincir de sınanmalı: kırılırsa alışveriş listeleri sahipsiz kalır.
 */
const DOLAYLI_TABLOLAR: Array<{ tablo: string; sorgu: string }> = [
  {
    tablo: 'shopping_lists',
    sorgu:
      'select count(*)::int as adet from shopping_lists s ' +
      'join meal_plans p on p.id = s.plan_id where p.user_id = ',
  },
];

async function dolayliSatirSayisi(sorgu: string): Promise<number> {
  const sonuc = await uygulama.ortam.db.execute(sql.raw(`${sorgu}'${kullaniciId}'`));
  const satirlar = (sonuc as unknown as { rows?: { adet: number }[] }).rows ?? [];
  return satirlar[0]?.adet ?? 0;
}

async function satirSayisi(tablo: string): Promise<number> {
  const sonuc = await uygulama.ortam.db.execute(
    sql.raw(`select count(*)::int as adet from ${tablo} where user_id = '${kullaniciId}'`),
  );
  const satirlar = (sonuc as unknown as { rows?: { adet: number }[] }).rows ?? [];
  return satirlar[0]?.adet ?? 0;
}

describe('silme öncesi veri var', () => {
  it('en az bir tabloda kullanıcının verisi bulunuyor', async () => {
    const sayilar = await Promise.all(KULLANICI_TABLOLARI.map(satirSayisi));

    expect(sayilar.reduce((t, s) => t + s, 0)).toBeGreaterThan(0);
  });
});

describe('onay olmadan silinmez', () => {
  it('yanlış onay metni reddedilir', async () => {
    const cevap = await app.inject({
      method: 'DELETE',
      url: '/v1/hesap',
      headers: { authorization: `Bearer ${token}` },
      payload: { onay: 'evet sil' },
    });

    expect(cevap.statusCode).toBe(400);
  });

  it('reddedilen istekten sonra veri duruyor', async () => {
    expect(await satirSayisi('profiles')).toBe(1);
  });
});

describe('silme tüm izleri süpürür', () => {
  it('doğru onayla hesap silinir', async () => {
    const cevap = await app.inject({
      method: 'DELETE',
      url: '/v1/hesap',
      headers: { authorization: `Bearer ${token}` },
      payload: { onay: 'HESABIMI SİL' },
    });

    expect(cevap.statusCode).toBe(200);
  });

  it.each(KULLANICI_TABLOLARI)('%s tablosunda kullanıcıya ait satır kalmadı', async (tablo) => {
    expect(await satirSayisi(tablo)).toBe(0);
  });

  it.each(DOLAYLI_TABLOLAR)('$tablo dolaylı zincirle de temizlendi', async ({ sorgu }) => {
    expect(await dolayliSatirSayisi(sorgu)).toBe(0);
  });

  it('oturum açma artık çalışmıyor', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { email: 'silme@made2fit.io', parola: 'Kirmizi-Bisiklet-42' },
    });

    expect(cevap.statusCode).toBe(401);
  });

  it('elindeki erişim tokeni artık iş görmüyor', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/kimlik/ben',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.statusCode).toBe(401);
  });
});
