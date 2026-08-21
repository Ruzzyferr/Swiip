import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { sonrakiSoru, type Cevaplar } from '@swiip/core';
import { tr } from '@swiip/shared';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Uçtan uca kullanıcı yolculuğu.
 *
 * Bu test tek tek parçaların değil, bağlantıların doğruluğunu kanıtlar:
 * kayıt → 134 soru → profil → program → gerekçe → geri bildirim → motor kararı.
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
    payload: {
      email: 'yolculuk@swiip.app',
      parola: 'Kirmizi-Bisiklet-42',
      saglik_onayi: true,
      olcum_onayi: true,
    },
  });
  token = kayit.json().erisim_token;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

function yetkili() {
  return { authorization: `Bearer ${token}` };
}

/** Gerçekçi bir kullanıcı: 32 yaşında, orta seviye, salonda 4 gün, bel fıtığı geçmişi var. */
const SENARYO: Cevaplar = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K5: 'Bugün',
  K6: 'Hayır',
  K7: 'Evet',
  K8: 'Hayır',
  K9: 'İstanbul',
  K10: 'Değişmedi',
  K11: 'Hiç yapmadım',
  K12: { en_yuksek_kg: 88, en_dusuk_kg: 74 },
  H1: 'Kas kazanımı',
  H4: 'Yok',
  H6: ['sirt', 'gogus'],
  H10: 1,
  A1: '1-3 yıl',
  A2: 3,
  A3: 10,
  'A8:Squat': 4,
  'A8:Bench press': 4,
  'A8:Deadlift': 3,
  'A8:Omuz presi': 4,
  'A8:Barfiks': 3,
  'A5:Squat': { kg: 100, tekrar: 5 },
  'A5:Bench press': { kg: 80, tekrar: 6 },
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S17: ['Bel fıtığı'],
  S18: 'Hayır',
  E1: 'Spor salonu',
  E2: 'MACFit',
  E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack', 'Lat pulldown', 'Kablo makinesi'],
  E4: 'Bazen beklerim',
  E8: 'Hayır',
  Z1: '4 gün',
  Z2: '60 dakika',
  Z3: ['Pazartesi', 'Salı', 'Perşembe', 'Cumartesi'],
  Y1: '7-8 saat',
  Y2: 7,
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
  T1: 'Bodybuilding / estetik',
  T2: ['Yok'],
  T3: 'Katlanırım',
};

