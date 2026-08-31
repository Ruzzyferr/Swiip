import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';

/**
 * ED modu — sistemik sayı sızıntısı testi.
 *
 * Yeme bozukluğu kapısı `ed_mode` alanını açar ve o kullanıcıya kalori, kilo ve makro
 * sayısı gösterilmez. Sorun şu: bu kural her uçta **ayrı ayrı** uygulanıyor. Yarın
 * eklenen bir uç kuralı unutursa kimse fark etmez ve zarar geri alınamaz.
 *
 * Bu test kuralı uç uç değil, davranış olarak sınıyor: ED modundaki bir kullanıcı
 * beslenme yüzeylerinden hiçbirinde kalori sayısı görmemeli.
 *
 * S18 (yeme bozukluğu taraması) "Evet" cevabıyla kapı açılıyor.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let edToken: string;
let normalToken: string;

const TEMEL_CEVAPLAR = {
  K1: '1994-03-15',
  K2: 'Kadın',
  K3: 168,
  K4: 62,
  K6: 'Hayır',
  K7: 'Evet',
  S2: 'Hayır',
  S3: 'Hayır',
  S7: 'Hayır',
  A1: '1-3 yıl',
  A3: 10,
  E1: 'Ev',
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
  H1: 'Genel sağlık',
};

async function kullaniciKur(email: string, s18: string): Promise<string> {
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
    payload: { cevaplar: { ...TEMEL_CEVAPLAR, S18: s18 } },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: basliklar,
    payload: {},
  });

  return token;
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
  await besinleriTohumla(uygulama.ortam.db);
  await tarifleriTohumla(uygulama.ortam.db);

  edToken = await kullaniciKur('ed@swiip.app', 'Evet');
  normalToken = await kullaniciKur('normal@swiip.app', 'Hayır');

  /**
   * ED olmayan kullanıcı **ücretli** plana alınıyor: buradaki sınama "sayı gizleme kuralı
   * yalnızca ED için" iddiası. Ücretsiz planda sayıların gelmemesinin başka bir nedeni var
   * (kalori hedefi ücretli katman) ve o neden bu testin ölçmek istediği şeyi gölgeler.
   */
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: { authorization: `Bearer ${normalToken}` },
    payload: { plan: 'temel' },
  });

  /** ED kullanıcısı bilerek ücretsiz kalıyor: sağlık kapısı ödemenin önünde olmalı. */
}, 90_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const ed = () => ({ authorization: `Bearer ${edToken}` });
const normal = () => ({ authorization: `Bearer ${normalToken}` });

/** Beslenme sayısı gösterebilecek her uç. Yeni uç eklendiğinde buraya da eklenmeli. */
const BESLENME_UCLARI = ['/v1/beslenme/hedef', '/v1/beslenme/gun/2026-09-01'];

describe('ED kapısı açılıyor', () => {
  it('S18 evet cevabı ed_mode alanını açar', async () => {
    const ben = await app.inject({ method: 'GET', url: '/v1/kimlik/ben', headers: ed() });

    expect(ben.json().ed_mode).toBe(true);
  });

  it('normal kullanıcıda kapı açılmaz', async () => {
    const ben = await app.inject({ method: 'GET', url: '/v1/kimlik/ben', headers: normal() });

    expect(ben.json().ed_mode).toBe(false);
  });
});

describe('ED modunda sayı sızmıyor', () => {
  it.each(BESLENME_UCLARI)('%s kalori sayısı döndürmez', async (url) => {
    const cevap = await app.inject({ method: 'GET', url, headers: ed() });
    const govde = JSON.stringify(cevap.json());

    // "kalori" anahtarı olabilir ama değeri sayı olmamalı; en kesin kontrol dört haneli
    // kalori benzeri sayıların hiç geçmemesi.
    expect(govde).not.toMatch(/"kalori":\s*[1-9]\d{2,}/);
  });

  it('beslenme hedefi porsiyon diliyle anlatılır', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: ed() });

    expect(cevap.json().sayilar_gizli).toBe(true);
    expect(cevap.json().porsiyon_rehberi).toBeTruthy();
  });

  it('porsiyon rehberinde hiç rakam yok', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: ed() });
    const rehber = JSON.stringify(cevap.json().porsiyon_rehberi);

    expect(rehber).not.toMatch(/\d/);
  });

  it('aynı uçlar normal kullanıcıya sayı verir — kural yalnızca ED için', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: normal() });

    expect(cevap.json().sayilar_gizli).toBe(false);
    expect(cevap.json().hedef.kalori).toBeGreaterThan(1000);
  });
});

describe('ED modunda koç sayı konuşmaz', () => {
  it('koç cevabında kalori sayısı geçmez', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/koc/mesaj',
      headers: ed(),
      payload: { mesaj: 'Bugün ne kadar yemeliyim?' },
    });

    // Plan kilidi 402 döndürebilir; sayı sızıntısı asıl bakılan.
    if (cevap.statusCode === 200) {
      expect(cevap.json().cevap).not.toMatch(/\d{3,}/);
    }
  });
});

describe('kullanıcı kontrolü elinde', () => {
  it('sayıları açtığında hedef sayı ile gelir', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/ed-sayilar',
      headers: ed(),
      payload: { acik: true },
    });

    const cevap = await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: ed() });

    expect(cevap.json().sayilar_gizli).toBe(false);
  });

  it('kapattığında yeniden gizlenir — biz kendiliğimizden açmayız', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/ed-sayilar',
      headers: ed(),
      payload: { acik: false },
    });

    const cevap = await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: ed() });

    expect(cevap.json().sayilar_gizli).toBe(true);
  });
});

