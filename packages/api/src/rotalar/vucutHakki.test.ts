import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Vücut analizi hakkı gerçekten uygulanıyor mu? (F4, F6.4)
 *
 * `vucutAnaliziHakki` yazılmıştı, testi vardı, ama **hiçbir yerden çağrılmıyordu.**
 * Emülatörde görüldü: ücretsiz bir kullanıcı rapor ekranını beş kez açtı ve beş ayrı
 * analiz kaydı oluştu. Oysa spec bölüm 13 açık — ücretsiz katmanda vücut analizi
 * **ömür boyu bir kez.**
 *
 * Sonucu yalnızca verilen sözün tutulmaması değil: fotoğraflı her analiz bir görsel AI
 * çağrısı. Sınırsız çalışan bir uç, ürünün bilinen en büyük riskine — birim ekonomisine —
 * doğrudan açılan bir kapı.
 *
 * Hak tablosu denetimi bunu kaçırdı çünkü `vucut_analizi_aylik` her planda `1`:
 * "planlar arasında farklılaşmıyor" sayılıp muaf tutuldu. Farklılaşan şey sayı değil,
 * **kural**: ücretsizde ömür boyu, ödemelide her ay.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

const OLCULER = { bel_cm: 92, boyun_cm: 39 };

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'hak@swiip.app', parola: 'Yesil-Defter-91', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${token}` },
    payload: { cevaplar: { K1: '1994-05-01', K2: 'Erkek', K3: 178, K4: 82 } },
  });
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const analizEt = () =>
  app.inject({
    method: 'POST',
    url: '/v1/vucut/analiz',
    headers: { authorization: `Bearer ${token}` },
    payload: { olculer: OLCULER },
  });

describe('ücretsiz planda vücut analizi', () => {
  it('ilk analiz çalışıyor', async () => {
    expect((await analizEt()).statusCode).toBeLessThan(300);
  });

  it('ikinci analiz reddediliyor — ücretsizde ömür boyu bir kez', async () => {
    const ikinci = await analizEt();

    expect(ikinci.statusCode).toBe(403);
    expect(ikinci.json().kod).toBe('analiz_hakki_bitti');
  });

  it('reddedilen analiz kayıt oluşturmuyor', async () => {
    await analizEt();

    const sayim = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analizler',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(sayim.json().analizler).toHaveLength(1);
  });

  it('plan yükseltilince analiz tekrar açılıyor', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: 'pro', renews_at: '2030-01-01T00:00:00.000Z' },
    });

    // Ödemelide ayda bir; bu ay henüz ödemeli bir analiz yapılmadı.
    expect((await analizEt()).statusCode).toBeLessThan(300);
  });

  it('ödemeli planda da ay içinde ikinci analiz reddediliyor', async () => {
    const ikinci = await analizEt();

    expect(ikinci.statusCode).toBe(403);
    expect(ikinci.json().kod).toBe('analiz_hakki_bitti');
  });
});