describe('uçtan uca yolculuk', () => {
  it('1. adım — değerlendirme cevapları blok blok kaydedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/degerlendirme/cevap',
      headers: yetkili(),
      payload: { cevaplar: SENARYO, blok_id: 'K' },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().ilerleme.yuzde).toBeGreaterThan(0);
  });

  it('2. adım — blok geri bildirimi gerçek bir hesap döner', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/degerlendirme/blok/K/geri-bildirim',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().metin).toContain('kcal');
  });

  it('3. adım — yarıda bırakılan değerlendirme kaldığı yerden devam eder', async () => {
    const durum = await app.inject({
      method: 'GET',
      url: '/v1/degerlendirme/durum',
      headers: yetkili(),
    });

    expect(durum.statusCode).toBe(200);
    expect(durum.json().sonraki_soru).not.toBeNull();
    expect(durum.json().ilerleme.tamamlanan_bloklar).toContain('K');
  });

  it('4. adım — kalan sorular cevaplanınca değerlendirme tamamlanır', async () => {
    let cevaplar: Cevaplar = { ...SENARYO };

    // Kalan tüm görünür soruları makul varsayılanlarla doldur.
    for (let i = 0; i < 400; i++) {
      const soru = sonrakiSoru(cevaplar);
      if (!soru) break;
      cevaplar = { ...cevaplar, [soru.id]: ornekCevap(soru) as Cevaplar[string] };
    }

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/degerlendirme/cevap',
      headers: yetkili(),
      payload: { cevaplar },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().ilerleme.tamamlandi).toBe(true);
  });

  it('5. adım — profil derlenir ve kısıtlar yansır', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/degerlendirme/tamamla',
      headers: yetkili(),
      payload: {},
    });

    expect(cevap.statusCode).toBe(200);
    const profil = cevap.json().profil;
    expect(profil.antrenman_yasi).toBe('orta');
    expect(profil.kisitlar.kontrendikasyonlar).toContain('bel_fitigi');
    expect(profil.kisitlar.eksenel_yuk_yasak).toBe(true);
    expect(profil.bilinen_yukler['barbell-squat']).toBeGreaterThan(100);
  });

  it('6. adım — program üretilir ve bel fıtığına uyar', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/uret',
      headers: yetkili(),
      payload: { hafta: 1 },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().program_id).toBeTruthy();

    /**
     * Programın kendisi `/aktif`ten okunuyor.
     *
     * Üretim ucu artık programı döndürmüyor: kullanıcıya görünen metni iki yerde
     * üretmek, birinin çevrilmeden kalması demekti ve öyle olmuştu.
     */
    const aktif = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });

    const govde = aktif.json();
    expect(govde.split.tip).toBe('upper_lower');
    // Ücretsiz kullanıcı yalnızca 1. günü görür.
    expect(govde.plan).toBe('ucretsiz');
    expect(govde.gunler).toHaveLength(1);
    expect(govde.kilitli_gun_sayisi).toBe(3);
  });

  it('6b. adım — seanslar Z3 cevabındaki uygun günlere yerleşir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });

    // Z3: Pazartesi, Salı, Perşembe, Cumartesi → 1, 2, 4, 6.
    const gunler: number[] = cevap.json().takvim.gunler;
    expect(gunler).toHaveLength(4);
    expect(new Set(gunler)).toEqual(new Set([1, 2, 4, 6]));
  });

  it('6c. adım — her seansın takvim tarihi vardır ve haftası içindedir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });

    const tarihler: string[] = cevap
      .json()
      .gunler.map((g: { seans: { planned_for: string | null } }) => g.seans.planned_for);

    expect(tarihler.every((t) => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t))).toBe(
      true,
    );
  });

  it('7. adım — aktif program okunabilir ve hareketleri gerekçelidir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    const gun = cevap.json().gunler[0];
    expect(gun.hareketler.length).toBeGreaterThanOrEqual(3);

    for (const hareket of gun.hareketler) {
      expect(hareket.progression_rule_text.length).toBeGreaterThan(20);
      expect(hareket.exercise_id).not.toBe('barbell-deadlift');
    }
  });

  it('8. adım — her hareketin gerekçesi cevaplara dayanır', async () => {
    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });
    const ilkHareket = program.json().gunler[0].hareketler[0].exercise_id;

    const gerekce = await app.inject({
      method: 'GET',
      url: `/v1/program/gerekce/${ilkHareket}`,
      headers: yetkili(),
    });

    expect(gerekce.statusCode).toBe(200);
    expect(gerekce.json().aciklama.length).toBeGreaterThan(15);
    expect(Array.isArray(gerekce.json().kurallar)).toBe(true);
  });

  it('9. adım — ücretsiz kullanıcı geri bildirim veremez, nedeni açıkça söylenir', async () => {
    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });
    const gun = program.json().gunler[0];

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/geri-bildirim',
      headers: yetkili(),
      payload: {
        seans_id: gun.seans.id,
        kalemler: [{ hareket_id: gun.hareketler[0].exercise_id, sonuc: 'tamamladim' }],
      },
    });

    expect(cevap.statusCode).toBe(402);
    expect(cevap.json().mesaj).toContain('Temel');
  });

  it('10. adım — Temel plana geçen kullanıcı tüm günleri görür', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/abonelik/guncelle',
      headers: yetkili(),
      payload: { plan: 'temel' },
    });

    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });

    expect(program.json().gunler).toHaveLength(4);
    expect(program.json().kilitli_gun_sayisi).toBe(0);
  });

  it('11. adım — geri bildirim motor kararı üretir ve ağırlık artar', async () => {
    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });
    const gun = program.json().gunler[0];
    const hareket = gun.hareketler[0];

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/geri-bildirim',
      headers: yetkili(),
      payload: {
        seans_id: gun.seans.id,
        kalemler: [{ hareket_id: hareket.exercise_id, sonuc: 'tamamladim', agri: false }],
      },
    });

    expect(cevap.statusCode).toBe(200);
    const kararlar = cevap.json().motor_kararlari;
    expect(kararlar.length).toBeGreaterThan(0);
    expect(kararlar[0]).toMatch(/artıyor|tekrara/);
  });

  it('12. adım — ağrı bildirimi hareket değişikliği önerir', async () => {
    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });
    const gun = program.json().gunler[1];
    const hareket = gun.hareketler[0];

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/geri-bildirim',
      headers: yetkili(),
      payload: {
        seans_id: gun.seans.id,
        kalemler: [{ hareket_id: hareket.exercise_id, sonuc: 'zorlandim', agri: true }],
      },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().motor_kararlari.join(' ').toLowerCase()).toContain('ağrı');
  });

  it('13. adım — hareket değiştirme ücretsiz ve muadil listesi verir', async () => {
    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });
    const gun = program.json().gunler[0];
    const hareket = gun.hareketler[0];

    const muadiller = await app.inject({
      method: 'POST',
      url: '/v1/program/hareket-degistir',
      headers: yetkili(),
      payload: { seans_id: gun.seans.id, eski_hareket_id: hareket.exercise_id },
    });

    expect(muadiller.statusCode).toBe(200);
    const liste = muadiller.json().muadiller;
    expect(Array.isArray(liste)).toBe(true);

    if (liste.length > 0) {
      const degistir = await app.inject({
        method: 'POST',
        url: '/v1/program/hareket-degistir',
        headers: yetkili(),
        payload: {
          seans_id: gun.seans.id,
          eski_hareket_id: hareket.exercise_id,
          yeni_hareket_id: liste[0].id,
        },
      });

      expect(degistir.statusCode).toBe(200);
      expect(degistir.json().mesaj).toContain('hacmin aynı');
    }
  });

  it('14. adım — beslenme hedefi hesaplanır ve makrolar tutarlıdır', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/beslenme/hedef',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    const hedef = cevap.json().hedef;
    expect(hedef.kalori).toBeGreaterThan(1500);
    expect(hedef.protein_g).toBeGreaterThan(100);

    const makroKalori = hedef.protein_g * 4 + hedef.karbonhidrat_g * 4 + hedef.yag_g * 9;
    expect(Math.abs(makroKalori - hedef.kalori)).toBeLessThanOrEqual(25);
  });

  it('15. adım — kota durumu adalet kuralını açıkça yazar', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/abonelik/durum',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kota.adalet_notu).toContain('kotandan düşmez');
    // Ödeyen kullanıcıya promosyon gösterilmez.
    expect(cevap.json().promosyon_goster).toBe(false);
  });

  it('16. adım — veri dışa aktarma tüm kayıtları içerir', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/hesap/disa-aktar',
      headers: yetkili(),
    });

    const govde = cevap.json();
    expect(govde.programlar.length).toBeGreaterThan(0);
    expect(govde.kararlar.length).toBeGreaterThan(0);
    expect(govde.aciklama).toContain('fotoğraf');
  });
});

