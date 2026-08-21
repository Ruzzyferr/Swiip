import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AiCevap, AiIstek } from '@swiip/core';
import { ARAC_TANIMLARI, PLAN_AYLIK_BUTCE_USD } from '@swiip/core';
import { ai_usage } from '../db/sema';
import { uygulamaOlustur } from '../uygulama';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { besinSorgusu, sayilariTemizle } from './koc';
import { besinleriTohumla } from '../db/tohum';

/**
 * Koç ucu (F9) bitti kriterleri:
 *  - Koç kullanıcının gerçek verisine atıfla cevap veriyor.
 *  - Sağlık sorusunda yönlendirme yapıyor, tanı koymuyor.
 *  - "Günde 800 kalori" gibi talebi gerekçesiyle reddediyor.
 *  - Token maliyeti konuşma uzadıkça sabit kalıyor.
 */

let ortam: TestOrtami;
let app: FastifyInstance;
let token: string;

const sonIstek: { deger: AiIstek | null } = { deger: null };
const cagriSayaci = { adet: 0 };

const sahteIstemci = {
  metinUret: vi.fn(async (istek: AiIstek): Promise<AiCevap> => {
    sonIstek.deger = istek;
    cagriSayaci.adet += 1;
    return {
      metin: 'Son üç haftada ortalaman hedefinin üstünde. Hafta sonlarına bakmakta fayda var.',
      girdi_token: 1800,
      cikti_token: 320,
      model: 'test-orta',
    };
  }),
};

beforeAll(async () => {
  ortam = await testVeritabaniAc();
  // Koç, besin tablosuna bakıyor; tohumlanmamış tabloda araç hiç tetiklenmez.
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
    payload: { email: 'koc@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: { authorization: `Bearer ${token}` },
    payload: { plan: 'pro' },
  });

  // Profil olmadan koç konuşamaz: minimum değerlendirme.
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      cevaplar: {
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
        E3: ['Barbell ve plaka', 'Dumbbell'],
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
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
}, 60_000);

afterAll(async () => {
  await app?.close();
  await ortam?.kapat();
});

const yetkili = () => ({ authorization: `Bearer ${token}` });

async function sor(mesaj: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/koc/mesaj',
    headers: yetkili(),
    payload: { mesaj },
  });
}

describe('koç — sert sınırlar', () => {
  it('sağlık sorusunda tanı koymaz, yönlendirir', async () => {
    const oncekiCagri = cagriSayaci.adet;
    const cevap = await sor('Dizimde ağrı var, menisküs yırtığı mı acaba?');

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kategori).toBe('tani');
    expect(cevap.json().cevap).toContain('hekim');
    // Model hiç çağrılmadı: sınır kontrolü istekten önce kesti.
    expect(cagriSayaci.adet).toBe(oncekiCagri);
  });

  it('aşırı hedefi gerekçesiyle reddeder', async () => {
    const cevap = await sor('Günde 800 kalori yesem ne olur?');

    expect(cevap.json().kategori).toBe('asiri_hedef');
    expect(cevap.json().cevap.toLowerCase()).toContain('güvenli');
  });

  it('takviye dozu vermez', async () => {
    const cevap = await sor('Günde kaç gram kreatin almalıyım?');

    expect(cevap.json().kategori).toBe('doz');
  });

  it('kapsam dışını kibarca reddeder', async () => {
    const cevap = await sor('Bana bir şiir yaz');

    expect(cevap.json().kategori).toBe('kapsam_disi');
  });

  it('sınıra takılan mesaj kotadan düşmez — model çağrılmadı', async () => {
    const oncesi = await kotaOku();
    await sor('Belim tutuldu, fıtık mı?');
    const sonrasi = await kotaOku();

    expect(sonrasi).toBe(oncesi);
  });
});

