import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * İlerleme döngüsü KAPALI mı — motor kararı gerçekten plana yazılıyor mu?
 *
 * `CLAUDE.md` kilitli kararı: *"Program statik doküman değil; her seans önceki geri
 * bildirimden hesaplanır."* Bu ürünün ana vaadi.
 *
 * Var olan yolculuk testi geri bildirim ucundan dönen **cümleyi** sınıyordu
 * ("52,5 kg'a çıkıyor"). Cümle motorun çıktısı; planın kendisi değil. Cümlenin doğru
 * olması, kullanıcının bir sonraki seansta o ağırlığı görmesi anlamına gelmiyor —
 * ve gelmiyordu. Bu test cümleye değil **plana** bakıyor.
 *
 * Aynı sınıf hata: `set_degisimi` motorda hesaplanıyordu ve hiçbir yerde okunmuyordu.
 * Kullanıcıya "hacmi bir set düşürdüm" deniyor, set sayısı aynı kalıyordu — yani
 * uygulama kullanıcıya yapmadığı bir şeyi söylüyordu.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

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
  A2: 3,
  A3: 10,
  'A5:Squat': { kg: 100, tekrar: 5 },
  'A5:Bench press': { kg: 80, tekrar: 6 },
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
  E1: 'Spor salonu',
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

let token: string;

function yetkili() {
  return { authorization: `Bearer ${token}` };
}

interface Kalem {
  exercise_id: string;
  target_sets: number;
  target_weight: number | null;
  target_reps_low: number | null;
  target_reps_high: number | null;
}

interface Gun {
  seans: { id: string; status: string; gun_indeksi: number };
  hareketler: Kalem[];
}

async function aktifProgram(): Promise<{ hafta: number; gunler: Gun[] }> {
  const cevap = await app.inject({ method: 'GET', url: '/v1/program/aktif', headers: yetkili() });
  expect(cevap.statusCode).toBe(200);
  return cevap.json();
}

/** Aynı hareketin programdaki bütün kalemleri — hangi güne düştüğünden bağımsız. */
function kalemleriTopla(gunler: Gun[], hareketId: string): Kalem[] {
  return gunler.flatMap((g) => g.hareketler.filter((h) => h.exercise_id === hareketId));
}

async function geriBildirim(seansId: string, hareketId: string, sonuc: string) {
  const cevap = await app.inject({
    method: 'POST',
    url: '/v1/program/geri-bildirim',
    headers: yetkili(),
    payload: { seans_id: seansId, kalemler: [{ hareket_id: hareketId, sonuc, agri: false }] },
  });
  expect(cevap.statusCode).toBe(200);
  return cevap.json();
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: {
      email: 'ilerleme@swiip.app',
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
  // Geri bildirim Temel plandan itibaren acik; bu test o vaadi sinar.
  await app.inject({
    method: 'POST',
    url: '/v1/abonelik/guncelle',
    headers: yetkili(),
    payload: { plan: 'temel' },
  });

  const uretim = await app.inject({
    method: 'POST',
    url: '/v1/program/uret',
    headers: yetkili(),
    payload: { hafta: 1 },
  });
  if (uretim.statusCode !== 200) {
    throw new Error(`program uretilemedi: ${uretim.statusCode} ${uretim.body}`);
  }
}, 120_000);

afterAll(async () => {
  await uygulama?.kapat();
});

describe('geri bildirim planı gerçekten değiştirir', () => {
  it('"tamamladım" sonrası hareketin plandaki hedef ağırlığı artar', async () => {
    const once = await aktifProgram();
    const gun = once.gunler[0]!;

    // Ağırlıklı bir hareket seç: vücut ağırlığında ilerleme tekrar üzerinden yürür.
    const hedef = gun.hareketler.find((h) => (h.target_weight ?? 0) > 0);
    expect(hedef, 'ağırlıklı hareket bulunamadı').toBeTruthy();

    const oncekiKg = hedef!.target_weight!;
    const oncekiSet = hedef!.target_sets;

    const cevap = await geriBildirim(gun.seans.id, hedef!.exercise_id, 'tamamladim');
    expect(cevap.motor_kararlari.join(' ')).toMatch(/artıyor|tekrara/);

    const sonra = await aktifProgram();
    const sonrakiKalemler = kalemleriTopla(sonra.gunler, hedef!.exercise_id);

    // Motor "artıyor" dedi. Plandaki sayı da artmalı, yoksa kullanıcıya yalan söylüyoruz.
    const enBuyuk = Math.max(...sonrakiKalemler.map((k) => k.target_weight ?? 0));
    expect(enBuyuk).toBeGreaterThan(oncekiKg);

    /**
     * Ama SET SAYISI değişmemeli.
     *
     * `planaYansit` set sayısına da dokunuyor (`set_degisimi`). Başarılı bir seansta o
     * değer sıfır; sıfır olmasaydı kullanıcı iyi gittiği için hacmini kaybederdi.
     * Yükü doğrulayıp hacmi doğrulamamak, düzeltmenin yan etkisini görmemek olurdu.
     */
    for (const k of sonrakiKalemler) {
      expect(k.target_sets, `${hedef!.exercise_id} set sayısı değişmiş`).toBe(oncekiSet);
    }
  });

  it('iki hafta üst üste zorlanınca plandaki set sayısı düşer', async () => {
    const once = await aktifProgram();
    const gun = once.gunler[1] ?? once.gunler[0]!;
    const hedef = gun.hareketler.find((h) => (h.target_weight ?? 0) > 0)!;
    const oncekiSet = hedef.target_sets;

    // Hacim düşürme eşiği iki üst üste zorlanma.
    await geriBildirim(gun.seans.id, hedef.exercise_id, 'zorlandim');
    const ikinci = await geriBildirim(gun.seans.id, hedef.exercise_id, 'zorlandim');
    expect(ikinci.motor_kararlari.join(' ')).toContain('set düşürdüm');

    const sonra = await aktifProgram();
    const enKucukSet = Math.min(
      ...kalemleriTopla(sonra.gunler, hedef.exercise_id).map((k) => k.target_sets),
    );

    expect(enKucukSet).toBe(oncekiSet - 1);
  });
});

describe('sonraki hafta', () => {
  it('hafta ilerletilebilir ve kazanılan yük sıfırlanmaz', async () => {
    const once = await aktifProgram();
    const agirlikli = once.gunler
      .flatMap((g) => g.hareketler)
      .filter((h) => (h.target_weight ?? 0) > 0);
    expect(agirlikli.length).toBeGreaterThan(0);

    const yukler = new Map(agirlikli.map((h) => [h.exercise_id, h.target_weight!]));

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/program/sonraki-hafta',
      headers: yetkili(),
      payload: {},
    });
    expect(cevap.statusCode).toBe(200);

    const sonra = await aktifProgram();
    expect(sonra.hafta).toBe(once.hafta + 1);

    // Yeni haftanın yükleri değerlendirme tahminine geri dönmemeli: kullanıcı
    // haftalarca ilerledikten sonra başa döndürülemez.
    const ortak = sonra.gunler
      .flatMap((g) => g.hareketler)
      .filter((h) => yukler.has(h.exercise_id));
    expect(ortak.length).toBeGreaterThan(0);

    for (const h of ortak) {
      expect(h.target_weight ?? 0).toBeGreaterThanOrEqual(yukler.get(h.exercise_id)!);
    }
  });
});
