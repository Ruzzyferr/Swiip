import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AiCevap, AiIstek } from '@swiip/core';
import { uygulamaOlustur } from '../uygulama';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { besinleriTohumla } from '../db/tohum';
import { PLAN_AYLIK_BUTCE_USD } from '@swiip/core';
import { ai_usage } from '../db/sema';

/**
 * Yemek tanıma ucu (F7).
 *
 * Bitti kriterleri:
 *  - Aynı yemeğin ikinci fotoğrafı AI çağrısı yapmadan tanınıyor.
 *  - Yanlış tanıma sonrası tekrar deneme kota yemiyor.
 *  - Kullanıcı başına aylık maliyet ölçülebiliyor.
 */

let ortam: TestOrtami;
let app: FastifyInstance;
let token: string;

const cagriSayaci = { adet: 0 };
const sonIstek: { deger?: AiIstek } = {};

/** Sahte gateway: gerçek modeli çağırmadan boru hattının tamamını çalıştırır. */
const sahteIstemci = {
  metinUret: vi.fn(async (_istek: AiIstek): Promise<AiCevap> => {
    cagriSayaci.adet += 1;
    sonIstek.deger = _istek;
    return {
      metin: JSON.stringify({
        kalemler: [
          { ad: 'köfte', miktar: 3, birim: 'adet', gram_tahmini: 120 },
          { ad: 'pilav', miktar: 1, birim: 'kepce', gram_tahmini: 90 },
        ],
      }),
      girdi_token: 1200,
      cikti_token: 180,
      model: 'test-gorsel',
    };
  }),
};

/**
 * Test fotografi GERCEK bir JPEG basligiyla basliyor: `/9j/` = FF D8 FF.
 *
 * Eskiden `'x'.repeat(400)` yaziliydi ve testler geciyordu — cunku rota fotografi hic
 * dogrulamiyordu, hatta modele gorsel olarak hic gondermiyordu; base64 duz metin olarak
 * mesaja gomuluyordu. Sahte girdi, gercekte hic calismayan bir ozelligi yesil
 * gosteriyordu. Persona kosusunda sekiz gercek yemek fotografindan sifiri tanindi.
 */
const foto = (tohum: string, uzunluk = 400): string => `/9j/${tohum.repeat(uzunluk)}`;

const FOTOGRAF = foto('x');

beforeAll(async () => {
  ortam = await testVeritabaniAc();
  await besinleriTohumla(ortam.db);

  app = await uygulamaOlustur({
    db: ortam.db,
    aiIstemcisi: sahteIstemci,
    yapilandirma: {
      NODE_ENV: 'test',
      PORT: 0,
      HOST: '127.0.0.1',
      DATABASE_URL: 'pglite://bellek',
      JWT_SECRET: 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar',
      ERISIM_TOKEN_OMRU: '15m',
      YENILEME_TOKEN_GUN: 30,
      KIMLIK_ISTEK_SINIRI: 10_000,
      POSTA_GONDEREN: 'Swiip <test@swiip.app>',
      LOG_SEVIYESI: 'fatal',
      CORS_KAYNAKLAR: '*',
    },
  });
  await app.ready();

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'tanima@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: { authorization: `Bearer ${token}` },
    payload: { plan: 'pro' },
  });
}, 60_000);

afterAll(async () => {
  await app?.close();
  await ortam?.kapat();
});

const yetkili = () => ({ authorization: `Bearer ${token}` });

async function tani(govde: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: '/v1/beslenme/tani',
    headers: yetkili(),
    payload: { fotograf: FOTOGRAF, ...govde },
  });
}

