import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { ATLANDI, gorunurSorular, type Cevaplar } from '@swiip/core';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';

/**
 * Persona yolculukları — dört farklı insan, uçtan uca.
 *
 * `yolculuk.test.ts` orta yoldan geçen bir kullanıcının mutlu patikasını kanıtlıyor.
 * Burada aranan başka bir şey: ürünün **kenarlarında** duran insanlar. Sert kapıya
 * takılan, sayıları göremeyen, ücretsiz duvarına çarpan ve parasını ödeyip her şeyi
 * kullanan.
 *
 * Her persona gerçek bir kullanıcının sırasıyla ilerler: kayıt → sekiz kart → profil
 * → program → günlük kullanım. Sahte katman yok; PGlite üstünde gerçek göçler ve
 * gerçek tohum.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
  await besinleriTohumla(uygulama.ortam.db);
  await tarifleriTohumla(uygulama.ortam.db);
}, 90_000);

afterAll(async () => {
  await uygulama?.kapat();
});

// ---------------------------------------------------------------- yardımcılar

interface Kisi {
  token: string;
  id: string;
}

async function kayitOl(email: string): Promise<Kisi> {
  const cevap = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true, olcum_onayi: true },
  });
  expect(cevap.statusCode, `kayıt başarısız: ${cevap.body}`).toBe(201);
  const govde = cevap.json();
  return { token: govde.erisim_token, id: govde.kullanici.id };
}

const get = (k: Kisi, url: string): Promise<LightMyRequestResponse> =>
  app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${k.token}` } });

const post = (k: Kisi, url: string, payload: unknown = {}): Promise<LightMyRequestResponse> =>
  app.inject({
    method: 'POST',
    url,
    headers: { authorization: `Bearer ${k.token}` },
    payload: payload as never,
  });

/**
 * Cevapları kart kart gönderir — uygulamanın yaptığının aynısı.
 *
 * Tek seferde göndermek gerçek akışı atlar: kart sonu geri bildirimi, kapı
 * değerlendirmesi ve ilerleme kaydı ancak `blok_id` ile kart bittiğinde tetikleniyor.
 */
async function kartlariDoldur(kisi: Kisi, kartlar: Array<[string, Cevaplar]>) {
  const sonuclar = [];
  const birikmis: Cevaplar = {};

  for (const [blok, cevaplar] of kartlar) {
    Object.assign(birikmis, cevaplar);

    /**
     * Boş bırakılan İSTEĞE BAĞLI soruları atlanmış işaretle.
     *
     * Uygulama "Devam et"e basıldığında tam bunu yapıyor (`akis.ts`:
     * `atlananlariIsaretle`). Test bunu atladığında blok "tamamlanmamış" sayılıyor ve
     * sunucu `blok_geri_bildirimi: null` dönüyor — yani kart sonu ekranı hiç çıkmıyor.
     * Bu, gerçek istemcinin yapmadığı bir hatayı ürüne yazmak olurdu.
     */
    const gorunur = gorunurSorular(birikmis).filter((s) => s.blok_id === blok);
    for (const soru of gorunur) {
      if (soru.required) continue;
      const deger = birikmis[soru.id];
      if (deger === undefined || deger === null || deger === '') {
        birikmis[soru.id] = ATLANDI;
        (cevaplar as Cevaplar)[soru.id] = ATLANDI;
      }
    }

    const cevap = await post(kisi, '/v1/degerlendirme/cevap', { cevaplar, blok_id: blok });
    expect(cevap.statusCode, `${blok} kartı reddedildi: ${cevap.body}`).toBe(200);
    sonuclar.push({ blok, ...cevap.json() });
  }
  return sonuclar;
}

interface Gun {
  seans: { id: string; gun_tipi: string };
  hareketler: Array<{ exercise_id: string }>;
}

async function programiOku(kisi: Kisi) {
  const cevap = await get(kisi, '/v1/program/aktif');
  expect(cevap.statusCode, cevap.body).toBe(200);
  return cevap.json() as {
    hafta: number;
    plan: string;
    kilitli_gun_sayisi: number;
    uyarilar: string[];
    gunler: Gun[];
  };
}

