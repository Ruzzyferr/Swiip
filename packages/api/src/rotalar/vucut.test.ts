import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Vücut analizi ucu (F4).
 *
 * Rapor, ücretsiz planın teslim ettiği tek çıktı — ürünün ilk izlenimi. Bu ucun uçtan uca
 * testi yoktu; dil çalışmasıyla birlikte yazıldı.
 *
 * Ölçü yolunu sınıyoruz: fotoğraf yolu AI çağırıyor ve bu ortamda sağlayıcı yok. Ölçü
 * yolu zaten kullanıcıların çoğunun kullandığı yol (fotoğraf rızası isteğe bağlı).
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

const OLCULER = { bel_cm: 92, boyun_cm: 39, kalca_cm: 100 };

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'vucut@made2fit.io', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;

  // Boy, cinsiyet ve doğum tarihi değerlendirmeden geliyor (K1-K3).
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

const yetkili = () => ({ authorization: `Bearer ${token}` });

async function analizEt() {
  return app.inject({
    method: 'POST',
    url: '/v1/vucut/analiz',
    headers: yetkili(),
    payload: { olculer: OLCULER },
  });
}

async function dilAyarla(dil: string) {
  await app.inject({
    method: 'POST',
    url: '/v1/kimlik/dil',
    headers: yetkili(),
    payload: { dil },
  });
}

describe('vücut analizi — ölçü yolu', () => {
  it('ölçülerle rapor üretiliyor', async () => {
    const cevap = await analizEt();

    expect(cevap.statusCode).toBeLessThan(300);
    expect(cevap.json().rapor.yag_orani.alt).toBeGreaterThan(0);
    expect(cevap.json().rapor.yag_orani.ust).toBeGreaterThan(cevap.json().rapor.yag_orani.alt);
  });

  /** Tahmin aralık olarak sunulur, tek sayı olarak asla — spec'in sert kuralı. */
  it('yağ oranı tek sayı değil aralık', async () => {
    const yagOrani = (await analizEt()).json().rapor.yag_orani;

    expect(yagOrani.ust).toBeGreaterThan(yagOrani.alt);
  });

  it('fotoğrafsız analizde sınırlama gerekçesi yazıyor', async () => {
    const rapor = (await analizEt()).json().rapor;

    expect(rapor.sinirlama_kodlari).toContain('fotograf_yok');
    expect(rapor.sinirlamalar.length).toBeGreaterThan(0);
  });

  /** Tıbbi cihaz feragati her raporda; atlanamaz. */
  it('feragat her raporda var', async () => {
    expect((await analizEt()).json().rapor.feragat.length).toBeGreaterThan(20);
  });
});

/**
 * Rapor kullanıcının dilinde.
 *
 * Motor kod üretiyor (duruş bayrağı, sınırlama kodu, özet parametreleri); cümle sözlükte
 * kuruluyor. Kayda giren motorun izi; çeviremediğimiz bir kodda ona düşülüyor.
 */
describe('rapor dili', () => {
  it('Türkçe kullanıcı Türkçe rapor görüyor', async () => {
    await dilAyarla('tr');
    const rapor = (await analizEt()).json().rapor;

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(rapor.ozet + rapor.feragat)).toBe(true);
  });

  it('İngilizce kullanıcı İngilizce rapor görüyor', async () => {
    await dilAyarla('en');
    const rapor = (await analizEt()).json().rapor;
    const metin = [rapor.ozet, rapor.feragat, ...rapor.sinirlamalar].join(' ');

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(metin)).toBe(false);
  });

  /** Tıbbi cihaz feragati çeviride kaybolamaz; sağlık kuralı, üslup değil. */
  it('İngilizce raporda da tıbbi cihaz feragati var', async () => {
    await dilAyarla('en');
    const feragat = (await analizEt()).json().rapor.feragat;

    expect(feragat.toLowerCase()).toContain('medical device');
    expect(feragat.toLowerCase()).toContain('doctor');
  });

  it('bel/boy mesajı da çevriliyor', async () => {
    await dilAyarla('en');
    const belBoy = (await analizEt()).json().rapor.bel_boy;

    expect(belBoy.mesaj.length).toBeGreaterThan(20);
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(belBoy.mesaj)).toBe(false);

    await dilAyarla('tr');
  });
});