describe('koç — araç katmanı', () => {
  it('antrenman sorusunda kullanıcının gerçek verisi bağlama girer', async () => {
    const cevap = await sor('Bench pressim takıldı, ne yapmalıyım?');

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kullanilan_araclar).toContain('antrenman_gecmisi');
  });

  it('beslenme sorusunda beslenme geçmişi çekilir', async () => {
    const cevap = await sor('Kalori hedefime uyuyor muyum?');

    expect(cevap.json().kullanilan_araclar).toContain('beslenme_gecmisi');
  });

  it('genel bir sohbet sorusunda gereksiz araç çağrılmaz', async () => {
    const cevap = await sor('Merhaba, bugün nasıl gidiyor?');

    expect(cevap.json().kullanilan_araclar).toEqual([]);
  });

  it('araç listesi oturumla okunabilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/koc/araclar', headers: yetkili() });

    expect(cevap.json().araclar.length).toBeGreaterThanOrEqual(7);
  });
});

describe('koç — bellek ve maliyet', () => {
  it('konuşma uzadıkça bağlam tokeni patlamaz', async () => {
    const ilk = await sor('Programımda kaç gün var?');
    const ilkToken = ilk.json().tahmini_token;

    for (let i = 0; i < 12; i++) {
      await sor(`Bu ${i}. deneme sorusu, antrenmanla ilgili genel bir soru.`);
    }

    const son = await sor('Programımda kaç gün var?');
    expect(son.json().tahmini_token).toBeLessThan(ilkToken * 2);
  });

  it('mesaj geçmişi saklanır ve okunabilir', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/koc/gecmis', headers: yetkili() });

    expect(cevap.json().mesajlar.length).toBeGreaterThan(0);
    expect(cevap.json().mesajlar[0]).toHaveProperty('role');
  });

  it('AI maliyeti kaydedilir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/maliyet',
      headers: yetkili(),
    });

    expect(cevap.json().toplam_usd).toBeGreaterThan(0);
  });
});

describe('koç — plan ve kota', () => {
  it('ücretsiz planda koç kapalıdır ve nedeni açıkça söylenir', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'ucretsiz' },
    });

    const cevap = await sor('Programımı nasıl geliştiririm?');

    expect(cevap.statusCode).toBe(402);
    expect(cevap.json().mesaj).toContain('Temel');

    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'pro' },
    });
  });

  it('normal mesaj kotadan düşer', async () => {
    const oncesi = await kotaOku();
    await sor('Antrenman hacmim yeterli mi?');
    const sonrasi = await kotaOku();

    expect(sonrasi).toBe(oncesi + 1);
  });
});

describe('sayilariTemizle — ED modu son savunma hattı', () => {
  it('kalori sayısını metinden çıkarır', () => {
    expect(sayilariTemizle('Bugün 1850 kcal aldın')).not.toMatch(/1850/);
  });

  it('kilo sayısını çıkarır', () => {
    expect(sayilariTemizle('82,4 kg görünüyorsun')).not.toMatch(/82/);
  });

  it('yüzdeyi çıkarır', () => {
    expect(sayilariTemizle('Hedefinin %85 kadarındasın')).not.toMatch(/85/);
  });

  it('sayı içermeyen metni bozmaz', () => {
    const metin = 'Bugün tabağın dengeli görünüyor.';
    expect(sayilariTemizle(metin)).toBe(metin);
  });
});

/** Geçmiş AI kullanımını doğrudan yazar: bütçe davranışını sınamanın tek yolu. */
async function ortamKullanimYaz(usd: number): Promise<void> {
  const [kullanici] = await app
    .inject({
      method: 'GET',
      url: '/v1/kimlik/ben',
      headers: yetkili(),
    })
    .then((c) => [c.json()]);

  await ortam.db.insert(ai_usage).values({
    user_id: kullanici!.id,
    is_tipi: 'koc_sohbeti',
    model: 'test',
    girdi_token: 1,
    cikti_token: 1,
    maliyet_usd: String(usd),
  });
}

async function kotaOku(): Promise<number> {
  const durum = await app.inject({
    method: 'GET',
    url: '/v1/abonelik/durum',
    headers: yetkili(),
  });
  return durum.json().kota.koc_sohbeti.kullanilan;
}