/** Programdaki tüm hareket kimlikleri. */
const hareketler = (p: { gunler: Gun[] }) =>
  p.gunler.flatMap((g) => g.hareketler.map((h) => h.exercise_id));

/**
 * ED modunda sızmaması gereken sayısal alanlar.
 *
 * Yalnızca üst düzeye değil, ağacın her yerine bakılır: tek bir iç nesneden sızan
 * kalori, verilen sözü aynen bozar.
 */
function sayiSizintisi(deger: unknown): string[] {
  const yasakli = /^(kalori|hedef_kalori|protein_g|yag_g|karbonhidrat_g|tdee|bmr|hedef_kilo)$/;
  const sizinti: string[] = [];

  const gez = (d: unknown, yol: string) => {
    if (d === null || typeof d !== 'object') return;
    if (Array.isArray(d)) return d.forEach((e, i) => gez(e, `${yol}[${i}]`));
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
      if (yasakli.test(k) && typeof v === 'number' && v !== 0) sizinti.push(`${yol}.${k} = ${v}`);
      gez(v, `${yol}.${k}`);
    }
  };

  gez(deger, '');
  return sizinti;
}

/** Yerden çekiş varyantları. Romanian deadlift bir kalça menteşesi — o bu listede değil. */
const YERDEN_CEKIS = ['barbell-deadlift', 'sumo-deadlift', 'trap-bar-deadlift'];

// ------------------------------------------------------- PERSONA 1 · AYŞE

/**
 * Ayşe · 34 · kadın · evde antrenman · bel fıtığı · vegan · kısıtlı bütçe.
 *
 * Ücretsiz katmanda kalıyor. Aranan: ücretsiz duvarının **dürüst** olması — kapalı
 * olan kapalı görünmeli, açık olması gereken açık kalmalı.
 */
const AYSE_KARTLARI: Array<[string, Cevaplar]> = [
  ['K', { K1: '1992-06-10', K2: 'Kadın', K3: 164, K4: 78 }],
  [
    'G',
    {
      K7: 'Evet',
      K6: 'Hayır',
      S1: 'Hayır',
      S2: 'Hayır',
      S3: 'Hayır',
      S6: 'Evet',
      S7: 'Hayır',
      S18: 'Hayır',
    },
  ],
  ['A', { S17: ['Bel fıtığı'], S8: ['bel'], S11: 4, S12: ['Öne eğilme', 'Ağırlık kaldırma'] }],
  ['H', { H1: 'Yağ kaybı', H3: 68, H10: 2, H6: ['karin', 'kalca'] }],
  ['E', { E1: 'Ev', E3: ['Dumbbell', 'Direnç bandı'], E6: 'Var, zıplayamam' }],
  [
    'Z',
    {
      A1: '6 aydan az',
      Z1: '3 gün',
      Z2: '45 dakika',
      Z3: ['Pazartesi', 'Çarşamba', 'Cuma'],
      Y1: '6-7 saat',
      Y4: 'Masa başı, çoğunlukla oturarak',
    },
  ],
  ['B', { B9: ['Yok'], B10: ['Yok'], B11: ['Vegan'], B13: ['Mantar'] }],
  ['M', { B5: 'Kendim', B7: '30 dakikaya kadar', B8: 'Çok kısıtlı' }],
];

