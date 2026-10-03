import type { FastifyInstance, InjectOptions } from 'fastify';
import { kayit_kodlari } from '../db/sema';
import { kodSonGecerlilik } from '../kimlik/kod';
import { tokenOzeti } from '../kimlik/parola';

/**
 * Testlerde kayıt: e-postaya giden kodu adım atlamadan değil, KODU YAZARAK geçer.
 *
 * Kayıt 2026-10-03'ten beri iki adımlı (`/kayit-kod` → `/kayit`). Yüzlerce test bir
 * hesap açmak için kayıt ucunu çağırıyor; her biri posta kutusunu okuyamaz. Bu yardımcı
 * `/kayit-kod`un yazacağı satırı doğrudan yazıyor ve isteğe kodu ekliyor — yani kayıt
 * ucunun kendi doğrulaması (kod, süre, tek kullanım) her testte gerçekten çalışıyor.
 * Kod akışının kendisi `kimlik.test.ts` ve `guvenlikSertlestirme.test.ts`'te uçtan uca.
 *
 * Aynı seçenekleri `app.inject` gibi alıyor: çağıran yerde yalnız fonksiyon adı değişti.
 */
export const TEST_KAYIT_KODU = '424242';

export async function kayitIstegi(app: FastifyInstance, secenekler: InjectOptions) {
  const govde = (secenekler.payload ?? {}) as Record<string, unknown>;
  if (typeof govde.email === 'string' && govde.kod === undefined) {
    await app.db.insert(kayit_kodlari).values({
      email: govde.email,
      kod_hash: tokenOzeti(TEST_KAYIT_KODU),
      expires_at: kodSonGecerlilik(),
    });
    return app.inject({ ...secenekler, payload: { ...govde, kod: TEST_KAYIT_KODU } });
  }
  return app.inject(secenekler);
}
