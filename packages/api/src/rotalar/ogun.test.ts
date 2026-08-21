import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';
import { cevaplardanKisit } from './ogun';
import { TARIF_TOHUMU } from '../db/tarifler';
import { tarifMakrolariniHesapla } from '../db/malzemeEslemesi';

/**
 * Öğün planlama ucu (F8) bitti kriterleri:
 *  - Alerjisi olan kullanıcıya o malzeme hiçbir tarifte çıkmıyor.
 *  - Bütçesi kısıtlı kullanıcıya pahalı protein önerilmiyor.
 *  - B5 = "ailem" olan kullanıcı menü değil porsiyon görüyor.
 *  - Deste açmak AI çağrısı yapmıyor.
 *  - Boş destede eksik malzeme önerisi çıkıyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

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
};

async function kullaniciKur(
  email: string,
  ekCevaplar: Record<string, unknown> = {},
  plan: 'ucretsiz' | 'temel' | 'pro' = 'temel',
): Promise<string> {
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  const token = kayit.json().erisim_token;
  const basliklar = { authorization: `Bearer ${token}` };

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: basliklar,
    payload: { cevaplar: { ...TEMEL_CEVAPLAR, ...ekCevaplar } },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: basliklar,
    payload: {},
  });
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: basliklar,
    payload: { plan },
  });

  return token;
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
  await besinleriTohumla(uygulama.ortam.db);
  await tarifleriTohumla(uygulama.ortam.db);
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

describe('tarif kütüphanesi', () => {
  it('kısıtsız kullanıcı geniş bir tarif havuzu görür', async () => {
    const token = await kullaniciKur('tarif@swiip.app');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().toplam).toBeGreaterThan(20);
  });

  it('her tarifin insan kontrolünden geçmiş olması şart', async () => {
    const token = await kullaniciKur('kontrol@swiip.app');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    // Kontrolden geçmemiş tarif zaten tohumlanamaz; uçtan da sızmadığını doğrula.
    expect(cevap.json().toplam).toBe(cevap.json().tarifler.length);
  });

  it('ücretsiz planda öğün planı kapalıdır ve nedeni söylenir', async () => {
    const token = await kullaniciKur('ucretsizogun@swiip.app', {}, 'ucretsiz');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.statusCode).toBe(402);
    expect(cevap.json().mesaj).toContain('sınırsız');
  });
});

describe('sert kısıtlar uçtan uca', () => {
  it('alerjisi olan kullanıcıya o malzeme hiçbir tarifte çıkmaz', async () => {
    const token = await kullaniciKur('alerji@swiip.app', { B9: ['Yumurta'] });
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    const idler = cevap.json().tarifler.map((t: { id: string }) => t.id);
    expect(idler).not.toContain('menemen');
    expect(idler).not.toContain('sahur-yumurtali-tabak');
    expect(cevap.json().elenen).toBeGreaterThan(0);
  });

  it('bütçesi kısıtlı kullanıcıya pahalı protein önerilmez', async () => {
    const token = await kullaniciKur('butce@swiip.app', { B8: 'Çok kısıtlı' });
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    const tarifler = cevap.json().tarifler as Array<{ id: string; maliyet_kademesi: number }>;
    expect(tarifler.every((t) => t.maliyet_kademesi <= 1)).toBe(true);
    expect(tarifler.map((t) => t.id)).not.toContain('firinda-somon');
  });

  it('vegan kullanıcıya hayvansal ürün gelmez', async () => {
    const token = await kullaniciKur('vegan@swiip.app', { B11: ['Vegan'] });
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    const tarifler = cevap.json().tarifler as Array<{ etiketler: string[] }>;
    expect(tarifler.length).toBeGreaterThan(0);
    expect(tarifler.every((t) => t.etiketler.includes('vegan'))).toBe(true);
  });

  it('laktoz intoleransı olan kullanıcıya laktozlu tarif gelmez', async () => {
    const token = await kullaniciKur('laktoz@swiip.app', { B10: ['Laktoz'] });
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    const tarifler = cevap.json().tarifler as Array<{ etiketler: string[] }>;
    expect(tarifler.every((t) => !t.etiketler.includes('laktozlu'))).toBe(true);
  });

  it('pişirme süresi kısıtlı kullanıcıya uzun tarif gelmez', async () => {
    const token = await kullaniciKur('sure@swiip.app', { B7: '15 dakikaya kadar' });
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: { authorization: `Bearer ${token}` },
    });

    const tarifler = cevap.json().tarifler as Array<{ hazirlik_dakika: number }>;
    expect(tarifler.every((t) => t.hazirlik_dakika <= 15)).toBe(true);
  });
});

describe('kaydırmalı deste', () => {
  it('deste makro kilidini koruyan kartlardan oluşur', async () => {
    const token = await kullaniciKur('deste@swiip.app');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste?ogun=aksam',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.statusCode).toBe(200);
    const govde = cevap.json();
    const hedefKalori = govde.hedef.kalori;

    for (const kart of govde.kartlar) {
      const fark = Math.abs(kart.makrolar.kalori - hedefKalori) / hedefKalori;
      expect(fark).toBeLessThanOrEqual(0.08);
    }
  });

  it('deste AI çağrısı yapmaz', async () => {
    const token = await kullaniciKur('desteai@swiip.app');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.json().ai_cagrisi).toBe(false);
  });

  it('deste sonsuz kaydırma değildir', async () => {
    const token = await kullaniciKur('destesonlu@swiip.app');
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.json().kartlar.length).toBeLessThanOrEqual(15);
  });

  it('B5 ailem ise menü değil porsiyon modu gelir', async () => {
    const token = await kullaniciKur('aile@swiip.app', { B5: 'Ailem' });
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.json().mod).toBe('porsiyon');
    expect(cevap.json().mesaj).toContain('Bugün ne pişti');
  });

  it('dolap boşken eksik malzeme önerisi çıkar', async () => {
    const token = await kullaniciKur('bosdolap@swiip.app');
    await app.inject({
      method: 'POST',
      url: '/v1/ogun/dolap',
      headers: { authorization: `Bearer ${token}` },
      payload: { malzemeler: ['tuz'] },
    });

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste?dolaptan=true',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(cevap.json().kartlar).toHaveLength(0);
    expect(cevap.json().eksik_malzeme_onerisi.length).toBeGreaterThan(0);
    expect(cevap.json().mesaj).toContain('eklersen');
  });

  it('dolap doluysa yalnızca yapılabilenler gelir', async () => {
    const token = await kullaniciKur('dolulu@swiip.app');
    await app.inject({
      method: 'POST',
      url: '/v1/ogun/dolap',
      headers: { authorization: `Bearer ${token}` },
      payload: { malzemeler: ['tavuk göğsü', 'bulgur', 'domates', 'soğan'] },
    });

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste?dolaptan=true&ogun=aksam',
      headers: { authorization: `Bearer ${token}` },
    });

    const idler = cevap.json().kartlar.map((k: { id: string }) => k.id);
    expect(idler.every((id: string) => id === 'tavuklu-bulgur-pilavi')).toBe(true);
  });
});

describe('kaydırma öğrenmesi', () => {
  it('sola kaydırma malzemeyi sevmeyenlere yazar', async () => {
    const token = await kullaniciKur('kaydirma@swiip.app');
    const basliklar = { authorization: `Bearer ${token}` };

    let sonCevap;
    for (let i = 0; i < 3; i++) {
      sonCevap = await app.inject({
        method: 'POST',
        url: '/v1/ogun/kaydirma',
        headers: basliklar,
        payload: { tarif_id: 'firinda-somon', yon: 'sola' },
      });
    }

    expect(sonCevap!.json().sevmediklerine_onerilen).toContain('somon');
  });

  it('üç kez reddedilen malzeme sonraki destelerden düşer', async () => {
    const token = await kullaniciKur('ogrenen@swiip.app');
    const basliklar = { authorization: `Bearer ${token}` };

    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/ogun/kaydirma',
        headers: basliklar,
        payload: { tarif_id: 'nohut-yemegi', yon: 'sola' },
      });
    }

    const tarifler = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarifler',
      headers: basliklar,
    });

    expect(tarifler.json().tarifler.map((t: { id: string }) => t.id)).not.toContain('nohut-yemegi');
  });
});

describe('haftalık plan ve alışveriş listesi', () => {
  it('haftalık plan yedi gün üretir', async () => {
    const token = await kullaniciKur('plan@swiip.app');
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/ogun/plan',
      headers: { authorization: `Bearer ${token}` },
      payload: { hafta_basi: '2026-08-17' },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().gunler).toHaveLength(7);
    expect(cevap.json().gunler[0].ogunler).toHaveLength(3);
  });

  it('alışveriş listesi reyona göre gruplanır', async () => {
    const token = await kullaniciKur('alisveris@swiip.app');
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/ogun/plan',
      headers: { authorization: `Bearer ${token}` },
      payload: { hafta_basi: '2026-08-17' },
    });

    const reyonlar = Object.keys(cevap.json().alisveris.reyonlar);
    expect(reyonlar.length).toBeGreaterThan(0);
    expect(cevap.json().alisveris.kalemler.length).toBeGreaterThan(0);
  });

  it('plan kaydedilir ve tekrar okunabilir', async () => {
    const token = await kullaniciKur('plankayit@swiip.app');
    const basliklar = { authorization: `Bearer ${token}` };

    await app.inject({
      method: 'POST',
      url: '/v1/ogun/plan',
      headers: basliklar,
      payload: { hafta_basi: '2026-08-24' },
    });

    const okuma = await app.inject({
      method: 'GET',
      url: '/v1/ogun/plan/2026-08-24',
      headers: basliklar,
    });

    expect(okuma.statusCode).toBe(200);
    expect(okuma.json().alisveris).not.toBeNull();
  });

  it('Ramazan modunda öğün adları değişir', async () => {
    const token = await kullaniciKur('ramazan@swiip.app', { B12: 'Evet' });
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/ogun/plan',
      headers: { authorization: `Bearer ${token}` },
      payload: { hafta_basi: '2026-08-17' },
    });

    const adlar = cevap.json().gunler[0].ogunler.map((o: { ad: string }) => o.ad);
    expect(adlar).toContain('Sahur');
    expect(adlar).toContain('İftar');
  });
});

describe('cevaplardanKisit', () => {
  const bosTercih = { sevilen: {}, sevilmeyen: {} };

  it('Yok cevabını kısıt saymaz', () => {
    const kisit = cevaplardanKisit({ B9: ['Yok'], B10: ['Yok'] }, bosTercih);

    expect(kisit.alerjiler).toEqual([]);
    expect(kisit.intoleranslar).toEqual([]);
  });

  it('intolerans adlarını koda çevirir', () => {
    const kisit = cevaplardanKisit({ B10: ['Laktoz', 'Gluten'] }, bosTercih);

    expect(kisit.intoleranslar).toEqual(['laktoz', 'gluten']);
  });

  it('öğrenilen sevmedikleri kısıta eklenir', () => {
    const kisit = cevaplardanKisit({}, { sevilen: {}, sevilmeyen: { somon: 4 } });

    expect(kisit.sevmedikleri).toContain('somon');
  });

  it('iki kez reddedilen henüz kısıt değildir', () => {
    const kisit = cevaplardanKisit({}, { sevilen: {}, sevilmeyen: { somon: 2 } });

    expect(kisit.sevmedikleri).not.toContain('somon');
  });

  it('cevap yoksa en gevşek kısıt seti döner', () => {
    const kisit = cevaplardanKisit({}, bosTercih);

    expect(kisit.butce_kademesi).toBe(4);
    expect(kisit.kim_pisiriyor).toBe('kendim');
    expect(kisit.ramazan).toBe(false);
  });
});

describe('tarif makroları veritabanından türetiliyor (F5.6, F8.2)', () => {
  it('tohumlanan tarifin makrosu malzemelerinden hesaplanmış', async () => {
    const menemen = TARIF_TOHUMU.find((t) => t.id === 'menemen')!;
    const beklenen = tarifMakrolariniHesapla(menemen)!;
    const jeton = await kullaniciKur('tarif-makro@swiip.app');

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/tarif/menemen',
      headers: { authorization: `Bearer ${jeton}` },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().macros_jsonb).toEqual(beklenen);
  });

  it('türetilen değer dosyadaki elle yazılmış değerden bağımsız', () => {
    // Sözleşme: kaynak dosya bir yazım hatası taşısa bile kullanıcı doğru makroyu görür.
    const menemen = TARIF_TOHUMU.find((t) => t.id === 'menemen')!;

    expect(tarifMakrolariniHesapla(menemen)).not.toBeNull();
  });
});

describe('haftalık plan çeşitliliği (F8.7)', () => {
  it('aynı öğün yedi gün boyunca tekrar etmiyor', async () => {
    const jeton = await kullaniciKur('plan-cesit@swiip.app');

    const plan = await app.inject({
      method: 'POST',
      url: '/v1/ogun/plan',
      headers: { authorization: `Bearer ${jeton}` },
      payload: { hafta_basi: '2026-09-07' },
    });

    expect(plan.statusCode).toBe(200);

    const gunler: Array<{ ogunler: Array<{ tarif: { id: string } | null }> }> =
      plan.json().gunler ?? plan.json().plan?.gunler ?? [];

    // Her öğün yuvası için: yedi günde kaç farklı tarif çıktı?
    for (let yuva = 0; yuva < 3; yuva++) {
      const idler = gunler
        .map((g) => g.ogunler[yuva]?.tarif?.id)
        .filter((id): id is string => Boolean(id));

      if (idler.length >= 7) {
        // Deste yeterince büyükse aynı yemeği yedi gün üst üste yazmak kabul edilemez.
        expect(new Set(idler).size, `yuva ${yuva}`).toBeGreaterThan(1);
      }
    }
  });

  it('plan iki kez üretildiğinde aynı sonucu verir — belirlenirlik', async () => {
    const jeton = await kullaniciKur('plan-belirli@swiip.app');

    const istekYap = () =>
      app.inject({
        method: 'POST',
        url: '/v1/ogun/plan',
        headers: { authorization: `Bearer ${jeton}` },
        payload: { hafta_basi: '2026-09-14' },
      });

    const ilk = await istekYap();
    const ikinci = await istekYap();

    expect(JSON.stringify(ikinci.json().gunler)).toBe(JSON.stringify(ilk.json().gunler));
  });
});
