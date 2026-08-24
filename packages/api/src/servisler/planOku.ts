import { eq } from 'drizzle-orm';
import { subscriptions } from '../db/sema';
import type { Plan } from './haklar';
import type { Veritabani } from '../db/baglanti';

/**
 * Kullanıcının **şu an geçerli** planı.
 *
 * Bu fonksiyon altı rotada birebir kopyalanmış dört satırın yerine geçiyor
 * (`abonelik`, `beslenme`, `koc`, `ogun`, `program`, `tanima`). Kopya olması tek başına
 * bir kusur değildi; kopyaların hepsinin **aynı eksiği** taşıması kusurdu:
 *
 * `subscriptions.renews_at` kanca tarafından yazılıyor ama plan okunurken hiçbir yerde
 * kontrol edilmiyordu. Yani hakkı bitiren tek mekanizma, RevenueCat'ten gelen
 * `EXPIRATION` kancasıydı. O kancanın kaybolması için olağanüstü bir şey gerekmiyor:
 *
 *   - Hatalı gövde 400 döndürüyor; RevenueCat sınırlı sayıda yeniden deneyip bırakıyor.
 *   - `/kanca` anonim istek kovasında; yenileme günü patlaması 429 yiyebiliyor.
 *   - Dağıtım penceresi ya da veritabanı kesintisi.
 *
 * Tek bir kayıp olay = **kalıcı bedava Pro.** Süreyi okuma anında uygulamak, kancadaki
 * her boşluğu (tekrar oynatma, sıra karışması, işlenmeyen olay tipi) açık kalan bir
 * kapı olmaktan çıkarıp en fazla "bir süre geç kapanan" bir kapıya çeviriyor.
 *
 * `renews_at` boşsa plan aynen geçerli sayılıyor: eski kayıtlarda ve bu alanı
 * taşımayan olaylarda ödeme yapmış kullanıcının hakkını almak yanlış yön olurdu.
 */

/**
 * Mağaza kancası bazen yenileme gününde birkaç saat gecikiyor; ayrıca Apple ve Google
 * kendi ödeme yeniden denemelerini yapıyor. Süre dolar dolmaz hakkı kesmek, parasını
 * ödemiş kullanıcıyı kapıda bırakırdı.
 */
export const EK_SURE_SAAT = 48;

export function planGecerliMi(yenilenme: Date | null, simdi = new Date()): boolean {
  if (!yenilenme) return true;
  return yenilenme.getTime() + EK_SURE_SAAT * 60 * 60 * 1000 > simdi.getTime();
}

export async function planOku(db: Veritabani, kullaniciId: string): Promise<Plan> {
  const [kayit] = await db
    .select({ plan: subscriptions.plan, yenilenme: subscriptions.renews_at })
    .from(subscriptions)
    .where(eq(subscriptions.user_id, kullaniciId))
    .limit(1);

  if (!kayit) return 'ucretsiz';
  if (!planGecerliMi(kayit.yenilenme)) return 'ucretsiz';

  return (kayit.plan as Plan) ?? 'ucretsiz';
}