describe('Persona 1 · Ayşe — ücretsiz, evde, bel fıtıklı, vegan', () => {
  let ayse: Kisi;

  beforeAll(async () => {
    ayse = await kayitOl('ayse@persona.swiip.app');
  }, 60_000);

  it('sekiz kartın HER BİRİ sonunda geri bildirim döner', async () => {
    const sonuclar = await kartlariDoldur(ayse, AYSE_KARTLARI);

    const sessizler = sonuclar.filter((s) => !s.blok_geri_bildirimi).map((s) => s.blok);
    expect(
      sessizler,
      'geri bildirimi gelmeyen kart var. "Emeğinin karşılığını gör" ekranı terke karşı ' +
        'en güçlü kozumuz ve sessizce kaybolduğunda uygulama hata da vermiyor.',
    ).toEqual([]);

    expect(sonuclar.at(-1)!.ilerleme.tamamlandi).toBe(true);
  });

  it('profil derlenir ve bel fıtığı kısıtı profile geçer', async () => {
    expect((await post(ayse, '/v1/degerlendirme/tamamla')).statusCode).toBe(200);

    const profil = await get(ayse, '/v1/degerlendirme/profil');
    expect(profil.statusCode).toBe(200);
    expect(JSON.stringify(profil.json())).toMatch(/fıtık|omurga|eksenel/i);
  });

  it('ücretsiz katmanda YALNIZCA 1. gün teslim edilir', async () => {
    expect((await post(ayse, '/v1/program/uret')).statusCode).toBe(200);

    const program = await programiOku(ayse);
    expect(program.plan).toBe('ucretsiz');
    expect(program.gunler.length, 'ücretsiz katmanda birden fazla gün açılmış').toBe(1);
    expect(program.kilitli_gun_sayisi, 'kilitli gün sayısı söylenmiyor').toBeGreaterThan(0);
  });

  it('bel fıtığı olan kullanıcıya yerden çekiş verilmez', async () => {
    const varOlanlar = hareketler(await programiOku(ayse)).filter((h) => YERDEN_CEKIS.includes(h));
    expect(varOlanlar).toEqual([]);
  });

  it('evde tek başına çalışana bar altına girilen hareketler verilmez', async () => {
    const varOlanlar = hareketler(await programiOku(ayse)).filter((h) =>
      ['barbell-bench-press', 'barbell-squat', 'barbell-omuz-presi'].includes(h),
    );
    expect(varOlanlar).toEqual([]);
  });

  it('her hareketin okunabilir bir gerekçesi var', async () => {
    const program = await programiOku(ayse);
    const ilk = program.gunler[0]!.hareketler[0]!;

    const gerekce = await get(ayse, `/v1/program/gerekce/${ilk.exercise_id}`);
    expect(gerekce.statusCode, gerekce.body).toBe(200);
    expect(JSON.stringify(gerekce.json()).length).toBeGreaterThan(40);
  });

  it('program uyarısı kullanıcının SÖYLEMEDİĞİ bir şeyi ona atfetmez', async () => {
    const program = await programiOku(ayse);
    const hepsi = program.uyarilar.join(' ');
    expect(
      hepsi,
      'E8 sekiz kartta sorulmuyor; "yardımcın yok" demek kullanıcıya yapmadığı bir beyanı yükler.',
    ).not.toMatch(/Yardımcın olmadığı/i);
  });

  it('ücretsiz katmanda öğün planı kapalı ve nedeni söyleniyor', async () => {
    const plan = await post(ayse, '/v1/ogun/plan', { hafta_basi: '2026-08-24' });
    expect([402, 403]).toContain(plan.statusCode);
    expect(plan.body.length, 'kapalı kapı sessiz kapanmamalı').toBeGreaterThan(10);
  });

  it('manuel kalori girişi ÜCRETSİZ katmanda ÇALIŞIR — duvar oraya konmaz', async () => {
    const ara = await get(ayse, '/v1/beslenme/besin/ara?q=yulaf');
    expect(ara.statusCode, ara.body).toBe(200);

    const sonuclar = ara.json().sonuclar as Array<{ id: string }>;
    expect(sonuclar.length, 'besin araması boş döndü').toBeGreaterThan(0);

    const kayit = await post(ayse, '/v1/beslenme/kayit', {
      food_id: sonuclar[0]!.id,
      miktar: 60,
      ogun: 'kahvalti',
    });
    expect([200, 201]).toContain(kayit.statusCode);
  });

  it('verisini dışa aktarabilir', async () => {
    const disa = await get(ayse, '/v1/hesap/disa-aktar');
    expect(disa.statusCode, disa.body).toBe(200);
    expect(JSON.stringify(disa.json())).toMatch(/ayse@persona\.swiip\.app/);
  });
});

// ------------------------------------------------------- PERSONA 2 · MEHMET

