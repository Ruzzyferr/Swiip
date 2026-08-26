import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Beslenme kısayollarının kilidi önceden söyleniyor (F6.4, F6.7).
 *
 * Ekran altı kısayol gösteriyor ve üçü ücretli katmanda. Hepsi aynı görünüyordu:
 * ücretsiz kullanıcı "Haftalık plan"a basıyor, açılan ekranda "Temel plandan itibaren
 * açık" yazısıyla karşılaşıyordu. Emülatörde görüldü.
 *
 * Kilidi önceden söylemek baskı değil, dürüstlük: dokunmadan önce ne olacağını bilmek.
 *
 * Ama **ödeyene hiçbir işaret gösterilmez** — "tek satır bile" kuralı. Bu yüzden kilit
 * bilgisi ekrandan değil, hak tablosundan geliyor ve ödemeli planda hepsi `false`.
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

async function kullaniciKur(eposta: string): Promise<string> {
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
      cevaplar: { K1: '1990-01-01', K2: 'Erkek', K3: 180, K4: 80, H1: 'Yağ kaybı' },
    },
  });

  // Profil derlenmeden hedef ucu çalışmıyor.
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });

  return token;
}

const hedefAl = (token: string) =>
  app.inject({
    method: 'GET',
    url: '/v1/beslenme/hedef',
    headers: { authorization: `Bearer ${token}` },
  });

describe('kısayol kilitleri', () => {
  it('ücretsiz planda öğün kısayolları kilitli görünüyor', async () => {
    const token = await kullaniciKur('kilit-ucretsiz@swiip.app');

    const kilitler = hedefAl(token).then((c) => c.json().kilitler);

    expect(await kilitler).toEqual({
      ogun_plani: true,
      kaydirmali_ogun: true,
      barkod: true,
      yemek_tanima: true,
    });
  });

  /** Ödeyen kullanıcıya tek satır bile upsell gösterilmez. */
  it('ödemeli planda hiçbir kısayol kilitli görünmüyor', async () => {
    const token = await kullaniciKur('kilit-pro@swiip.app');

    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: 'pro', renews_at: '2030-01-01T00:00:00.000Z' },
    });

    const govde = (await hedefAl(token)).json();

    expect(govde.kilitler).toEqual({
      ogun_plani: false,
      kaydirmali_ogun: false,
      barkod: false,
      yemek_tanima: false,
    });
    expect(govde.hedef_kilidi).toBeUndefined();
  });

  /**
   * Kilit bilgisi `hedef_kilidi`nden türetilmiyor: ikisi ayrı haklar
   * (`kalori_makro_hedefi` ve `ogun_plani`) ve bir gün ayrışabilirler.
   */
  it('kilit alanı hedef kilidinden bağımsız geliyor', async () => {
    const token = await kullaniciKur('kilit-ayri@swiip.app');

    const govde = (await hedefAl(token)).json();

    expect(govde.hedef_kilidi).toBe(true);
    expect(govde.kilitler).toBeDefined();
    /*
     * `barkod` ve `yemek_tanima` sonradan eklendi: beslenme sekmesindeki
     * "Barkod okut" ve "Fotoğraftan ekle" düğmeleri hiçbir kilit işareti
     * taşımıyordu ve ücretsiz kullanıcı bir sonraki ekranda duvara çarpıyordu.
     */
    expect(Object.keys(govde.kilitler).sort()).toEqual([
      'barkod',
      'kaydirmali_ogun',
      'ogun_plani',
      'yemek_tanima',
    ]);
  });
});
