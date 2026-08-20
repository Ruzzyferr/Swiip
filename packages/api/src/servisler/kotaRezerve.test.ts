import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { quotas, users } from '../db/sema';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { kotaIadeEt, kotaRezerveEt } from './kotaRezerve';

/**
 * Kota rezervasyonu.
 *
 * Eski akış "oku, karar ver, sonra artır" idi. Aradaki boşlukta ikinci bir istek aynı
 * değeri okur ve ikisi de geçer: sınır 250 iken 260 AI çağrısı yapılabilir.
 *
 * Ürünün bilinen en büyük riski birim ekonomisi — Pro kullanıcının aylık AI maliyeti
 * gelirinin üçte biri. Kotanın delinmesi doğrudan marj sızıntısıdır ve paralel istekle
 * tetiklemek kolaydır.
 *
 * Çözüm: tek SQL cümlesinde koşullu artırma. Yer varsa artırır ve doğrular; yoksa hiç
 * dokunmaz. Karar ile yazma arasında boşluk kalmaz.
 */

let ortam: TestOrtami;
let KULLANICI = '';
const DONEM = '2026-09';

beforeAll(async () => {
  ortam = await testVeritabaniAc();

  // Kota satırı kullanıcıya yabancı anahtarla bağlı; gerçek bir kayıt gerekiyor.
  const [kullanici] = await ortam.db
    .insert(users)
    .values({ email: 'kota@made2fit.io', parola_hash: 'x', consent_health: new Date() })
    .returning({ id: users.id });
  KULLANICI = kullanici!.id;
}, 60_000);

afterAll(async () => {
  await ortam?.kapat();
});

async function kotaKur(kullanilan = 0) {
  await ortam.db.delete(quotas).where(eq(quotas.user_id, KULLANICI));
  await ortam.db.insert(quotas).values({
    user_id: KULLANICI,
    period: DONEM,
    food_photos_used: kullanilan,
    coach_messages_used: kullanilan,
  });
}

async function okunanDeger(): Promise<number> {
  const [kayit] = await ortam.db
    .select({ deger: quotas.food_photos_used })
    .from(quotas)
    .where(and(eq(quotas.user_id, KULLANICI), eq(quotas.period, DONEM)))
    .limit(1);
  return kayit?.deger ?? -1;
}

const rezerve = (sinir: number) =>
  kotaRezerveEt(ortam.db, {
    kullaniciId: KULLANICI,
    donem: DONEM,
    alan: 'food_photos_used',
    sinir,
  });

describe('kotaRezerveEt', () => {
  it('yer varsa rezerve eder ve sayacı artırır', async () => {
    await kotaKur(0);

    expect(await rezerve(3)).toBe(true);
    expect(await okunanDeger()).toBe(1);
  });

  it('sınıra ulaşıldığında reddeder ve sayaca dokunmaz', async () => {
    await kotaKur(3);

    expect(await rezerve(3)).toBe(false);
    expect(await okunanDeger()).toBe(3);
  });

  it('sınırın son birimini kullandırır', async () => {
    await kotaKur(2);

    expect(await rezerve(3)).toBe(true);
    expect(await okunanDeger()).toBe(3);
  });

  /**
   * Asıl mesele bu: eski "oku sonra artır" akışında paralel istekler sınırı aşıyordu.
   */
  it('paralel istekler sınırı aşamaz', async () => {
    await kotaKur(0);

    const sonuclar = await Promise.all(Array.from({ length: 20 }, () => rezerve(5)));

    expect(sonuclar.filter(Boolean)).toHaveLength(5);
    expect(await okunanDeger()).toBe(5);
  });

  it('kota kaydı yoksa reddeder — sessizce sınırsız hak vermeyiz', async () => {
    await ortam.db.delete(quotas).where(eq(quotas.user_id, KULLANICI));

    expect(await rezerve(5)).toBe(false);
  });

  it('sıfır sınırda hiç rezerve edilmez', async () => {
    await kotaKur(0);

    expect(await rezerve(0)).toBe(false);
    expect(await okunanDeger()).toBe(0);
  });
});

describe('kotaIadeEt', () => {
  /**
   * Rezerve ettikten sonra model çağrısı patlarsa hak geri verilmeli. Kullanıcı bizim
   * hatamızın bedelini ödemez — kota adaleti kuralının aynısı.
   */
  it('başarısız çağrıdan sonra hakkı geri verir', async () => {
    await kotaKur(0);
    await rezerve(5);

    await kotaIadeEt(ortam.db, {
      kullaniciId: KULLANICI,
      donem: DONEM,
      alan: 'food_photos_used',
    });

    expect(await okunanDeger()).toBe(0);
  });

  it('sayacı sıfırın altına düşürmez', async () => {
    await kotaKur(0);

    await kotaIadeEt(ortam.db, {
      kullaniciId: KULLANICI,
      donem: DONEM,
      alan: 'food_photos_used',
    });

    expect(await okunanDeger()).toBe(0);
  });
});

describe('dönem satırı açma', () => {
  it('satır yoksa açar ve rezerve eder', async () => {
    await ortam.db.delete(quotas).where(eq(quotas.user_id, KULLANICI));

    const sonuc = await kotaRezerveEt(ortam.db, {
      kullaniciId: KULLANICI,
      donem: DONEM,
      alan: 'food_photos_used',
      satiriAc: true,
      sinir: 5,
    });

    expect(sonuc).toBe(true);
    expect(await okunanDeger()).toBe(1);
  });

  it('satır açma kapalıysa yoktan hak üretmez', async () => {
    await ortam.db.delete(quotas).where(eq(quotas.user_id, KULLANICI));

    expect(await rezerve(5)).toBe(false);
  });
});
