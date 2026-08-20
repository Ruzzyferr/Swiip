import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';
import { besinleriTohumla, tarifleriTohumla } from '../db/tohum';

/**
 * "Kaydırmalı öğün değiştirme" gerçekten değiştiriyor mu?
 *
 * Spec bölüm 10: *"Kullanıcı planladığımız öğünü beğenmediğinde, o öğünün makro
 * bütçesini koruyan alternatifler arasında kart kaydırarak gezer."* Plan ekranındaki
 * düğmenin adı da "Değiştir".
 *
 * İki ayrı kusur vardı ve ikisi de sessizdi:
 *
 * 1. **Öğün hedefi yanlış öğünden geliyordu.** Uç, öğünü `kod` ile değil Türkçe `ad`
 *    üzerinden eşleştiriyordu: `'Akşam'.toLocaleLowerCase('tr-TR')` → `'akşam'`, aranan
 *    önek `'aks'`; `ş !== s` olduğu için eşleşme tutmuyor ve kod sessizce **öğle**
 *    hedefine düşüyordu. Akşam öğünü günlüğün %40'ı, öğle %35'i — kullanıcı akşam için
 *    öğle boyunda tarifler görüyordu. Makro kilidi ±%8 sözü buradan kırılıyordu.
 *
 * 2. **Seçim plana yazılmıyordu.** Sağa kaydırma yalnızca tercih öğreniyordu;
 *    `meal_plans.days_jsonb` hiç güncellenmiyordu. Kullanıcı beğendiği tarifi seçiyor,
 *    plana dönüyor ve eski öğünü görüyordu.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

const CEVAPLAR = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K6: 'Hayır',
  K7: 'Evet',
  H1: 'Kas kazanımı',
  H10: 1,
  A1: '1-3 yıl',
  A3: 10,
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
  E1: 'Spor salonu',
  E3: ['Barbell ve plaka', 'Dumbbell'],
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
};

const HAFTA = '2026-08-17';

function yetkili() {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
  await besinleriTohumla(uygulama.ortam.db);
  await tarifleriTohumla(uygulama.ortam.db);

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: {
      email: 'ogun-degistir@made2fit.io',
      parola: 'Kirmizi-Bisiklet-42',
      saglik_onayi: true,
      olcum_onayi: true,
    },
  });
  token = kayit.json().erisim_token;

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: yetkili(),
    payload: { cevaplar: CEVAPLAR },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: yetkili(),
    payload: {},
  });
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: yetkili(),
    payload: { plan: 'temel' },
  });

  const plan = await app.inject({
    method: 'POST',
    url: '/v1/ogun/plan',
    headers: yetkili(),
    payload: { hafta_basi: HAFTA },
  });
  if (plan.statusCode !== 200) {
    throw new Error(`plan uretilemedi: ${plan.statusCode} ${plan.body}`);
  }
}, 120_000);

afterAll(async () => {
  await uygulama?.kapat();
});

async function deste(ogun: string) {
  const cevap = await app.inject({
    method: 'GET',
    url: `/v1/ogun/deste?ogun=${ogun}`,
    headers: yetkili(),
  });
  expect(cevap.statusCode).toBe(200);
  return cevap.json();
}

async function planiOku() {
  const cevap = await app.inject({
    method: 'GET',
    url: `/v1/ogun/plan/${HAFTA}`,
    headers: yetkili(),
  });
  expect(cevap.statusCode).toBe(200);
  return cevap.json().plan.days_jsonb as Array<{
    gun: number;
    ogunler: Array<{
      ad: string;
      kod?: string;
      hedef: { kalori: number };
      tarif: { id: string; ad: string } | null;
    }>;
  }>;
}

describe('öğün hedefi doğru öğünden gelir', () => {
  it('akşam destesi akşam hedefini kullanır, öğleye düşmez', async () => {
    const kahvalti = await deste('kahvalti');
    const ogle = await deste('ogle');
    const aksam = await deste('aksam');

    // Dağılım: kahvaltı %25, öğle %35, akşam %40. Üçü de farklı olmak zorunda.
    expect(kahvalti.hedef.kalori).toBeLessThan(ogle.hedef.kalori);
    expect(aksam.hedef.kalori).toBeGreaterThan(ogle.hedef.kalori);
  });

  it('tanınmayan öğün kodu sessizce başka bir öğüne düşmez', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/ogun/deste?ogun=bilinmeyen',
      headers: yetkili(),
    });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().kod).toBe('ogun_kodu_gecersiz');
  });
});

describe('öğün adları okuma anında çözülür', () => {
  it('dil değişince plandaki öğün adları da değişir', async () => {
    const trPlan = await app.inject({
      method: 'GET',
      url: `/v1/ogun/plan/${HAFTA}`,
      headers: yetkili(),
    });
    const trAdlar = (
      trPlan.json().plan.days_jsonb as Array<{ ogunler: Array<{ ad: string }> }>
    )[0]!.ogunler.map((o) => o.ad);
    expect(trAdlar.join(' ')).toMatch(/Kahvaltı|Öğle|Akşam/);

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil: 'en' },
    });

    const enPlan = await app.inject({
      method: 'GET',
      url: `/v1/ogun/plan/${HAFTA}`,
      headers: yetkili(),
    });
    const enAdlar = (
      enPlan.json().plan.days_jsonb as Array<{ ogunler: Array<{ ad: string }> }>
    )[0]!.ogunler.map((o) => o.ad);

    /**
     * Plan üretildiği anda kullanıcının dilindeki ad `days_jsonb`'ye YAZILIYORDU.
     * Dil değiştiğinde kayıt olduğu gibi kaldığı için İngilizce arayüzde "KAHVALTI"
     * görünüyordu. Cümleyi saklamak yerine parçalarını saklamak gerekiyor: `kod`
     * kayıtta durur, ad okuma anında çözülür.
     */
    expect(
      enAdlar.join(' '),
      `İngilizce planda Türkçe öğün adı: ${enAdlar.join(', ')}`,
    ).not.toMatch(/Kahvaltı|Öğle|Akşam/);

    // Geri al: sonraki testler Türkçe bekliyor.
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil: 'tr' },
    });
  });

  it('İngilizce kullanıcıya deste mesajı Türkçe gitmiyor', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil: 'en' },
    });

    /**
     * Boş deste hâli de dahil her mesaj sınanıyor.
     *
     * Cihazda İngilizce arayüzde şu görülmüştü:
     * "Dolabındakilerle bu öğün için seçenek çıkmıyor. zeytinyağı, soğan ... eklersen
     * 68 seçenek açılıyor." Motor cümleyi sabitliyordu.
     *
     * MALZEME ADLARI Türkçe kalır ve bu bilinçli — besin veritabanı Türkçe, ayarlardaki
     * dil notu bunu zaten söylüyor. Sınanan şey CÜMLE.
     */
    const kaliplar = /seçenek çıkmıyor|eklersen|bulunamadı|Hangisini seçersen|Bugün ne pişti/;

    for (const ogun of ['kahvalti', 'ogle', 'aksam']) {
      for (const dolaptan of ['false', 'true']) {
        const cevap = await app.inject({
          method: 'GET',
          url: `/v1/ogun/deste?ogun=${ogun}&dolaptan=${dolaptan}`,
          headers: yetkili(),
        });
        expect(cevap.statusCode).toBe(200);
        const mesaj = String(cevap.json().mesaj ?? '');
        expect(mesaj, `${ogun}/${dolaptan} mesajı Türkçe: "${mesaj}"`).not.toMatch(kaliplar);
        expect(mesaj.length).toBeGreaterThan(0);
      }
    }

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: yetkili(),
      payload: { dil: 'tr' },
    });
  });
});

