import { and, count, eq, gte, lt, or } from 'drizzle-orm';
import type { Veritabani } from '../db/baglanti';
import { body_analyses } from '../db/sema';

/**
 * Vücut analizi hakkının defter düzeyinde rezervasyonu.
 *
 * Hak kontrolü ile kaydın yazılması arasında görsel AI çağrısı var ve saniyeler sürüyor.
 * Eski akışta o aralıkta gelen ikinci istek de kontrolü geçiyordu: ücretsiz kullanıcı
 * çift dokunuşla ömür boyu **bir** olan hakkını iki analize çeviriyor ve iki görsel
 * çağrısının parası gidiyordu. Ürünün bilinen en büyük riski birim ekonomisi; kotanın
 * delinmesi doğrudan marj sızıntısı.
 *
 * `kotaRezerve.ts` bu işi göremiyor. Oradaki koşullu artırma `quotas` satırına yazıyor
 * ve o satır `YYYY-MM` ile anahtarlı — oysa ay ortasında ödemeye geçen kullanıcının
 * penceresi abonelik anında başlıyor. Kural dönemsel bir sayaçla ifade edilemiyor;
 * denendi ve `vucutHakki.test.ts` haklı olarak düştü.
 *
 * Bu yüzden rezervasyon defterin kendisine yazılıyor: satır AI çağrısından **önce**
 * `tamamlandi = false` ile açılıyor, sonra tamamlanıyor, hata olursa siliniyor.
 */

/**
 * Yarım kalmış rezervasyonun hakkı ne kadar tutması gerektiği.
 *
 * Süreç istek ortasında ölürse (dağıtım, çökme, ağ kopması) `finally` çalışmaz ve satır
 * asılı kalır. Bu değer olmasaydı tek bir kaza ücretsiz kullanıcının ömür boyu hakkını
 * kalıcı olarak yakardı — bizim hatamızın bedelini kullanıcı ödemez.
 *
 * Üst sınır görsel çağrısının makul en uzun süresinden bolca geniş: istemci zaman aşımı
 * 20 saniye, buradaki pencere 10 dakika.
 */
export const REZERVASYON_OMRU_MS = 10 * 60 * 1000;

/**
 * Sayıma giren satırlar: tamamlanmış her analiz, artı henüz süresi dolmamış rezervasyonlar.
 *
 * Süresi geçmiş rezervasyon sayılmıyor — silinmesini beklemiyoruz, sorgu zaten yok sayıyor.
 */
function sayilanlar(simdi: Date) {
  const esik = new Date(simdi.getTime() - REZERVASYON_OMRU_MS);
  return or(eq(body_analyses.tamamlandi, true), gte(body_analyses.taken_at, esik));
}

export interface VucutSayimi {
  /** Ömür boyu — ücretsiz katmanın tek seferlik hakkı buna bakıyor. */
  toplam: number;
  /** Hak döneminin başından beri — ödemeli katmanın aylık hakkı buna bakıyor. */
  donem: number;
}

/** Hem hak kontrolü hem sayaç gösterimi buradan okur; ikisi ayrışamaz. */
export async function vucutSayimi(
  db: Veritabani,
  kullaniciId: string,
  donemBasi: Date,
  simdi: Date = new Date(),
): Promise<VucutSayimi> {
  const gecerli = sayilanlar(simdi);

  const [toplam] = await db
    .select({ adet: count() })
    .from(body_analyses)
    .where(and(eq(body_analyses.user_id, kullaniciId), gecerli));

  const [donem] = await db
    .select({ adet: count() })
    .from(body_analyses)
    .where(
      and(eq(body_analyses.user_id, kullaniciId), gte(body_analyses.taken_at, donemBasi), gecerli),
    );

  return { toplam: toplam?.adet ?? 0, donem: donem?.adet ?? 0 };
}

/**
 * Satırı açar ve kimliğini döner. Çağrı bundan SONRA yapılır.
 *
 * `yontem` burada `'rezerve'`; tamamlanınca motorun gerçek yöntemiyle değişiyor. Kolon
 * `NOT NULL` ve varsayılanı yok, o yüzden bir yer tutucu şart — boş dize yerine okunur
 * bir sözcük, çünkü bir gün elle bakan biri bunu görecek.
 */
export async function vucutRezerveEt(db: Veritabani, kullaniciId: string): Promise<string> {
  const [satir] = await db
    .insert(body_analyses)
    .values({ user_id: kullaniciId, yontem: 'rezerve', tamamlandi: false })
    .returning({ id: body_analyses.id });

  return satir!.id;
}

/** Çağrı başarısız olduysa rezervasyonu siler — hak geri gelir. */
export async function vucutRezervasyonuBirak(db: Veritabani, id: string): Promise<void> {
  await db
    .delete(body_analyses)
    .where(and(eq(body_analyses.id, id), eq(body_analyses.tamamlandi, false)));
}

/**
 * Süresi geçmiş asılı rezervasyonları temizler.
 *
 * `sayilanlar` bunları zaten yok sayıyor, yani hak açısından şart değil. Temizlik yine
 * de yapılıyor: defter kullanıcıya `GET /analizler` ile gösteriliyor ve orada yarım
 * satır birikmesi istenmiyor.
 */
export async function oluRezervasyonlariSil(
  db: Veritabani,
  kullaniciId: string,
  simdi: Date = new Date(),
): Promise<void> {
  await db
    .delete(body_analyses)
    .where(
      and(
        eq(body_analyses.user_id, kullaniciId),
        eq(body_analyses.tamamlandi, false),
        lt(body_analyses.taken_at, new Date(simdi.getTime() - REZERVASYON_OMRU_MS)),
      ),
    );
}