describe('AI bütçesi (birim ekonomisi)', () => {
  /**
   * Kota çağrı sayısını sınırlıyor, maliyeti değil. Bütçe eşiğine yaklaşan kullanıcı
   * ucuz model seviyesine düşürülüyor — hizmet kesilmiyor, hesap değişmiyor, yalnızca
   * anlatım sadeleşiyor.
   */
  it('bütçe eşiği aşıldığında ucuz seviyeye düşülür', async () => {
    const oncekiTavan = sonIstek.deger?.max_cikti_token;
    expect(oncekiTavan).toBeGreaterThan(0);

    // Geçmiş kullanımı bütçenin üstüne çıkar.
    await ortamKullanimYaz(PLAN_AYLIK_BUTCE_USD.pro * 1.5);

    const cevap = await sor('Programımda kaç gün var, özetler misin?');

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().butce_asildi).toBe(true);
    // Hizmet kesilmiyor: cevap geliyor, yalnızca anlatım kısalıyor.
    expect(sonIstek.deger!.max_cikti_token).toBeLessThan(oncekiTavan!);
    expect(cevap.json().cevap.length).toBeGreaterThan(0);
  });

  it('bütçe durumu cevapta görünür — sessizce ucuzlatmıyoruz', async () => {
    const cevap = await sor('Bir soru daha.');

    expect(cevap.json()).toHaveProperty('butce_asildi');
  });
});

/**
 * Koç, kullanıcının sorusunda geçen yemeği besin tablosunda arıyor. Aynı şapkasız yazma
 * sorunu burada da geçerli: "yogurt kac kalori" diye soran kullanıcıya "bilmiyorum"
 * demek, veritabanında kayıt varken bilmiyormuş gibi davranmak olur.
 */
describe('koç besin araması — şapkasız yazımı da bulur', () => {
  it('şapkasız yazılan yemek besin tablosunda bulunuyor', async () => {
    const cevap = await sor('yogurt kac kalori');

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kullanilan_araclar).toContain('besin_ara');
  });
});

/**
 * Soru cümlesinden yemeği çıkarma.
 *
 * İlk hâli son iki sözcüğü alıyordu ve "yoğurt kaç kalori" cümlesinde **"kac kalori"**
 * arıyordu — yani sorunun kendisini. En doğal Türkçe dizilim yemeği başa koyar.
 */
describe('besinSorgusu', () => {
  it.each([
    ['yogurt kac kalori', 'yogurt'],
    ['bir porsiyon mercimek corbasi kac kalori', 'mercimek corbasi'],
    ['tavuk gogsu besin degeri nedir', 'tavuk gogsu'],
    ['pilav icinde ne var', 'pilav'],
  ])('"%s" → "%s"', (cumle, beklenen) => {
    expect(besinSorgusu(cumle)).toBe(beklenen);
  });

  it('yalnızca soru sözcüğü varsa boş döner — rastgele arama yapmayız', () => {
    expect(besinSorgusu('kac kalori')).toBe('');
  });
});

/**
 * Hareket bilgisi aracı.
 *
 * Kullanıcı hareketi Türkçe adıyla sorar ("mekik hareketi nasıl yapılır"). Katalog
 * kimlikleri ise İngilizce slug ("ab-wheel"). Aracın gerçekten tetiklendiğini sınamazsak,
 * kod yazılı ama hiç çalışmıyor olabilir — sessizce çalışmayan bir araç, olmayan araçtan
 * kötüdür: bağlamı eksik bir cevabı doğru sanırız.
 */
describe('koç hareket bilgisi aracı', () => {
  it('Türkçe hareket adıyla sorulduğunda araç tetikleniyor', async () => {
    const cevap = await sor('mekik hareketi nasıl yapılır');

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kullanilan_araclar).toContain('hareket_bilgisi');
  });

  it('şapkasız yazılan hareket adı da bulunuyor', async () => {
    const cevap = await sor('sinav hareketi nasil yapilir');

    expect(cevap.json().kullanilan_araclar).toContain('hareket_bilgisi');
  });

  /**
   * Kısmi eşleşme yok. "press" onlarca harekete uyar; yanlış hareketin talimatını
   * göstermek göstermemekten kötüdür — kullanıcı yanlış hareketi yapar.
   */
  it('yarım ad için araç eklenmiyor — yanlış hareket göstermeyiz', async () => {
    const cevap = await sor('press hareketi nasıl yapılır');

    expect(cevap.json().kullanilan_araclar).not.toContain('hareket_bilgisi');
  });
});