/**
 * Mehmet · 45 · erkek · salon · 5+ yıl · kas kazanımı · laktoz intoleransı.
 *
 * Parasını ödüyor. Aranan: Pro'nun gerçekten açtıkları, ilerlemenin ikinci haftaya
 * taşınması ve **deneyimli kullanıcıya yeni-başlayan programı çıkarılmaması.**
 */
const MEHMET_KARTLARI: Array<[string, Cevaplar]> = [
  ['K', { K1: '1981-02-20', K2: 'Erkek', K3: 181, K4: 92 }],
  [
    'G',
    {
      K7: 'Evet',
      K6: 'Hayır',
      S1: 'Hayır',
      S2: 'Hayır',
      S3: 'Hayır',
      S6: 'Hayır',
      S7: 'Hayır',
      S18: 'Hayır',
    },
  ],
  ['A', { S17: ['Hayır'] }],
  ['H', { H1: 'Kas kazanımı', H3: 95, H10: 1, H6: ['gogus', 'sirt', 'kol'] }],
  [
    'E',
    {
      E1: 'Spor salonu',
      E3: [
        'Barbell ve plaka',
        'Dumbbell',
        'Düz bench',
        'Eğimli bench',
        'Squat rack',
        'Lat pulldown',
        'Kablo makinesi',
        'Leg press',
        'Barfiks barı',
      ],
    },
  ],
  [
    'Z',
    {
      A1: '5 yıldan fazla',
      Z1: '5 gün',
      Z2: '75 dakika',
      Z3: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
      Y1: '7-8 saat',
      Y4: 'Karma, biraz ayakta',
    },
  ],
  ['B', { B9: ['Yok'], B10: ['Laktoz'], B11: ['Yok'], B13: ['Yok'] }],
  ['M', { B5: 'Kendim', B7: '45 dakika ve üzeri', B8: 'Rahat' }],
];

describe('Persona 2 · Mehmet — Pro, salon, ileri seviye', () => {
  let mehmet: Kisi;

  beforeAll(async () => {
    mehmet = await kayitOl('mehmet@persona.swiip.app');
    await kartlariDoldur(mehmet, MEHMET_KARTLARI);
    await post(mehmet, '/v1/degerlendirme/tamamla');
    await post(mehmet, '/v1/abonelik/guncelle', { plan: 'pro' });
    await post(mehmet, '/v1/program/uret');
  }, 90_000);

  it('beş gün beyan eden kullanıcı beş seans görür ve hiçbiri kilitli değil', async () => {
    const program = await programiOku(mehmet);
    expect(program.plan).toBe('pro');
    expect(program.gunler.length).toBe(5);
    expect(program.kilitli_gun_sayisi).toBe(0);
  });

  it('salonda çalışan ileri kullanıcıya BARBELL bench press verilir — dizden şınav değil', async () => {
    const hepsi = hareketler(await programiOku(mehmet));

    expect(
      hepsi,
      'E8 (partner) sekiz kartta sorulmuyor. Cevapsızlığı "partnerim yok" beyanına ' +
        'çevrilirse barbell bench/squat/omuz presi havuzdan silinir ve beş yıllık ' +
        'kullanıcının göğüs hareketi dizden şınav olur — tam bu hata bir kez yapıldı.',
    ).toContain('barbell-bench-press');

    expect(hepsi, 'ileri seviyeye dizden şınav yazılmış').not.toContain('dizden-sinav');
  });

  it('yerden çekiş açık beyan olmadan havuza girmez', async () => {
    const varOlanlar = hareketler(await programiOku(mehmet)).filter((h) =>
      YERDEN_CEKIS.includes(h),
    );
    expect(varOlanlar, 'zorluk 5 yalnızca A8 beyanıyla gelmeli').toEqual([]);
  });

  it('seans geri bildirimi kaydedilir ve sonraki hafta üretilir', async () => {
    const program = await programiOku(mehmet);
    const gun = program.gunler[0]!;

    const geri = await post(mehmet, '/v1/program/geri-bildirim', {
      seans_id: gun.seans.id,
      kalemler: gun.hareketler.map((h) => ({
        hareket_id: h.exercise_id,
        sonuc: 'tamamladim',
        agri: false,
      })),
    });
    expect(geri.statusCode, geri.body).toBe(200);

    const sonraki = await post(mehmet, '/v1/program/sonraki-hafta');
    expect(sonraki.statusCode, sonraki.body).toBe(200);
    expect((await programiOku(mehmet)).hafta).toBe(2);
  });

  it('laktoz intoleransı öğün planında uygulanır', async () => {
    const plan = await post(mehmet, '/v1/ogun/plan', { hafta_basi: '2026-08-24' });
    expect(plan.statusCode, plan.body).toBe(200);

    const metin = JSON.stringify(plan.json()).toLocaleLowerCase('tr');
    for (const yasak of ['süt', 'peynir', 'yoğurt', 'ayran']) {
      expect(metin, `${yasak} laktoz intoleransı olana çıkmamalı`).not.toContain(yasak);
    }
  });

  it('koç sınırı tanı ve doz sorusunu modele ULAŞMADAN keser', async () => {
    const mesaj = await post(mehmet, '/v1/koc/mesaj', {
      mesaj: 'Dizim ağrıyor, menisküs yırtığı mı? Kaç mg ibuprofen almalıyım?',
    });

    expect([200, 400, 422, 503]).toContain(mesaj.statusCode);
    expect(mesaj.body.toLocaleLowerCase('tr')).not.toMatch(/menisküs yırtığın var|mg ibuprofen al/);
  });
});

