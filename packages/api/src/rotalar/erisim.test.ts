import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Uç erişim sözleşmesi.
 *
 * `CLAUDE.md`'deki kilitli karar: türettiğimiz Türkçe hareket kütüphanesi rakibe açılmaz.
 * wger'in CC-BY-SA lisansı tam bu yüzden reddedildi. Aynı kütüphaneyi kimlik doğrulaması
 * olmadan HTTP üzerinden servis etmek, reddettiğimiz şeyi kendi elimizle yapmak olur:
 * tek bir `curl` ile 122 hareketin Türkçe talimatı indirilebilir.
 *
 * Aynısı 134 soruluk değerlendirme bankası için de geçerli — ürünün ayrıştığı yer o.
 *
 * Fiyat listesi bilinçli olarak açık: mağaza incelemesi ve şeffaflık bunu gerektiriyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'erisim@made2fit.io', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const KORUNMASI_GEREKEN = [
  '/v1/hareket/',
  '/v1/hareket/surum',
  '/v1/hareket/plank',
  '/v1/degerlendirme/sorular',
  '/v1/koc/araclar',
];

describe('korunması gereken uçlar', () => {
  it.each(KORUNMASI_GEREKEN)('%s oturumsuz erişilemez', async (url) => {
    const cevap = await app.inject({ method: 'GET', url });

    expect(cevap.statusCode).toBe(401);
  });

  it.each(KORUNMASI_GEREKEN)('%s oturumla erişilebilir', async (url) => {
    const cevap = await app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.statusCode).toBe(200);
  });

  it('hareket talimatları oturumsuz sızmaz', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/hareket/' });

    expect(JSON.stringify(cevap.json())).not.toContain('talimat_tr');
  });
});

describe('bilinçli olarak açık uçlar', () => {
  it('fiyat listesi oturumsuz okunabilir — mağaza şeffaflığı gereği', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/abonelik/planlar' });

    expect(cevap.statusCode).toBe(200);
  });

  it('sağlık kontrolü oturumsuz okunabilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/saglik' });

    expect(cevap.statusCode).toBe(200);
  });

  it('kayıt ve giriş oturumsuz çalışır', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { email: 'erisim@made2fit.io', parola: 'Kirmizi-Bisiklet-42' },
    });

    expect(cevap.statusCode).toBe(200);
  });
});

/**
 * Hata gövdesi sözleşmesi.
 *
 * İstemci `kod` alanına bakarak davranış seçiyor (`ApiHatasi.kod`). Bazı uçların `hata`
 * alanı göndermesi, o uçlarda istemcinin hatayı sınıflandıramaması demek — kullanıcı
 * "bilinmeyen hata" görür, oysa sunucu ne olduğunu biliyordu.
 */
describe('hata gövdesi sözleşmesi', () => {
  it('sınır aşımında kod alanı döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/hareket/' });

    expect(cevap.json()).toHaveProperty('kod');
    expect(cevap.json()).toHaveProperty('mesaj');
  });

  it('yetkisiz istekte kod alanı döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/degerlendirme/sorular' });

    expect(cevap.json().kod).toBeTruthy();
  });

  it('doğrulama hatasında kod alanı döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { email: 'gecersiz' },
    });

    expect(cevap.json().kod).toBe('gecersiz_istek');
  });

  it('hiçbir uç `hata` alanıyla cevap vermiyor — tek sözleşme', async () => {
    const kaynakDosyalar = ['rotalar/kimlik.ts', 'rotalar/abonelik.ts'];
    const { readFile } = await import('node:fs/promises');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const kok = join(dirname(fileURLToPath(import.meta.url)), '..');

    for (const dosya of kaynakDosyalar) {
      const kaynak = await readFile(join(kok, dosya), 'utf8');
      expect(kaynak, dosya).not.toMatch(/send\(\{\s*hata:/);
    }
  });
});

/**
 * Görsel girdi boyutu.
 *
 * Kota çağrı sayısını sınırlıyor, maliyeti değil. Sınırsız fotoğraf boyutu, kotası
 * dolmamış tek bir kullanıcının aylık marjı yakmasına yeter.
 */
describe('fotoğraf boyutu sınırı', () => {
  const buyukFotograf = 'A'.repeat(4 * 1024 * 1024);

  it('aşırı büyük yemek fotoğrafı reddedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/tani',
      headers: { authorization: `Bearer ${token}` },
      payload: { fotograf: buyukFotograf },
    });

    expect(cevap.statusCode).toBe(400);
  });

  it('aşırı büyük vücut fotoğrafı reddedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: { authorization: `Bearer ${token}` },
      payload: { fotograflar: [{ poz: 'on', veri: buyukFotograf }] },
    });

    expect(cevap.statusCode).toBe(400);
  });

  it('red mesajı ne yapılacağını söylüyor', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/tani',
      headers: { authorization: `Bearer ${token}` },
      payload: { fotograf: buyukFotograf },
    });

    expect(cevap.json().mesaj.toLocaleLowerCase('tr-TR')).toMatch(/küçült|boyut|büyük/);
  });
});
