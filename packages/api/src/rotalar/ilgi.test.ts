import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { eq } from 'drizzle-orm';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { ilgi_kayitlari } from '../db/sema';

/**
 * Yayın haberi listesi.
 *
 * Marka sitesinin tek dönüşüm yolu. Oturum istemiyor — henüz hesabı olmayan insanlar
 * için. Bu yüzden doğrulaması sıkı olmak zorunda.
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

/**
 * `app.inject` zincirlenebilir bir tip döndürüyor (`Promise & Chain`); `await` sonrası
 * TypeScript onu tekil cevaba indirmiyor. Açık dönüş tipiyle çözülüyor.
 */
function gonder(govde: Record<string, unknown>): Promise<LightMyRequestResponse> {
  return app.inject({ method: 'POST', url: '/v1/ilgi', payload: govde });
}

describe('POST /v1/ilgi', () => {
  it('rıza ile geçerli e-posta kaydediliyor', async () => {
    const cevap = await gonder({ eposta: 'okur@swiip.app', riza: true });

    expect(cevap.statusCode).toBe(201);
    expect(cevap.json().kaydedildi).toBe(true);
  });

  it('oturum istemiyor — sitede hesabı olmayan insanlar var', async () => {
    const cevap = await gonder({ eposta: 'oturumsuz@swiip.app', riza: true });

    expect(cevap.statusCode).not.toBe(401);
  });

  /** Varsayılanı kabul saymak açık rıza değildir. */
  it('rıza yoksa reddediliyor', async () => {
    expect((await gonder({ eposta: 'rizasiz@swiip.app' })).statusCode).toBe(400);
    expect((await gonder({ eposta: 'rizasiz@swiip.app', riza: false })).statusCode).toBe(400);
  });

  it('geçersiz e-posta reddediliyor', async () => {
    expect((await gonder({ eposta: 'bu-eposta-degil', riza: true })).statusCode).toBe(400);
    expect((await gonder({ eposta: '', riza: true })).statusCode).toBe(400);
  });

  it('aynı adres iki kez eklenirse hata vermiyor', async () => {
    await gonder({ eposta: 'tekrar@swiip.app', riza: true });
    const ikinci = await gonder({ eposta: 'tekrar@swiip.app', riza: true });

    expect(ikinci.statusCode).toBe(201);
  });

  /**
   * "Bu adres zaten kayıtlı" demek, kimin listede olduğunu sızdırır. Cevap her iki
   * durumda da aynı olmalı — hesap varlığı sızdırmama kuralının aynısı.
   */
  it('kayıtlı ve kayıtsız adres aynı cevabı veriyor', async () => {
    await gonder({ eposta: 'var@swiip.app', riza: true });

    const varOlan = await gonder({ eposta: 'var@swiip.app', riza: true });
    const yeni = await gonder({ eposta: 'yok@swiip.app', riza: true });

    expect(varOlan.statusCode).toBe(yeni.statusCode);
    expect(varOlan.json()).toEqual(yeni.json());
  });

  it('büyük harfli adres küçük harfe indiriliyor — aynı adres iki kayıt olmuyor', async () => {
    await gonder({ eposta: 'Buyuk@Swiip.app', riza: true });
    const ikinci = await gonder({ eposta: 'buyuk@swiip.app', riza: true });

    expect(ikinci.statusCode).toBe(201);

    const kayitlar = await uygulama.ortam.db
      .select()
      .from(ilgi_kayitlari)
      .where(eq(ilgi_kayitlari.eposta, 'buyuk@swiip.app'));
    expect(kayitlar).toHaveLength(1);
  });

  it('fazladan alanlar kaydı bozmuyor', async () => {
    const cevap = await gonder({
      eposta: 'fazla@swiip.app',
      riza: true,
      admin: true,
      bildirildi_at: '2020-01-01',
    });

    expect(cevap.statusCode).toBe(201);
  });
});