/**
 * Araçların ulaşılabilirliği.
 *
 * `hareket_bilgisi` aracı yazılıydı, testleri vardı ve **hiç tetiklenmiyordu** — koç
 * kataloğu görmeden cevap veriyordu. Bu sınıf hata sessizdir: kimse fark etmez, cevap
 * sadece daha kötü olur.
 *
 * Bu yüzden tek tek araçları değil, kuralın kendisini sınıyoruz: her aracın gerçekçi bir
 * kullanıcı cümlesiyle bağlama girdiği gösterilmeli. Yeni araç ekleyen, buraya bir cümle
 * eklemek zorunda kalır.
 */
describe('koç araçları gerçekten ulaşılabilir', () => {
  /** Bağlam kuran araçlar. `program_degistir` yazan araç, ayrı akışta sınanıyor. */
  const CUMLELER: Array<[string, string]> = [
    ['antrenman_gecmisi', 'son seanslarımda bench nasıl gitti'],
    ['beslenme_gecmisi', 'bu hafta kaç kalori aldım'],
    ['olcum_gecmisi', 'kilom nasıl gidiyor'],
    ['hareket_bilgisi', 'mekik hareketi nasıl yapılır'],
    ['besin_ara', 'yoğurt kaç kalori'],
  ];

  it.each(CUMLELER)('%s aracı gerçek bir cümleyle tetikleniyor', async (arac, cumle) => {
    const cevap = await sor(cumle);

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kullanilan_araclar).toContain(arac);
  });

  /**
   * Beyan ile gerçek arasındaki boşluğu kapatır: modele tanıttığımız her bağlam aracının
   * burada bir cümlesi olmalı. Yoksa modele var olmayan bir yetenek tanıtmış oluruz.
   */
  it('tanıtılan her bağlam aracının bir kullanıcı cümlesi var', () => {
    const yazanlar = new Set(['program_degistir']);
    const beyan = ARAC_TANIMLARI.map((a) => a.ad).filter((ad) => !yazanlar.has(ad));
    const sinanan = new Set([...CUMLELER.map(([arac]) => arac), 'profil_getir']);

    expect(beyan.filter((ad) => !sinanan.has(ad))).toEqual([]);
  });
});

/**
 * Koç kullanıcının dilinde konuşuyor.
 *
 * Sistem mesajı modele koşulsuz "Türkçe konuş" diyordu. Uygulamayı İngilizce kullanan
 * kişi İngilizce soruyor, koç Türkçe cevap veriyordu — ekranların tamamı çevrilmişken.
 */
describe('koç sohbet dili', () => {
  async function dilAyarla(dil: string) {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil },
    });
  }

  it('İngilizce kullanıcıya İngilizce sistem mesajı gidiyor', async () => {
    await dilAyarla('en');
    await sor('what should I eat today');

    expect(sonIstek.deger?.sistem).toContain('English');
    expect(sonIstek.deger?.sistem).not.toContain('Türkçe');
  });

  it('Türkçe kullanıcıya Türkçe sistem mesajı gidiyor', async () => {
    await dilAyarla('tr');
    await sor('bugün ne yesem');

    expect(sonIstek.deger?.sistem).toContain('Türkçe');
  });

  /** Sert sınırlar üslup değil sağlık kuralı; çeviride eksilemez. */
  it.each(['tr', 'en'])('%s dilinde sert sınırlar eksilmiyor', async (dil) => {
    await dilAyarla(dil);
    await sor('bir soru');

    const sinirlar = (sonIstek.deger?.sistem ?? '')
      .split('\n')
      .filter((satir) => /^\d\./.test(satir.trim()));

    expect(sinirlar.length).toBe(5);
  });
});
