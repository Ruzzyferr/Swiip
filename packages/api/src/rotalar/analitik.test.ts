import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Analitik uçları.
 *
 * Plan F2'nin "Dikkat" notu: terk oranı ilk günden ölçülmeli. Bu testler o ölçümün
 * gerçekten çalıştığını ve kişisel veri sızdırmadığını doğruluyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

const ANAHTAR = 'test-yonetim-anahtari-en-az-otuz-iki-karakter';

const TEMEL_CEVAPLAR = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K6: 'Hayır',
  K7: 'Evet',
  S2: 'Hayır',
  S3: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
};

beforeAll(async () => {
  process.env.YONETIM_ANAHTARI = ANAHTAR;
  uygulama = await testUygulamasi();
  app = uygulama.app;

  // Üç kullanıcı: biri yarım bıraktı, biri tamamladı, biri hiç başlamadı.
  const yarim = await kullaniciKur('yarim@made2fit.io');
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${yarim}` },
    payload: { cevaplar: TEMEL_CEVAPLAR, blok_id: 'K', son_soru_id: 'S12' },
  });

  const tam = await kullaniciKur('tamamlayan@made2fit.io');
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${tam}` },
    payload: {
      cevaplar: {
        ...TEMEL_CEVAPLAR,
        A1: '1-3 yıl',
        A3: 10,
        E1: 'Spor salonu',
        E3: ['Barbell ve plaka'],
        Z1: '4 gün',
        Z2: '60 dakika',
        Y1: '7-8 saat',
        Y4: 'Masa başı, çoğunlukla oturarak',
        Y6: 4,
        H1: 'Kas kazanımı',
      },
    },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: { authorization: `Bearer ${tam}` },
    payload: {},
  });
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: { authorization: `Bearer ${tam}` },
    payload: { plan: 'pro' },
  });

  await kullaniciKur('baslamayan@made2fit.io');
}, 60_000);

afterAll(async () => {
  delete process.env.YONETIM_ANAHTARI;
  await uygulama?.kapat();
});

async function kullaniciKur(email: string): Promise<string> {
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  return kayit.json().erisim_token;
}

const yonetim = () => ({ 'x-yonetim-anahtari': ANAHTAR });

describe('yönetim kapısı', () => {
  it('anahtarsız istek reddedilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/analitik/terk-noktalari' });

    expect(cevap.statusCode).toBe(403);
  });

  it('yanlış anahtar reddedilir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/terk-noktalari',
      headers: { 'x-yonetim-anahtari': 'yanlis' },
    });

    expect(cevap.statusCode).toBe(403);
  });

  it('kullanıcı tokenı yönetim ucunu açmaz', async () => {
    const token = await kullaniciKur('sizma@made2fit.io');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/donusum',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.statusCode).toBe(403);
  });
});

describe('terk noktaları', () => {
  it('yarım bırakılan değerlendirmenin son sorusunu raporlar', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/terk-noktalari',
      headers: yonetim(),
    });

    expect(cevap.statusCode).toBe(200);
    const govde = cevap.json();
    expect(govde.terk_noktalari.some((t: { soru_id: string }) => t.soru_id === 'S12')).toBe(true);
  });

  it('soru id yanına blok ve soru metnini ekler', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/terk-noktalari',
      headers: yonetim(),
    });

    const s12 = cevap.json().terk_noktalari.find((t: { soru_id: string }) => t.soru_id === 'S12');

    expect(s12.blok).toContain('Sağlık');
    expect(s12.soru_metni).toBeTruthy();
  });

  it('tamamlama oranını hesaplar', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/terk-noktalari',
      headers: yonetim(),
    });

    const govde = cevap.json();
    expect(govde.baslayan).toBeGreaterThan(0);
    expect(govde.tamamlayan).toBeGreaterThan(0);
    expect(govde.tamamlama_orani).toBeGreaterThan(0);
    expect(govde.tamamlama_orani).toBeLessThanOrEqual(100);
  });

  it('kişisel veri döndürmez', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/terk-noktalari',
      headers: yonetim(),
    });

    const metin = JSON.stringify(cevap.json());
    expect(metin).not.toContain('@made2fit.io');
    expect(metin).not.toContain('user_id');
  });
});

describe('blok hunisi', () => {
  it('blokları sırayla ve ulaşan sayısıyla döner', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/blok-hunisi',
      headers: yonetim(),
    });

    expect(cevap.statusCode).toBe(200);
    const huni = cevap.json().huni;
    expect(huni).toHaveLength(10);
    expect(huni[0].blok_id).toBe('K');
    expect(huni[0].baslik).toBeTruthy();
  });

  it('adım oranı darboğazı gösterir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/blok-hunisi',
      headers: yonetim(),
    });

    for (const adim of cevap.json().huni) {
      expect(adim.adim_orani).toBeGreaterThanOrEqual(0);
      expect(adim.ilkten_oran).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('dönüşüm', () => {
  it('kayıttan ödemeye huniyi verir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/donusum',
      headers: yonetim(),
    });

    const govde = cevap.json();
    expect(govde.kayit).toBeGreaterThanOrEqual(3);
    expect(govde.saglik_onayi).toBe(govde.kayit);
    expect(govde.odeyen).toBeGreaterThanOrEqual(1);
  });

  it('fotoğrafsız devam oranını ölçer — gizlilik çekincesinin büyüklüğü', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/donusum',
      headers: yonetim(),
    });

    // Kimse fotoğraf rızası vermedi: oran %100 olmalı.
    expect(cevap.json().fotografsiz_oran).toBe(100);
  });

  it('plan dağılımını verir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/donusum',
      headers: yonetim(),
    });

    expect(cevap.json().planlar.pro).toBeGreaterThanOrEqual(1);
  });
});

describe('birim ekonomisi', () => {
  it('AI kullanımı yokken sıfır maliyet raporlar', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/birim-ekonomisi',
      headers: yonetim(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().toplam_usd).toBe(0);
    expect(cevap.json().hedefin_altinda).toBe(true);
  });

  it('hedef tavanı spec ile aynı', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/birim-ekonomisi',
      headers: yonetim(),
    });

    expect(cevap.json().hedef_tavan_usd).toBe(1.4);
  });

  it('dönem parametresi kabul eder', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/birim-ekonomisi?donem=2026-01',
      headers: yonetim(),
    });

    expect(cevap.json().donem).toBe('2026-01');
  });

  it('geçersiz dönem biçimi reddedilir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/analitik/birim-ekonomisi?donem=ocak',
      headers: yonetim(),
    });

    expect(cevap.statusCode).toBe(400);
  });
});
