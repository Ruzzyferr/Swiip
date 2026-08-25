import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { uygulamaOlustur } from '../uygulama';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { body_analyses } from '../db/sema';
import { eq } from 'drizzle-orm';

/**
 * Vücut analizi hakkı EŞZAMANLI istekte de tek kalıyor mu?
 *
 * `vucutHakki.test.ts` hakkın uygulandığını sıralı isteklerle gösteriyordu ve yeşildi.
 * Göremediği şey aradaki boşluktu: kontrol ile kaydın yazılması arasında görsel AI
 * çağrısı var ve saniyeler sürüyor. O aralıkta gelen ikinci istek de kontrolü geçiyor,
 * çünkü henüz sayılacak bir satır yok.
 *
 * Bedeli iki kat: ücretsiz kullanıcı ömür boyu **bir** olan hakkını çift dokunuşla iki
 * analize çeviriyor, ve iki görsel çağrısının parası gidiyor. Ürünün bilinen en büyük
 * riski birim ekonomisi; tetiklemesi de tek bir çift dokunuş.
 *
 * Testin işe yaraması için sahte modelin YAVAŞ olması şart. Anında dönen bir sahte
 * istemciyle pencere kapanır ve test, kod bozukken bile yeşil kalır — nitekim bu kusur
 * tam da bu yüzden fark edilmeden durdu.
 */

let ortam: TestOrtami;
let app: FastifyInstance;
let token: string;
let kullaniciId: string;

/** Çağrının ortasında ikinci isteğe yer açacak kadar bekleyen sahte görsel model. */
const GECIKME_MS = 300;
const gorselCagrilari = vi.fn();
/** Sonraki çağrı patlasın mı? Rezervasyonun iade edildiğini görmek için. */
let modelPatlasin = false;

const sahteIstemci = {
  metinUret: vi.fn(async () => {
    gorselCagrilari();
    await new Promise((c) => setTimeout(c, GECIKME_MS));
    if (modelPatlasin) throw new Error('gorsel model 500 dondu');
    return {
      metin: JSON.stringify({ yag_orani: 18, kas_dagilimi: { gogus: 3 }, durus_bayraklari: [] }),
      girdi_token: 900,
      cikti_token: 120,
      model: 'test-gorsel',
    };
  }),
};

/**
 * Gerçek bir JPEG başlığı şart.
 *
 * Önce `'a'.repeat(4000)` yazılıydı ve test yeşil görünüyordu — oysa `gorselHazirla`
 * tanımadığı içeriği eliyor, `fotografiAnalizEt` erken dönüyor ve model HİÇ
 * çağrılmıyordu. Yani testin ölçtüğünü sandığı gecikme hiç yaşanmıyordu.
 */
const JPEG_BASI = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const FOTOGRAF = {
  poz: 'on' as const,
  veri: Buffer.concat([JPEG_BASI, Buffer.alloc(3000, 0x20)]).toString('base64'),
};

