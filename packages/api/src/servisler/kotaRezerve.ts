import { and, eq, sql } from 'drizzle-orm';
import type { Veritabani } from '../db/baglanti';
import { quotas } from '../db/sema';

/**
 * Kota rezervasyonu.
 *
 * Eski akış "oku → karar ver → AI'ı çağır → artır" idi. Okuma ile artırma arasındaki
 * boşlukta ikinci bir istek aynı değeri okur ve ikisi de geçer. Sınır 250 iken paralel
 * istekle 260 çağrı yapılabilir.
 *
 * Bu bir performans ayrıntısı değil: ürünün bilinen en büyük riski birim ekonomisi.
 * Pro kullanıcının aylık AI maliyeti gelirinin üçte biri ve kotanın delinmesi doğrudan
 * marj sızıntısı. Tetiklemesi de kolay — sınıra yakınken elli paralel istek yeter.
 *
 * Çözüm: koşullu artırma tek SQL cümlesinde. Veritabanı satırı kilitler; karar ile yazma
 * arasında boşluk kalmaz.
 *
 * Sıra da değişiyor: hak **model çağrılmadan önce** rezerve ediliyor. Çağrı başarısız
 * olursa iade ediliyor — kullanıcı bizim hatamızın bedelini ödemez.
 */

export type KotaAlani = 'food_photos_used' | 'coach_messages_used' | 'body_analyses_used';

export interface KotaIstegi {
  kullaniciId: string;
  donem: string;
  alan: KotaAlani;
}

export interface KotaRezervasyonu extends KotaIstegi {
  sinir: number;
  /**
   * Dönem satırı yoksa oluşturulsun mu?
   *
   * Uçlar ilk kullanımda satırı kendisi açar. Varsayılan kapalı: kayıt eksikliğini
   * sessizce hak diye yorumlamak, veri hatasını ücretsiz AI'a çevirmek olurdu.
   */
  satiriAc?: boolean;
}

const KOLONLAR = {
  food_photos_used: quotas.food_photos_used,
  coach_messages_used: quotas.coach_messages_used,
  body_analyses_used: quotas.body_analyses_used,
} as const;

/**
 * Hak varsa rezerve eder ve `true` döner; yoksa hiçbir şeye dokunmadan `false`.
 *
 * Kota kaydı yoksa da `false`: kayıt eksikliğini sınırsız hak diye yorumlamak,
 * bir veri hatasını ücretsiz AI'a çevirmek olurdu.
 */
export async function kotaRezerveEt(db: Veritabani, istek: KotaRezervasyonu): Promise<boolean> {
  const kolon = KOLONLAR[istek.alan];

  if (istek.satiriAc) {
    // Yarış güvenli: aynı anda iki istek gelse biri sessizce düşer.
    await db
      .insert(quotas)
      .values({ user_id: istek.kullaniciId, period: istek.donem })
      .onConflictDoNothing();
  }

  const sonuc = await db
    .update(quotas)
    .set({ [istek.alan]: sql`${kolon} + 1` })
    .where(
      and(
        eq(quotas.user_id, istek.kullaniciId),
        eq(quotas.period, istek.donem),
        sql`${kolon} < ${istek.sinir}`,
      ),
    )
    .returning({ id: quotas.user_id });

  return sonuc.length > 0;
}

/** Rezerve edilen hakkı geri verir. Sayaç sıfırın altına düşmez. */
export async function kotaIadeEt(db: Veritabani, istek: KotaIstegi): Promise<void> {
  const kolon = KOLONLAR[istek.alan];

  await db
    .update(quotas)
    .set({ [istek.alan]: sql`greatest(0, ${kolon} - 1)` })
    .where(and(eq(quotas.user_id, istek.kullaniciId), eq(quotas.period, istek.donem)));
}