describe('seçilen tarif plana yazılır', () => {
  it('öğün değiştirilince plandaki tarif gerçekten değişir', async () => {
    const once = await planiOku();
    const gun0 = once[0]!;
    const aksamIndeksi = gun0.ogunler.length - 1;
    const eskiTarif = gun0.ogunler[aksamIndeksi]!.tarif!.id;

    const kartlar = (await deste('aksam')).kartlar as Array<{ id: string }>;
    const yeni = kartlar.find((k) => k.id !== eskiTarif);
    expect(yeni, 'alternatif tarif bulunamadı').toBeTruthy();

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/ogun/degistir',
      headers: yetkili(),
      payload: { hafta_basi: HAFTA, gun: 0, ogun_kod: 'aksam', tarif_id: yeni!.id },
    });
    expect(cevap.statusCode).toBe(200);

    const sonra = await planiOku();
    expect(sonra[0]!.ogunler[aksamIndeksi]!.tarif!.id).toBe(yeni!.id);

    // Diğer günler değişmemeli: tek öğün değiştirmek haftayı yeniden kurmaz.
    expect(sonra[1]!.ogunler[aksamIndeksi]!.tarif!.id).toBe(
      once[1]!.ogunler[aksamIndeksi]!.tarif!.id,
    );
  });

  it('makro kilidini bozan bir tarif plana yazılamaz', async () => {
    const kahvaltiKartlari = (await deste('kahvalti')).kartlar as Array<{ id: string }>;

    // Kahvaltılık bir tarif akşam hedefine (%40) uymaz; sessizce kabul edilmemeli.
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/ogun/degistir',
      headers: yetkili(),
      payload: {
        hafta_basi: HAFTA,
        gun: 0,
        ogun_kod: 'aksam',
        tarif_id: kahvaltiKartlari[0]!.id,
      },
    });

    // Destede olmayan tarif plana yazilamaz: kisit cozucusunu atlatmak olurdu.
    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().kod).toBe('makro_kilidi');
  });
});