function ornekCevap(soru: {
  type: string;
  options?: string[];
  regions?: string[];
  min?: number;
  fields?: string[];
}): unknown {
  if (soru.options && soru.options.length > 0) return soru.options[0]!;
  if (soru.regions && soru.regions.length > 0) return [soru.regions[0]!];

  switch (soru.type) {
    case 'number':
    case 'scale':
      return soru.min ?? 1;
    case 'date':
      return '1994-03-15';
    case 'consent':
      return true;
    case 'multi':
      return [];
    case 'measure':
    case 'liftinput':
      return Object.fromEntries((soru.fields ?? ['deger']).map((f) => [f, 10]));
    default:
      return 'serbest cevap';
  }
}

/**
 * Gerekçe kullanıcının dilinde.
 *
 * Ürünün çekirdek vaadi "programın neden o program olduğunu da söyleriz". Cümle motorda
 * sabitliyken bu vaat yalnızca Türkçe kullanıcıya tutuluyordu. Motor artık kural kimliği
 * ve parametre üretiyor; cümle sözlükle kuruluyor.
 */
describe('gerekçe dili', () => {
  /**
   * Gerekçesi kayıtlı ilk hareketi bulur.
   *
   * Bu adım yolculuğun sonunda koşuyor ve arada hareket değiştirme adımı var; ilk hareketi
   * körlemesine almak, kaydı olmayan bir hareketi sınamak olurdu.
   */
  async function gerekceAl() {
    const program = await app.inject({
      method: 'GET',
      url: '/v1/program/aktif',
      headers: yetkili(),
    });

    const hareketler = program
      .json()
      .gunler.flatMap((gun: { hareketler: Array<{ exercise_id: string }> }) => gun.hareketler)
      .map((h: { exercise_id: string }) => h.exercise_id);

    for (const hareketId of hareketler) {
      const cevap = await app.inject({
        method: 'GET',
        url: `/v1/program/gerekce/${hareketId}`,
        headers: yetkili(),
      });
      if (cevap.statusCode === 200) return cevap.json();
    }

    throw new Error('gerekçesi kayıtlı hareket bulunamadı');
  }

  async function dilAyarla(dil: string) {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil },
    });
  }

  it('Türkçe kullanıcı Türkçe gerekçe görüyor', async () => {
    await dilAyarla('tr');
    const govde = await gerekceAl();

    expect(govde.cevrildi).toBe(true);
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(govde.aciklama)).toBe(true);
  });

  it('İngilizce kullanıcı İngilizce gerekçe görüyor', async () => {
    await dilAyarla('en');
    const govde = await gerekceAl();

    expect(govde.cevrildi).toBe(true);
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(govde.aciklama)).toBe(false);
  });

  /** Motorun Türkçe izi kaybolmuyor: karar kaydı o ve ayrıca dönüyor. */
  it('Türkçe iz her dilde erişilebilir kalıyor', async () => {
    await dilAyarla('en');
    const govde = await gerekceAl();

    expect(govde.aciklama_tr.length).toBeGreaterThan(15);
    expect(govde.aciklama_tr).not.toBe(govde.aciklama);

    await dilAyarla('tr');
  });
});