// ------------------------------------------------------- PERSONA 3 · ZEYNEP

/**
 * Zeynep · 22 · kadın · yeme bozukluğu geçmişi (S18 = Evet).
 *
 * Kapı `ed_modu_ac`: program üretilir ama kalori, kilo ve makro sayıları GİZLENİR.
 * Bu görsel bir tercih değil, sağlık kararı — tek bir uçtan sızan sayı sözü bozar.
 */
const ZEYNEP_KARTLARI: Array<[string, Cevaplar]> = [
  ['K', { K1: '2004-09-05', K2: 'Kadın', K3: 168, K4: 55 }],
  [
    'G',
    {
      K7: 'Evet',
      K6: 'Hayır',
      S1: 'Hayır',
      S2: 'Hayır',
      S3: 'Hayır',
      S6: 'Hayır',
      S7: 'Hayır',
      S18: 'Evet',
    },
  ],
  ['A', { S17: ['Hayır'] }],
  ['H', { H1: 'Genel sağlık', H10: 0, H6: ['sirt'] }],
  ['E', { E1: 'Ev', E3: ['Direnç bandı'] }],
  [
    'Z',
    {
      A1: 'Hiç yapmadım',
      Z1: '3 gün',
      Z2: '30 dakika',
      Z3: ['Salı', 'Perşembe', 'Cumartesi'],
      Y1: '7-8 saat',
      Y4: 'Masa başı, çoğunlukla oturarak',
    },
  ],
  ['B', { B9: ['Yok'], B10: ['Yok'], B11: ['Yok'], B13: ['Yok'] }],
  ['M', { B5: 'Ailem', B7: '15 dakikaya kadar', B8: 'Orta' }],
];

describe('Persona 3 · Zeynep — yeme bozukluğu modu', () => {
  let zeynep: Kisi;

  beforeAll(async () => {
    zeynep = await kayitOl('zeynep@persona.swiip.app');
    await kartlariDoldur(zeynep, ZEYNEP_KARTLARI);
    await post(zeynep, '/v1/degerlendirme/tamamla');
  }, 90_000);

  it('ED kapısı tetiklenir ve kullanıcı kaydına işlenir', async () => {
    const ben = await get(zeynep, '/v1/kimlik/ben');
    expect(ben.statusCode).toBe(200);
    const govde = ben.json();
    expect((govde.kullanici ?? govde).ed_mode, 'ED modu açılmamış').toBe(true);
  });

  it('ED modu programı ENGELLEMEZ — kapı sayıları gizler, hareketi değil', async () => {
    expect((await post(zeynep, '/v1/program/uret')).statusCode).toBe(200);
    expect((await programiOku(zeynep)).gunler.length).toBeGreaterThan(0);
  });

  it('beslenme hedefinde hiçbir kalori/makro sayısı dönmez', async () => {
    const hedef = await get(zeynep, '/v1/beslenme/hedef');
    expect(hedef.statusCode, hedef.body).toBe(200);

    const sizinti = sayiSizintisi(hedef.json());
    expect(sizinti, `ED modunda sayı sızdı:\n${sizinti.join('\n')}`).toEqual([]);
  });

  it('profil çıktısında kalori ve kilo hedefi gizli', async () => {
    const sizinti = sayiSizintisi((await get(zeynep, '/v1/degerlendirme/profil')).json());
    expect(sizinti, `ED modunda profilden sayı sızdı:\n${sizinti.join('\n')}`).toEqual([]);
  });
});

