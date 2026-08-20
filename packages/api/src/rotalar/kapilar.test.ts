import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Sağlık kapılarının uçtaki karşılığı.
 *
 * Motor `program_engelli` diyorsa hiçbir uç program üretmemeli. Kapıyı yalnızca motorda
 * sınamak yetmez: kapı bir kez atlanırsa geri alınamaz, çünkü kullanıcı kardiyak
 * bayrağıyla ağırlık kaldırmaya başlar.
 *
 * Bu test kapıyı motor seviyesinde değil **davranış** seviyesinde sınıyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

const TEMEL = {
  K1: '1990-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K6: 'Hayır',
  A1: '1-3 yıl',
  A3: 10,
  E1: 'Ev',
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
  H1: 'Genel sağlık',
};

async function kur(email: string, cevaplar: Record<string, unknown>): Promise<string> {
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  const token = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${token}` },
    payload: { cevaplar: { ...TEMEL, ...cevaplar } },
  });

  // Profil ancak tamamlandığında yazılır; program üretimi profile bakar.
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });

  return token;
}

async function programUretDene(token: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/program/uret',
    headers: { authorization: `Bearer ${token}` },
    payload: { hafta: 1 },
  });
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

describe('kardiyak bayrağı programı durdurur', () => {
  it('program üretilemez ve sebebi söylenir', async () => {
    const token = await kur('kardiyak@made2fit.io', {
      K7: 'Evet',
      S2: 'Evet',
      S3: 'Hayır',
      S7: 'Hayır',
      S18: 'Hayır',
    });

    const cevap = await programUretDene(token);

    expect(cevap.statusCode).toBe(403);
    expect(cevap.json().mesaj.toLowerCase()).toContain('doktor');
  });
});

describe('eksik tarama programı durdurur', () => {
  /**
   * Cevaplanmamış zorunlu tarama sorusu "sorun yok" demek değil. Motor eksik taramada
   * uydurma bir sağlık bayrağı yaratmıyor ama program da üretmiyor.
   */
  it('zorunlu tarama eksikken program üretilemez', async () => {
    const token = await kur('eksik@made2fit.io', { K7: 'Evet' });

    expect((await programUretDene(token)).statusCode).toBe(403);
  });
});

describe('temiz tarama programı açar', () => {
  it('tüm tarama cevaplandığında program üretilir', async () => {
    const token = await kur('temiz@made2fit.io', {
      K7: 'Evet',
      S2: 'Hayır',
      S3: 'Hayır',
      S7: 'Hayır',
      S18: 'Hayır',
    });

    const cevap = await programUretDene(token);

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().gunler.length).toBeGreaterThan(0);
  });
});