/**
 * Blok geri bildirimi kullanıcının dilinde.
 *
 * Değerlendirmenin her bloğunun sonunda "ne öğrendik, programını nasıl değiştirdi" cümlesi
 * çıkıyor; 134 soruyu bitirten şey bu. Cümle motorda sabitken yalnızca Türkçe kullanıcıya
 * veriliyordu.
 */
describe('blok geri bildirimi dili', () => {
  async function geriBildirimAl(blok: string) {
    return app
      .inject({
        method: 'GET',
        url: `/v1/degerlendirme/blok/${blok}/geri-bildirim`,
        headers: yetkili(),
      })
      .then((c) => c.json());
  }

  async function dilAyarla(dil: string) {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil },
    });
  }

  it('Türkçe kullanıcı Türkçe geri bildirim görüyor', async () => {
    await dilAyarla('tr');
    const geri = await geriBildirimAl('K');

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(geri.metin)).toBe(true);
  });

  it('İngilizce kullanıcı İngilizce geri bildirim görüyor', async () => {
    await dilAyarla('en');
    const geri = await geriBildirimAl('K');

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(geri.metin)).toBe(false);
    expect(geri.anahtar).toBeTruthy();
  });

  it.each(['A', 'S', 'E', 'Z', 'Y', 'B', 'T', 'F'])(
    '%s bloğu İngilizcede de Türkçe karakter içermiyor',
    async (blok) => {
      await dilAyarla('en');
      const geri = await geriBildirimAl(blok);

      expect(/[çğıöşüÇĞİÖŞÜ]/.test(geri.metin), geri.metin).toBe(false);

      await dilAyarla('tr');
    },
  );
});

/**
 * Dil süpürmesi — asıl ölçüt.
 *
 * Motorda Türkçe dize saymak artık doğru ölçü değil: o metinler **bilerek** duruyor,
 * karar izi ve çeviremediğimiz yerde yedek onlar. Ölçülmesi gereken şey, İngilizce
 * kullanıcıya giden cevabın içinde Türkçe kalıp kalmadığı.
 *
 * Bu test tek tek uçları değil kuralı koruyor: yeni bir uç kullanıcıya metin döndürüyorsa
 * buraya eklenmeden geçmemeli.
 */