describe('POST /v1/beslenme/tani', () => {
  it('fotoğraftan kalem listesi ve miktar çıkarır', async () => {
    const cevap = await tani();

    expect(cevap.statusCode).toBe(200);
    const govde = cevap.json();
    expect(govde.kalemler).toHaveLength(2);
    expect(govde.kalemler[0].ad).toBe('köfte');
    expect(govde.kalemler[0].miktar).toBe(3);
  });

  it('besin değeri veritabanından hesaplanır, modelden değil', async () => {
    const cevap = await tani({ fotograf: foto('y', 400) });
    const govde = cevap.json();

    expect(govde.toplam.kalori).toBeGreaterThan(0);
    // Model kalori üretmedi; toplam eşleşen besinlerin bileşiminden geldi.
    expect(govde.kalemler.every((k: { eslesti: boolean }) => typeof k.eslesti === 'boolean')).toBe(
      true,
    );
  });

  it('kullanıcı onaylamadan hiçbir şey kaydedilmez', async () => {
    const cevap = await tani({ fotograf: foto('z', 400) });

    expect(cevap.json().onay_bekliyor).toBe(true);

    const gun = await app.inject({
      method: 'GET',
      url: `/v1/beslenme/gun/${new Date().toISOString().slice(0, 10)}`,
      headers: yetkili(),
    });
    expect(gun.json().kayitlar).toHaveLength(0);
  });

  it('aynı fotoğrafın ikincisi AI çağrısı yapmadan tanınır', async () => {
    const benzersiz = foto('a', 500);
    await tani({ fotograf: benzersiz });
    const oncekiSayac = cagriSayaci.adet;

    const ikinci = await tani({ fotograf: benzersiz });

    expect(cagriSayaci.adet).toBe(oncekiSayac);
    expect(ikinci.json().kaynak).toBe('onbellek');
  });

  it('önbellekten gelen tanıma kotadan düşmez', async () => {
    const benzersiz = foto('b', 500);
    await tani({ fotograf: benzersiz });

    const oncesi = await kotaOku();
    const ikinci = await tani({ fotograf: benzersiz });
    const sonrasi = await kotaOku();

    expect(ikinci.json().kota.dusuldu).toBe(false);
    expect(sonrasi.kullanilan).toBe(oncesi.kullanilan);
  });

  /**
   * Bu iki test, kaldırılan `tekrar_deneme` alanının yerini alıyor.
   *
   * Eski test "yeni bir fotoğrafla `tekrar_deneme: true` gönder, kota düşmesin" diyordu
   * ve geçiyordu — çünkü kararı istemci veriyordu. Yani test, sınırsız bedava AI'a açılan
   * kapıyı DOĞRU davranış olarak koruyordu. Kuralın kendisi geçerli; uygulanma yeri yanlıştı.
   */
  it('istemci gönderdiği alanla kotayı atlatamaz', async () => {
    const oncesi = await kotaOku();

    // Şema artık bu alanı tanımıyor; gönderilse de yok sayılır ve kota normal düşer.
    const cevap = await tani({ fotograf: foto('c', 500), tekrar_deneme: true });
    const sonrasi = await kotaOku();

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kota.dusuldu).toBe(true);
    expect(sonrasi.kullanilan).toBe(oncesi.kullanilan + 1);
  });

  it('başarısız tanıma kotadan düşmez — hak geri veriliyor', async () => {
    const oncesi = await kotaOku();

    sahteIstemci.metinUret.mockImplementationOnce(async () => {
      throw new Error('model şu an cevap vermiyor');
    });

    const cevap = await tani({ fotograf: foto('e', 500) });
    expect(cevap.statusCode).toBeGreaterThanOrEqual(400);

    const sonrasi = await kotaOku();
    expect(sonrasi.kullanilan, 'başarısız deneme kotadan düşmemeli').toBe(oncesi.kullanilan);
  });

  it('normal tanıma kotadan düşer', async () => {
    const oncesi = await kotaOku();

    await tani({ fotograf: foto('d', 500) });
    const sonrasi = await kotaOku();

    expect(sonrasi.kullanilan).toBe(oncesi.kullanilan + 1);
  });

  it('kota adaleti sayaçları ayrı tutulur', async () => {
    const durum = await app.inject({
      method: 'GET',
      url: '/v1/abonelik/durum',
      headers: yetkili(),
    });

    const kotadanDusmeyen = durum.json().kota.kotadan_dusmeyen;
    expect(kotadanDusmeyen.onbellek_isabeti).toBeGreaterThan(0);
    expect(kotadanDusmeyen.hatali_tanima_tekrari).toBeGreaterThan(0);
  });
});

describe('POST /v1/beslenme/tani/onayla', () => {
  it('onaylanan kalemler güne kaydedilir', async () => {
    const tanima = await tani({ fotograf: foto('e', 500) });
    const govde = tanima.json();
    const eslesen = govde.kalemler.find((k: { eslesti: boolean }) => k.eslesti);

    const onay = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/tani/onayla',
      headers: yetkili(),
      payload: {
        photo_hash: govde.photo_hash,
        gun: '2026-08-20',
        kalemler: [
          { ad: eslesen.ad, food_id: eslesen.besin.id, gram: eslesen.gram, miktar: eslesen.miktar },
        ],
      },
    });

    expect(onay.statusCode).toBe(200);
    expect(onay.json().kayit_sayisi).toBe(1);

    const gun = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/gun/2026-08-20',
      headers: yetkili(),
    });
    expect(gun.json().kayitlar).toHaveLength(1);
    expect(gun.json().kayitlar[0].entry_method).toBe('foto');
  });

  it('düzeltme global eşleme tablosuna yazılır', async () => {
    const besin = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=İzmir',
      headers: yetkili(),
    });
    const izmirKofte = besin.json().sonuclar[0];

    // Aynı düzeltme iki kez: eşik iki onayda dolar.
    for (const gun of ['2026-08-21', '2026-08-22']) {
      await app.inject({
        method: 'POST',
        url: '/v1/beslenme/tani/onayla',
        headers: yetkili(),
        payload: {
          photo_hash: 'sabit-hash',
          gun,
          kalemler: [{ ad: 'köfte', food_id: izmirKofte.id, gram: 200, miktar: 1 }],
        },
      });
    }

    const yeni = await tani({ fotograf: foto('f', 500) });
    const kofte = yeni.json().kalemler.find((k: { ad: string }) => k.ad === 'köfte');

    expect(kofte.besin.id).toBe(izmirKofte.id);
  });

  it('olmayan besin onaylanamaz', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/tani/onayla',
      headers: yetkili(),
      payload: {
        photo_hash: 'abcdefgh',
        kalemler: [
          {
            ad: 'hayalet',
            food_id: '00000000-0000-0000-0000-000000000000',
            gram: 100,
            miktar: 1,
          },
        ],
      },
    });

    expect(cevap.statusCode).toBe(404);
  });
});

