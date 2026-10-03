import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { havuzHazirla, muadilZinciri } from '@swiip/core';
import type { Profil } from '@swiip/shared';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Hareket değiştirmede muadil yalnızca kullanıcının HAVUZUNDAN gelir.
 *
 * `muadilZinciri` ekipmana ve kontrendikasyona bakıyor; havuzun öteki sert kurallarına
 * (eksenel yük yasağı, baş üstü, teknik tavanı, ağrıyı artıran patern) bakmıyor.
 * Program üretimi bunu süzüyordu ama `POST /hareket-degistir` süzmüyordu: omurga
 * yüklemesi yasak olan kullanıcıya barbell squat önerilip plana yazılabiliyordu.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let basliklar: Record<string, string>;
let profil: Profil;

const CEVAPLAR = {
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
  // Eksenel yük yasağı + kalça baskın patern kısıtı.
  S17: ['Osteoporoz / kemik erimesi'],
  A1: '5 yıldan fazla',
  A3: 10,
  E1: 'Spor salonu',
  E3: ['Barbell ve plaka', 'Dumbbell', 'Kablo makinesi', 'Leg press', 'Squat rack'],
  Z1: '4 gün',
  Z2: '60 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
  H1: 'Kas kazanımı',
};

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'muadil-havuz@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  basliklar = { authorization: `Bearer ${kayit.json().erisim_token}` };

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: basliklar,
    payload: { cevaplar: CEVAPLAR },
  });
  const tamam = await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: basliklar,
    payload: {},
  });
  profil = tamam.json().profil;
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: basliklar,
    payload: { plan: 'pro' },
  });
  const uret = await app.inject({
    method: 'POST',
    url: '/v1/program/uret',
    headers: basliklar,
    payload: { hafta: 1 },
  });
  expect(uret.statusCode).toBe(200);
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

async function kalemler(): Promise<Array<{ seans: string; hareket: string }>> {
  const aktif = await app.inject({ method: 'GET', url: '/v1/program/aktif', headers: basliklar });
  return (
    aktif.json().gunler as Array<{
      seans: { id: string };
      hareketler: Array<{ exercise_id: string }>;
    }>
  ).flatMap((g) => g.hareketler.map((h) => ({ seans: g.seans.id, hareket: h.exercise_id })));
}

describe('POST /v1/program/hareket-degistir — havuz süzgeci', () => {
  it('önerilen muadillerin hepsi kullanıcının havuzunda', async () => {
    const havuz = new Set(havuzHazirla(profil).havuz.map((h) => h.id));
    const disarida: string[] = [];

    for (const k of await kalemler()) {
      const cevap = await app.inject({
        method: 'POST',
        url: '/v1/program/hareket-degistir',
        headers: basliklar,
        payload: { seans_id: k.seans, eski_hareket_id: k.hareket },
      });
      for (const m of cevap.json().muadiller as Array<{ id: string }>) {
        if (!havuz.has(m.id)) disarida.push(`${k.hareket} -> ${m.id}`);
      }
    }

    expect(disarida, 'sert kısıtın elediği hareket muadil olarak önerilmemeli').toEqual([]);
  });

  it('havuz dışı bir muadil plana yazılamaz', async () => {
    const havuz = new Set(havuzHazirla(profil).havuz.map((h) => h.id));

    // Ham zincirde olup havuzda olmayan bir aday bul: kusurun tam olarak sızdırdığı şey.
    let deneme: { seans: string; hareket: string; yasakli: string } | undefined;
    for (const k of await kalemler()) {
      const yasakli = muadilZinciri(k.hareket, {
        ekipman: profil.kisitlar.ekipman,
        kontrendikasyonlar: profil.kisitlar.kontrendikasyonlar,
      }).find((h) => !havuz.has(h.id));
      if (yasakli) {
        deneme = { ...k, yasakli: yasakli.id };
        break;
      }
    }
    expect(deneme, 'test kurgusu: ham zincirde havuz dışı bir aday olmalı').toBeDefined();

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/hareket-degistir',
      headers: basliklar,
      payload: {
        seans_id: deneme!.seans,
        eski_hareket_id: deneme!.hareket,
        yeni_hareket_id: deneme!.yasakli,
      },
    });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().kod).toBe('uygun_olmayan_muadil');
  });
});