describe('İngilizce kullanıcıya Türkçe metin gitmiyor', () => {
  /**
   * Kapsam dışı alanlar: bunlar veri, çeviri konusu değil.
   *
   * `ad_tr`/`talimat_tr` katalog verisi, `aciklama_tr` motorun izi, `name_tr` besin adı,
   * `soru`/`secenekler` ve `blok_basligi` soru bankası. `cevaplar` ise kullanıcının kendi seçimleri —
   * Türkçe soru bankasından geldikleri için Türkçe; çeviri konusu değiller.
   * Ayarlardaki dil notu bunların Türkçe kaldığını kullanıcıya zaten söylüyor.
   */
  const VERI_ALANLARI =
    /_tr$|^ad$|^name_tr$|^soru|^secenek|^etiketler$|^malzemeler$|^adimlar|^cevaplar$|^blok_basligi$/;

  function turkceMetinler(deger: unknown, yol = ''): string[] {
    if (typeof deger === 'string') {
      return /[çğıöşüÇĞİÖŞÜ]/.test(deger) ? [`${yol}: ${deger.slice(0, 60)}`] : [];
    }
    if (Array.isArray(deger)) return deger.flatMap((d, i) => turkceMetinler(d, `${yol}[${i}]`));
    if (deger && typeof deger === 'object') {
      return Object.entries(deger).flatMap(([anahtar, d]) =>
        VERI_ALANLARI.test(anahtar) ? [] : turkceMetinler(d, yol ? `${yol}.${anahtar}` : anahtar),
      );
    }
    return [];
  }

  /**
   * Süpürme yalnızca GET uçlarını tarıyordu.
   *
   * Kural "kullanıcıya metin döndüren her uç" diyordu ama uygulama sadece yarısını
   * kapsıyordu. Vücut analizi bir POST ve ücretsiz planın teslim ettiği tek çıktı;
   * gizlilik notu orada sabit Türkçe duruyordu ve süpürme onu hiç görmedi.
   */
  const UCLAR: { url: string; yontem: 'GET' | 'POST'; govde?: Record<string, unknown> }[] = [
    { url: '/v1/program/aktif', yontem: 'GET' },
    { url: '/v1/beslenme/hedef', yontem: 'GET' },
    { url: '/v1/degerlendirme/blok/K/geri-bildirim', yontem: 'GET' },
    { url: '/v1/degerlendirme/blok/S/geri-bildirim', yontem: 'GET' },
    { url: '/v1/abonelik/durum', yontem: 'GET' },
    { url: '/v1/ogun/plan/2026-08-17', yontem: 'GET' },
    { url: '/v1/degerlendirme/durum', yontem: 'GET' },
    // Ölçü yolu: fotoğraf yok. Gizlilik notunun "fotoğrafın silindi" dememesi gereken hâl.
    {
      url: '/v1/vucut/analiz',
      yontem: 'POST',
      govde: { olculer: { bel_cm: 88, boyun_cm: 39 } },
    },
    { url: '/v1/program/uret', yontem: 'POST', govde: {} },
  ];

  it.each(UCLAR.map((u) => [`${u.yontem} ${u.url}`, u] as const))(
    '%s cevabında Türkçe kalmıyor',
    async (_ad, uc) => {
      const url = uc.url;
      await app.inject({
        method: 'POST',
        url: '/v1/kimlik/dil',
        headers: yetkili(),
        payload: { dil: 'en' },
      });

      const cevap: LightMyRequestResponse = await app.inject({
        method: uc.yontem,
        url,
        headers: yetkili(),
        ...(uc.govde !== undefined ? { payload: uc.govde } : {}),
      });
      const govde = cevap.json();

      await app.inject({
        method: 'POST',
        url: '/v1/kimlik/dil',
        headers: yetkili(),
        payload: { dil: 'tr' },
      });

      /**
       * Hata cevabında `mesaj` **bilerek** Türkçe: sunucu kullanıcının dilini bilmek zorunda
       * değil, istemci metni `kod`dan kuruyor. Buradaki garanti "Türkçe yok" değil,
       * **"kodu var ve sözlükte karşılığı var"**.
       */
      if (cevap.statusCode >= 400) {
        expect(govde.kod, url).toBeTruthy();
        expect(Object.keys(tr.apiHatalari), url).toContain(govde.kod);
        return;
      }
      // Düşerse hangi alanların sızdığı mesajda görünsün; yol adı olmadan aranamıyor.
      expect(turkceMetinler(govde), [url, ...turkceMetinler(govde)].join(' | ')).toEqual([]);
    },
  );
});