// ------------------------------------------------------- PERSONA 4 · EMRE

/**
 * Emre · 28 · erkek · göğüs ağrısı beyanı (S2 = Evet).
 *
 * Sert kapı: program üretilmez, doktor onayı beklenir. "Atlanamaz" sözü tam burada
 * sınanıyor — ve engel mesajı tanı dili kullanmamalı.
 */
const EMRE_KARTLARI: Array<[string, Cevaplar]> = [
  ['K', { K1: '1998-11-11', K2: 'Erkek', K3: 175, K4: 88 }],
  [
    'G',
    {
      K7: 'Evet',
      K6: 'Hayır',
      S1: 'Evet',
      S2: 'Evet',
      S3: 'Hayır',
      S6: 'Hayır',
      S7: 'Hayır',
      S18: 'Hayır',
      S15: 'İlaçla kontrol altında',
    },
  ],
  ['A', { S17: ['Hayır'] }],
  ['H', { H1: 'Genel sağlık', H10: 1, H6: ['karin'] }],
  ['E', { E1: 'Spor salonu', E3: ['Dumbbell', 'Kablo makinesi'] }],
  [
    'Z',
    {
      A1: '6-12 ay',
      Z1: '3 gün',
      Z2: '45 dakika',
      Z3: ['Pazartesi', 'Çarşamba', 'Cuma'],
      Y1: '6-7 saat',
      Y4: 'Ayakta çalışıyorum',
    },
  ],
  ['B', { B9: ['Yok'], B10: ['Yok'], B11: ['Yok'], B13: ['Yok'] }],
  ['M', { B5: 'Kendim', B7: '30 dakikaya kadar', B8: 'Orta' }],
];

describe('Persona 4 · Emre — kardiyak kapı', () => {
  let emre: Kisi;
  let kapiCevabi: Record<string, unknown>;

  beforeAll(async () => {
    emre = await kayitOl('emre@persona.swiip.app');
    const sonuclar = await kartlariDoldur(emre, EMRE_KARTLARI);
    kapiCevabi = sonuclar.find((s) => s.blok === 'G')!;
  }, 90_000);

  it('güvenlik kartı biter bitmez kapı bildirilir — sekiz kart sonuna saklanmaz', () => {
    const kapi = kapiCevabi.kapi_durumu as { program_engelli?: boolean; kapilar?: unknown[] };
    expect(kapi, 'kart cevabında kapı durumu hiç dönmüyor').toBeDefined();
    expect(
      JSON.stringify(kapi).toLocaleLowerCase('tr'),
      'kapı tetiklendiği kartta söylenmiyor; kullanıcı yedi kart daha doldurup sonunda öğreniyor',
    ).toMatch(/kardiyak|doktor|onay|medikal|engel/);
  });

  it('program üretimi engellenir', async () => {
    await post(emre, '/v1/degerlendirme/tamamla');
    const uret = await post(emre, '/v1/program/uret');
    expect(uret.statusCode, `kardiyak kapı program üretimini engellemedi: ${uret.body}`).toBe(403);
  });

  it('engel mesajı tanı dili kullanmaz ama hekime yönlendirir', async () => {
    const metin = (await post(emre, '/v1/program/uret')).body.toLocaleLowerCase('tr');
    expect(metin).not.toMatch(/kalp hastasısın|kalp krizi|teşhis/);
    expect(metin).toMatch(/doktor|hekim|onay/);
  });
});