/**
 * Sıra: sağlık kapısı ödemenin önünde.
 *
 * ED kullanıcısı ücretsiz planda; günlük kalori hedefi ücretli katman olduğu için ona da
 * sayı verilmiyor. Ama porsiyon rehberi **veriliyor**: ED modunun karşılığı olan güvenli
 * anlatım bir ödeme kararının arkasında kalamaz.
 *
 * Ters sırada yazılsaydı ED kullanıcısı paywall mesajı görürdü ve ürünün ona verdiği tek
 * güvenli anlatım biçimi kapanırdı.
 */
describe('ED kapısı paywall’ın önünde', () => {
  it('ücretsiz ED kullanıcısı porsiyon rehberini görüyor', async () => {
    const govde = (
      await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: ed() })
    ).json();

    expect(govde.sayilar_gizli).toBe(true);
    expect(govde.porsiyon_rehberi).toBeTruthy();
    expect(govde.hedef_kilidi).toBeUndefined();
  });
});

/**
 * Ücretsiz plan sınırı — kalori ve makro hedefi.
 *
 * Spec bölüm 13 tablosu açık: "Kalori ve makro hedefi | — | ✓ | ✓". Ücretsiz kullanıcı
 * bakım kalorisini **bir kez**, vücut analizi raporunda görüyor (bölüm 5); günlük hedef ve
 * makro dağılımı ücretli katman.
 *
 * Uç bu ayrımı hiç uygulamıyordu: `manuel_kalori` ve `kalori_makro_hedefi` hak tablosunda
 * yazılıydı ama kodun hiçbir yerinde okunmuyordu. Paywall ekranı özelliği ücretli diye
 * satarken API onu ücretsiz veriyordu — hem gelir sızıntısı hem verdiğimiz sözle çelişki.
 *
 * **Manuel giriş kapanmıyor.** Ücretsizin çekirdek vaadi o.
 */
describe('ücretsiz planda kalori hedefi AÇIK', () => {
  let ucretsiz: string;

  beforeAll(async () => {
    ucretsiz = await kullaniciKur('ucretsiz@swiip.app', 'Hayır');
  }, 60_000);

  const basliklar = () => ({ authorization: `Bearer ${ucretsiz}` });

  /**
   * 2026-08-31: kilit KALKTI ve bu blok tersine çevrildi.
   *
   * Hedef deterministik bir formül (Mifflin-St Jeor + aktivite çarpanı) — bize sıfıra
   * mal oluyor. Kilitliyken ücretsiz kullanıcının defteri vardı ama neyi hedeflediğini
   * bilmiyordu: sayı yazıyor, hiçbir şey ifade etmiyordu. "kalori hesaplama"
   * aramasından gelen kullanıcı ilk beş dakikada duvara çarpıyordu.
   *
   * `docs/rakip-analizi.md`: 5 yıldızlı yorumlarda en sık geçen övgü kelimesi
   * "ücretsiz"; en yüksek puanlı iki uygulama (4,87) ücretsiz ve reklamlı.
   */
  it('ücretsiz kullanıcı günlük hedefini ve makrolarını görüyor', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/hedef',
      headers: basliklar(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().hedef_kilidi).toBeUndefined();

    const hedef = cevap.json().hedef;
    expect(hedef, 'ücretsiz kullanıcıya hedef verilmiyor').toBeDefined();
    expect(hedef.kalori).toBeGreaterThan(0);
    expect(hedef.protein_g).toBeGreaterThan(0);
  });

  /** Duvar bizim maliyet ürettiğimiz yerde kalıyor; hedefin yanında değil. */
  it('ücretli özellikler hâlâ kilitli görünüyor', async () => {
    const govde = (
      await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: basliklar() })
    ).json();

    expect(govde.kilitler.yemek_tanima, 'yemek tanıma görsel AI — ücretli kalmalı').toBe(true);
    expect(govde.kilitler.ogun_plani).toBe(true);
    expect(govde.kilitler.barkod, 'barkod ücretsize açıldı').toBe(false);
  });

  /** Ücretsizin çekirdek vaadi: yemek kaydı çalışmaya devam eder. */
  it('ücretsiz kullanıcı yemeğini kaydedebiliyor', async () => {
    const arama = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/besin/ara?q=pilav',
      headers: basliklar(),
    });
    const besin = arama.json().sonuclar[0];

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kayit',
      headers: basliklar(),
      payload: { food_id: besin.id, miktar: 1, portion_id: 'kepce', gun: '2026-08-19' },
    });

    expect(cevap.statusCode).toBeLessThan(300);
    expect(cevap.json().hesaplanan.kalori).toBeGreaterThan(0);
  });

  /** Temel plana geçince hedef açılıyor — kilidin gerçekten plan kaynaklı olduğu kanıtı. */
  it('Temel plana geçince hedef açılıyor', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: basliklar(),
      payload: { plan: 'temel' },
    });

    const govde = (
      await app.inject({ method: 'GET', url: '/v1/beslenme/hedef', headers: basliklar() })
    ).json();

    expect(govde.hedef_kilidi).toBeUndefined();
    expect(govde.hedef.kalori).toBeGreaterThan(0);
  });
});
