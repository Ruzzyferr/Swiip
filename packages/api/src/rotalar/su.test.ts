import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { suHedefiMl } from '@swiip/core';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Su takibi.
 *
 * YAZIO paritesinde kalan son eksikti: kullanıcı yemeğini ve kilosunu kaydedebiliyor
 * ama içtiği suyu kaydedemiyordu.
 *
 * Hedef EFSA'nın yeterli alım değerinden türüyor ve künyesi `kaynaklar.ts`'te
 * (`suEfsa`). Kaynaksız bir sağlık sayısı koymak, Apple'ın 1.4.1 ile bir kez
 * reddettiği şeydi.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

async function kullaniciKur(eposta: string, cinsiyet = 'Erkek'): Promise<string> {
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: eposta, parola: 'Mor-Kalem-2026', saglik_onayi: true },
  });
  const token: string = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      cevaplar: { K1: '1990-01-01', K2: cinsiyet, K3: 180, K4: 80, H1: 'Yağ kaybı' },
    },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
  return token;
}

const su = (token: string, govde: Record<string, unknown>) =>
  app.inject({
    method: 'POST',
    url: '/v1/beslenme/su',
    headers: { authorization: `Bearer ${token}` },
    payload: govde,
  });

const gunAl = (token: string, gun: string) =>
  app.inject({
    method: 'GET',
    url: `/v1/beslenme/gun/${gun}`,
    headers: { authorization: `Bearer ${token}` },
  });

describe('su kaydı', () => {
  it('bardak ekleniyor ve birikiyor', async () => {
    const token = await kullaniciKur('su-ekle@swiip.app');
    const gun = '2026-09-01';

    expect((await su(token, { ekle_ml: 250, gun })).json().ml).toBe(250);
    expect((await su(token, { ekle_ml: 250, gun })).json().ml).toBe(500);
    expect((await su(token, { ekle_ml: 500, gun })).json().ml).toBe(1000);
  });

  /**
   * Artırma VERİTABANINDA yapılıyor, okuyup yazarak değil. Okuyup yazmak iki hızlı
   * dokunuşta yarış demek: ikisi de aynı eski değeri okur ve biri kaybolur.
   */
  it('eşzamanlı iki ekleme de sayılıyor', async () => {
    const token = await kullaniciKur('su-yaris@swiip.app');
    const gun = '2026-09-02';

    await Promise.all([
      su(token, { ekle_ml: 250, gun }),
      su(token, { ekle_ml: 250, gun }),
      su(token, { ekle_ml: 250, gun }),
      su(token, { ekle_ml: 250, gun }),
    ]);

    const cevap = await gunAl(token, gun);
    expect(cevap.json().su_ml, 'yarış yüzünden ekleme kayboldu').toBe(1000);
  });

  it('geri alma sıfırın altına inmiyor', async () => {
    const token = await kullaniciKur('su-geri@swiip.app');
    const gun = '2026-09-03';

    await su(token, { ekle_ml: 250, gun });
    expect((await su(token, { ekle_ml: -250, gun })).json().ml).toBe(0);
    expect(
      (await su(token, { ekle_ml: -250, gun })).json().ml,
      'Toplam eksiye düşerse ertesi eklemeler görünmez olur.',
    ).toBe(0);
  });

  it('doğrudan ayarlanabiliyor', async () => {
    const token = await kullaniciKur('su-ayar@swiip.app');
    const gun = '2026-09-04';

    await su(token, { ekle_ml: 750, gun });
    expect((await su(token, { ayarla_ml: 500, gun })).json().ml).toBe(500);
  });

  it('ekle_ml de ayarla_ml de yoksa reddediliyor', async () => {
    const token = await kullaniciKur('su-bos@swiip.app');
    expect((await su(token, { gun: '2026-09-05' })).statusCode).toBe(400);
  });

  it('günler birbirine karışmıyor', async () => {
    const token = await kullaniciKur('su-gun@swiip.app');

    await su(token, { ekle_ml: 500, gun: '2026-09-06' });
    await su(token, { ekle_ml: 250, gun: '2026-09-07' });

    expect((await gunAl(token, '2026-09-06')).json().su_ml).toBe(500);
    expect((await gunAl(token, '2026-09-07')).json().su_ml).toBe(250);
  });
});

describe('su hedefi', () => {
  it('hedef uçtan geliyor ve EFSA değeriyle aynı', async () => {
    const token = await kullaniciKur('su-hedef-e@swiip.app', 'Erkek');
    const govde = (
      await app.inject({
        method: 'GET',
        url: '/v1/beslenme/hedef',
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();

    expect(govde.su_hedefi_ml).toBe(suHedefiMl('erkek'));
    expect(govde.su_hedefi_ml).toBe(2000);
  });

  it('kadın hedefi erkekten düşük', async () => {
    const token = await kullaniciKur('su-hedef-k@swiip.app', 'Kadın');
    const govde = (
      await app.inject({
        method: 'GET',
        url: '/v1/beslenme/hedef',
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();

    expect(govde.su_hedefi_ml).toBe(suHedefiMl('kadin'));
    expect(govde.su_hedefi_ml).toBeLessThan(2000);
  });

  /**
   * Su hedefi ÜCRETSİZ ve kilitsiz.
   *
   * EFSA'nın sabit bir değerinden türüyor; bize hiçbir maliyeti yok. Kilitlemek,
   * hiçbir şey kazanmadan ücretsiz kullanıcıya "bunu da göremezsin" demek olurdu.
   */
  it('ücretsiz kullanıcıda da açık', async () => {
    const token = await kullaniciKur('su-ucretsiz@swiip.app');
    const govde = (
      await app.inject({
        method: 'GET',
        url: '/v1/beslenme/hedef',
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();

    expect(govde.su_hedefi_ml).toBeGreaterThan(0);
    expect(govde.hedef_kilidi).toBeUndefined();
  });
});