describe('maliyet izleme (F7.8)', () => {
  it('kullanıcı başına aylık AI maliyeti ölçülebiliyor', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/maliyet',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    const govde = cevap.json();
    expect(govde.cagri_sayisi).toBeGreaterThan(0);
    expect(govde.toplam_usd).toBeGreaterThan(0);
    expect(govde.onbellek_isabeti).toBeGreaterThan(0);
  });

  it('ölçülen maliyet spec bütçesinin çok altında kalır', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/maliyet',
      headers: yetkili(),
    });

    // Birkaç çağrı için sent düzeyinde; aylık 250 çağrı bütçesi ~$0,35-0,70.
    expect(cevap.json().toplam_usd).toBeLessThan(0.05);
  });

  it('önbellek istatistiği kaç çağrı kurtardığını gösterir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/onbellek',
      headers: yetkili(),
    });

    expect(cevap.json().toplam_isabet).toBeGreaterThan(0);
    expect(cevap.json().not).toContain('kurtardı');
  });
});

describe('plan kilidi', () => {
  it('Temel planda fotoğraf tanıma kapalıdır ve nedeni açıkça söylenir', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'temel' },
    });

    const cevap = await tani({ fotograf: foto('g', 500) });

    expect(cevap.statusCode).toBe(402);
    expect(cevap.json().mesaj).toContain('Pro');
    expect(cevap.json().mesaj).toContain('sınırsız');

    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'pro' },
    });
  });
});

async function kotaOku(): Promise<{ kullanilan: number }> {
  const durum = await app.inject({
    method: 'GET',
    url: '/v1/abonelik/durum',
    headers: yetkili(),
  });
  return { kullanilan: durum.json().kota.yemek_tanima.kullanilan };
}

describe('AI bütçesi (F7.8 · birim ekonomisi)', () => {
  /**
   * Maliyet uçtan görünür olmalı: bir kullanıcının bütçesinin neresinde olduğunu
   * ölçemezsek, marjın nerede kaybedildiğini de göremeyiz.
   */
  it('maliyet cevabı plan bütçesine göre kullanım oranı verir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/maliyet',
      headers: yetkili(),
    });

    const govde = cevap.json();
    expect(govde.butce_usd).toBeGreaterThan(0);
    expect(govde.kullanim_yuzdesi).toBeGreaterThanOrEqual(0);
    expect(typeof govde.ucuza_dus).toBe('boolean');
  });

  /**
   * Tanıma **bütçe yüzünden bozulmuyor.**
   *
   * Tanıma zaten en ucuz görsel seviyeden yapılıyor; inecek bir kademe yok. Geriye kalan
   * tek kaldıraç çıktı uzunluğu, ama tanıma çıktısı bir JSON kalem listesi: kısaltmak
   * listeyi ortasından keser, yani ödeme yapan kullanıcıya bozuk sonuç döner.
   *
   * Bütçe burada ölçülüyor ve raporlanıyor, uygulanmıyor. Marjı koruma yeri koç sohbeti;
   * orada kısalan şey anlatım, sayı değil.
   */
  it('bütçe aşılsa da tanıma kalitesi düşmez', async () => {
    const { id } = await app
      .inject({ method: 'GET', url: '/v1/kimlik/ben', headers: yetkili() })
      .then((c) => c.json());

    const oncekiTavan = sonIstek.deger?.max_cikti_token;
    expect(oncekiTavan).toBeGreaterThan(0);

    await ortam.db.insert(ai_usage).values({
      user_id: id,
      is_tipi: 'yemek_tanima',
      model: 'test',
      girdi_token: 1,
      cikti_token: 1,
      maliyet_usd: String(PLAN_AYLIK_BUTCE_USD.pro * 2),
    });

    // Önbelleğe düşmemesi için farklı bir fotoğraf.
    const cevap = await tani({ fotograf: foto('y', 420) });

    expect(cevap.statusCode).toBe(200);
    expect(sonIstek.deger!.max_cikti_token).toBe(oncekiTavan);
    expect(cevap.json().kalemler.length).toBeGreaterThan(0);
  });

  /** Bütçe aşılsa bile hizmet kesilmiyor: kota zaten üst sınırı koyuyor. */
  it('bütçe hizmet kesmiyor', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/maliyet',
      headers: yetkili(),
    });

    expect(cevap.json().hizmet_kesildi).toBe(false);
  });
});