beforeAll(async () => {
  ortam = await testVeritabaniAc();
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
    payload: { email: 'yaris@swiip.app', parola: 'Yesil-Defter-91', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;
  kullaniciId = kayit.json().kullanici.id;

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${token}` },
    payload: { cevaplar: { K1: '1994-05-01', K2: 'Erkek', K3: 178, K4: 82 } },
  });

  // Fotoğraflı akış ayrı açık rıza istiyor (KVKK).
  await app.inject({
    method: 'POST',
    url: '/v1/vucut/foto-riza',
    headers: { authorization: `Bearer ${token}` },
    payload: { onay: true },
  });
}, 60_000);

afterAll(async () => {
  await app?.close();
  await ortam?.kapat();
});

const analizEt = () =>
  app.inject({
    method: 'POST',
    url: '/v1/vucut/analiz',
    headers: { authorization: `Bearer ${token}` },
    payload: { fotograflar: [FOTOGRAF] },
  });

describe('ücretsiz planda eşzamanlı vücut analizi', () => {
  it('aynı anda gelen iki istekten yalnızca biri geçiyor', async () => {
    const [ilk, ikinci] = await Promise.all([analizEt(), analizEt()]);
    const kodlar = [ilk.statusCode, ikinci.statusCode].sort();

    expect(kodlar, 'biri 200 biri 403 olmalı; iki 200 hakkın delindiği anlamına gelir').toEqual([
      200, 403,
    ]);

    const reddedilen = ilk.statusCode === 403 ? ilk : ikinci;
    expect(reddedilen.json().kod).toBe('analiz_hakki_bitti');
  });

  it('deftere tek satır yazılıyor ve o satır tamamlanmış', async () => {
    const satirlar = await ortam.db
      .select()
      .from(body_analyses)
      .where(eq(body_analyses.user_id, kullaniciId));

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0]!.tamamlandi, 'rezervasyon satırı asılı kalmamalı').toBe(true);
    expect(satirlar[0]!.yontem, 'yer tutucu yöntem kayda geçmemeli').not.toBe('rezerve');
  });

  it('görsel model yalnızca bir kez çağrılıyor — para iki kez harcanmıyor', () => {
    expect(gorselCagrilari).toHaveBeenCalledTimes(1);
  });

  it('reddedilen istek kullanıcıya boş rapor göstermiyor', async () => {
    const son = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analiz/son',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(son.statusCode).toBe(200);
    expect(son.json().rapor.yontem).not.toBe('rezerve');
  });

  it('sayaç ile uç aynı şeyi söylüyor', async () => {
    const durum = await app.inject({
      method: 'GET',
      url: '/v1/abonelik/durum',
      headers: { authorization: `Bearer ${token}` },
    });
    // Uç 403 diyorsa ekran da "0 kalan" demeli; ayrışırlarsa kullanıcı yalan görür.
    expect(durum.json().kota.vucut_analizi.kalan).toBe(0);
  });
});

/**
 * Model patlarsa hak yanmıyor mu?
 *
 * Kota adaleti kuralı ürünün yazılı sözlerinden: bizim hatamızın bedelini kullanıcı
 * ödemez. Rezervasyon çağrıdan önce açıldığı için, çağrı başarısız olduğunda satırın
 * silinmesi gerekiyor — yoksa görsel modelin bir 500'ü ücretsiz kullanıcının ömür boyu
 * hakkını kalıcı olarak yakardı.
 */
describe('görsel model başarısız olduğunda', () => {
  let hataToken: string;
  let hataKullaniciId: string;

  beforeAll(async () => {
    const kayit = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/kayit',
      payload: { email: 'iade@swiip.app', parola: 'Yesil-Defter-91', saglik_onayi: true },
    });
    hataToken = kayit.json().erisim_token;
    hataKullaniciId = kayit.json().kullanici.id;

    await app.inject({
      method: 'POST',
      url: '/v1/degerlendirme/cevap',
      headers: { authorization: `Bearer ${hataToken}` },
      payload: { cevaplar: { K1: '1994-05-01', K2: 'Erkek', K3: 178, K4: 82 } },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/vucut/foto-riza',
      headers: { authorization: `Bearer ${hataToken}` },
      payload: { onay: true },
    });
  }, 30_000);

  const dene = () =>
    app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: { authorization: `Bearer ${hataToken}` },
      payload: { fotograflar: [FOTOGRAF] },
    });

  it('hak iade ediliyor: kullanıcı tekrar deneyebiliyor', async () => {
    modelPatlasin = true;
    const basarisiz = await dene();
    expect(basarisiz.statusCode).toBeGreaterThanOrEqual(500);

    const asili = await ortam.db
      .select()
      .from(body_analyses)
      .where(eq(body_analyses.user_id, hataKullaniciId));
    expect(asili, 'başarısız çağrının rezervasyonu silinmeli').toHaveLength(0);

    modelPatlasin = false;
    const ikinci = await dene();
    expect(ikinci.statusCode, 'bizim hatamız kullanıcının hakkını yakmamalı').toBe(200);
  });
});
