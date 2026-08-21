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

const OLCULER = { bel_cm: 92, boyun_cm: 39, kalca_cm: 100 };

/**
 * Her testin KENDİ kullanıcısı var.
 *
 * Vücut analizi hakkı ücretsiz planda ömür boyu bir kez. Bu dosya eskiden tek kullanıcıyla
 * defalarca analiz yapıyordu — hak kontrolü uygulanmadığı için çalışıyordu. Kontrol
 * eklendiğinde testler düştü ve doğrusu buydu: sınırı test uğruna gevşetmek, sınırı
 * kaldırmakla aynı şey.
 */
let sayac = 0;

async function yeniKullanici(dil?: 'tr' | 'en'): Promise<string> {
  sayac += 1;
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: {
      email: `vucut${sayac}@swiip.app`,
      parola: 'Kirmizi-Bisiklet-42',
      saglik_onayi: true,
    },
  });
  const yeniToken: string = kayit.json().erisim_token;

  // Boy, cinsiyet ve doğum tarihi değerlendirmeden geliyor (K1-K3).
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${yeniToken}` },
    payload: { cevaplar: { K1: '1994-05-01', K2: 'Erkek', K3: 178, K4: 82 } },
  });

  if (dil) {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: { authorization: `Bearer ${yeniToken}` },
      payload: { dil },
    });
  }

  return yeniToken;
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

/** Tek seferlik hakkı olan taze bir kullanıcıyla analiz yapar. */
async function analizEt(dil?: 'tr' | 'en') {
  const t = await yeniKullanici(dil);
  return app.inject({
    method: 'POST',
    url: '/v1/vucut/analiz',
    headers: { authorization: `Bearer ${t}` },
    payload: { olculer: OLCULER },
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
    const rapor = (await analizEt('tr')).json().rapor;

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(rapor.ozet + rapor.feragat)).toBe(true);
  });

  it('İngilizce kullanıcı İngilizce rapor görüyor', async () => {
    const rapor = (await analizEt('en')).json().rapor;
    const metin = [rapor.ozet, rapor.feragat, ...rapor.sinirlamalar].join(' ');

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(metin)).toBe(false);
  });

  /** Tıbbi cihaz feragati çeviride kaybolamaz; sağlık kuralı, üslup değil. */
  it('İngilizce raporda da tıbbi cihaz feragati var', async () => {
    const feragat = (await analizEt('en')).json().rapor.feragat;

    expect(feragat.toLowerCase()).toContain('medical device');
    expect(feragat.toLowerCase()).toContain('doctor');
  });

  it('bel/boy mesajı da çevriliyor', async () => {
    const belBoy = (await analizEt('en')).json().rapor.bel_boy;

    expect(belBoy.mesaj.length).toBeGreaterThan(20);
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(belBoy.mesaj)).toBe(false);
  });
});
