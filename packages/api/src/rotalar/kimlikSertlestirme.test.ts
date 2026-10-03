import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { metinleriAl } from '@swiip/shared';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { users } from '../db/sema';
import { KOD_DENEME_SINIRI } from '../kimlik/kod';
import { SILME_DENEME_SINIRI } from './hesap';

/**
 * 2026-10-03 güvenlik turunun ikinci yarısı: "bilerek bırakılan" üç risk kapandı.
 *
 *  1. Kayıt e-postanın kayıtlı olup olmadığını ele vermiyor (iki adımlı kayıt).
 *  2. Erişim tokenı çıkışta, parola sıfırlamada ve çalınmış yenileme tokenı
 *     yakalandığında ANINDA ölüyor (oturum sürümü).
 *  3. Hesap silme parola istiyor ve parola tahmin makinesine dönüşmüyor.
 *
 * Kayıt burada yardımcı OLMADAN, gerçek posta kutusundan okunan kodla yapılıyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
const PAROLA = 'Kirmizi-Bisiklet-42';
const tr = metinleriAl('tr').postalar;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const kutudakiKod = (alici: string) =>
  [...uygulama.kutu]
    .reverse()
    .find((p) => p.alici === alici)
    ?.govde.match(/\b\d{6}\b/)?.[0];

const kodIste = (email: string) =>
  app.inject({ method: 'POST', url: '/v1/kimlik/kayit-kod', payload: { email } });

const kayit = (email: string, kod?: string) =>
  app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: PAROLA, saglik_onayi: true, ...(kod ? { kod } : {}) },
  });

async function hesapAc(email: string) {
  await kodIste(email);
  const y = await kayit(email, kutudakiKod(email));
  expect(y.statusCode).toBe(201);
  return y.json() as { erisim_token: string; yenileme_token: string };
}

const ben = (token: string) =>
  app.inject({
    method: 'GET',
    url: '/v1/kimlik/ben',
    headers: { authorization: `Bearer ${token}` },
  });

describe('kayıt e-postanın varlığını ele vermiyor', () => {
  it('kayıtlı ve boş adres için yanıt BİREBİR aynı; bilgi yalnız posta kutusuna gidiyor', async () => {
    await hesapAc('var@swiip.app');

    const bos = await kodIste('bos@swiip.app');
    const dolu = await kodIste('var@swiip.app');

    expect(dolu.statusCode).toBe(bos.statusCode);
    expect(dolu.body).toBe(bos.body);

    const sonDolu = [...uygulama.kutu].reverse().find((p) => p.alici === 'var@swiip.app');
    const sonBos = [...uygulama.kutu].reverse().find((p) => p.alici === 'bos@swiip.app');
    expect(sonDolu?.konu).toBe(tr.zatenHesapVar.konu);
    expect(sonBos?.konu).toBe(tr.kayitKodu.konu);
  });

  it('kayıtlı adrese giden postada kullanılabilir bir kod yok', async () => {
    await kodIste('var@swiip.app');
    for (const kod of ['000000', '123456']) {
      expect((await kayit('var@swiip.app', kod)).statusCode).toBe(401);
    }
  });

  it('kod postayla gelip geri dönünce hesap açılıyor ve e-posta doğrulanmış doğuyor', async () => {
    const { erisim_token } = await hesapAc('yeni@swiip.app');
    const [k] = await uygulama.ortam.db
      .select({ d: users.email_dogrulandi_at })
      .from(users)
      .where(eq(users.email, 'yeni@swiip.app'));
    expect(k?.d).toBeInstanceOf(Date);
    expect((await ben(erisim_token)).statusCode).toBe(200);
  });

  it('kodsuz kayıt (eski uygulama) güncelleme isteyen açık bir hatayla dönüyor', async () => {
    const y = await kayit('eski@swiip.app');
    expect(y.statusCode).toBe(400);
    expect(y.json().kod).toBe('kayit_kodu_gerekli');
  });

  it(`kod ${KOD_DENEME_SINIRI} yanlış denemeden sonra yanıyor`, async () => {
    await kodIste('tahmin@swiip.app');
    const dogru = kutudakiKod('tahmin@swiip.app')!;
    const yanlis = dogru === '111111' ? '222222' : '111111';
    for (let i = 0; i < KOD_DENEME_SINIRI; i++) {
      expect((await kayit('tahmin@swiip.app', yanlis)).statusCode).toBe(401);
    }
    expect((await kayit('tahmin@swiip.app', dogru)).statusCode).toBe(401);
  });

  it('kod tek kullanımlık', async () => {
    await kodIste('tek@swiip.app');
    const kod = kutudakiKod('tek@swiip.app')!;
    expect((await kayit('tek@swiip.app', kod)).statusCode).toBe(201);
    expect((await kayit('tek@swiip.app', kod)).statusCode).toBe(401);
  });
});

describe('erişim tokenı anında geri alınabiliyor', () => {
  it('çıkıştan sonra eski erişim tokenı 401', async () => {
    const o = await hesapAc('cikis@swiip.app');
    expect((await ben(o.erisim_token)).statusCode).toBe(200);
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/cikis',
      headers: { authorization: `Bearer ${o.erisim_token}` },
      payload: { yenileme_token: o.yenileme_token },
    });
    expect((await ben(o.erisim_token)).statusCode).toBe(401);
  });

  it('başka cihazın oturumu yenilemeyle sessizce devam ediyor', async () => {
    const a = await hesapAc('iki-cihaz@swiip.app');
    const bGiris = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { email: 'iki-cihaz@swiip.app', parola: PAROLA },
    });
    const b = bGiris.json() as { erisim_token: string; yenileme_token: string };

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/cikis',
      headers: { authorization: `Bearer ${a.erisim_token}` },
      payload: { yenileme_token: a.yenileme_token },
    });

    expect((await ben(b.erisim_token)).statusCode).toBe(401);
    const yenile = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token: b.yenileme_token },
    });
    expect(yenile.statusCode).toBe(200);
    expect((await ben(yenile.json().erisim_token)).statusCode).toBe(200);
  });

  it('parola sıfırlanınca eski erişim tokenı 401', async () => {
    const o = await hesapAc('sifir@swiip.app');
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: 'sifir@swiip.app' },
    });
    const kod = kutudakiKod('sifir@swiip.app')!;
    const s = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: 'sifir@swiip.app', kod, yeni_parola: 'Mavi-Deniz-Feneri-77' },
    });
    expect(s.statusCode).toBe(200);
    expect((await ben(o.erisim_token)).statusCode).toBe(401);
  });

  it('çalınmış yenileme tokenı yakalanınca saldırganın erişim tokenı da ölüyor', async () => {
    const o = await hesapAc('calinti@swiip.app');
    const ilk = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token: o.yenileme_token },
    });
    const saldirgan = ilk.json() as { erisim_token: string };
    expect((await ben(saldirgan.erisim_token)).statusCode).toBe(200);

    // Gerçek kullanıcı eski (artık iptal) tokenı sunuyor: tekrar kullanım = kopyalanmış.
    const tekrar = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token: o.yenileme_token },
    });
    expect(tekrar.statusCode).toBe(401);
    expect((await ben(saldirgan.erisim_token)).statusCode).toBe(401);
  });
});

describe('hesap silme parola istiyor', () => {
  const sil = (token: string, govde: Record<string, unknown>) =>
    app.inject({
      method: 'DELETE',
      url: '/v1/hesap',
      headers: { authorization: `Bearer ${token}` },
      payload: { onay: 'HESABIMI SİL', ...govde },
    });

  it('parolasız silme (eski uygulama) açık bir hatayla reddediliyor', async () => {
    const o = await hesapAc('silme-eski@swiip.app');
    const y = await sil(o.erisim_token, {});
    expect(y.statusCode).toBe(400);
    expect(y.json().kod).toBe('parola_gerekli');
    expect((await ben(o.erisim_token)).statusCode).toBe(200);
  });

  it(`yanlış parola silmiyor; saatte ${SILME_DENEME_SINIRI} denemeden sonra kilit`, async () => {
    const o = await hesapAc('silme-tahmin@swiip.app');
    for (let i = 0; i < SILME_DENEME_SINIRI; i++) {
      const y = await sil(o.erisim_token, { parola: `yanlis-${i}` });
      expect(y.statusCode).toBe(403);
      expect(y.json().kod).toBe('parola_hatali');
    }
    // Doğru parola bile artık bekliyor: kilit tahmini durduruyor.
    expect((await sil(o.erisim_token, { parola: PAROLA })).statusCode).toBe(429);
    expect((await ben(o.erisim_token)).statusCode).toBe(200);
  });

  it('doğru parolayla siliniyor', async () => {
    const o = await hesapAc('silme-dogru@swiip.app');
    expect((await sil(o.erisim_token, { parola: PAROLA })).statusCode).toBe(200);
    expect((await ben(o.erisim_token)).statusCode).toBe(401);
  });
});
