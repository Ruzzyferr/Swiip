import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { testVeritabaniAc, type TestOrtami } from '../test/veritabani';
import { body_analyses, users } from '../db/sema';
import type { Veritabani } from '../db/baglanti';
import { vucutHakkiniRezerveEt } from './vucutRezerve';

/**
 * Sayım ile rezervasyon arasında boşluk kalmıyor mu?
 *
 * Rota düzeyindeki yarış testi (`vucutYaris.test.ts`) iki isteği aynı anda gönderiyor
 * ama iki isteğin sorguları tam olarak iç içe geçmediği için kusur varken de yeşildi:
 * sayım ile satırın açılması iki ayrı adımdı ve aradaki boşluk milisaniyelerdi.
 * Burada aynı kullanıcı için beş rezervasyon AYNI ANDA isteniyor — kilitsiz hâlde beşi
 * de sayımı 0 görüp satır açıyordu.
 */

let ortam: TestOrtami;
let db: Veritabani;
let kullaniciId: string;

beforeAll(async () => {
  ortam = await testVeritabaniAc();
  db = ortam.db as unknown as Veritabani;
  const [k] = await db
    .insert(users)
    .values({ email: 'kilit@swiip.app', parola_hash: 'x' })
    .returning({ id: users.id });
  kullaniciId = k!.id;
}, 60_000);

afterAll(async () => {
  await ortam?.kapat();
});

describe('vucutHakkiniRezerveEt', () => {
  it('eşzamanlı beş istekten yalnızca biri rezervasyon alıyor', async () => {
    const sonuclar = await Promise.all(
      Array.from({ length: 5 }, () =>
        vucutHakkiniRezerveEt(db, kullaniciId, new Date(0), (s) => s.toplam < 1),
      ),
    );

    expect(sonuclar.filter((r) => r !== null)).toHaveLength(1);

    const satirlar = await db
      .select()
      .from(body_analyses)
      .where(eq(body_analyses.user_id, kullaniciId));
    expect(satirlar).toHaveLength(1);
  });
});
