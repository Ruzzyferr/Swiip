/**
 * "Bugün" kimin bugünü?
 *
 * Sunucu varsayılan günü `new Date().toISOString().slice(0, 10)` ile, yani UTC'ye göre
 * üretiyordu. Türkiye UTC+3: yerel saatle 00:00-03:00 arasında eklenen her kayıt
 * DÜNE yazılıyordu. Gün göndermeyen istemci yolları gerçek: barkodla eklenen ürün,
 * tanımadan onaylanan öğün ve İlerleme sekmesindeki tartı. Beslenme ekranı ise günü
 * cihazın yerel takviminden (`yerelGun()`) istiyor — gece yarısından sonra eklenen
 * yemek "bugün" listesinde hiç görünmüyor, dünün toplamını şişiriyordu. Program
 * tarihleri de aynı hatayla bir gün geriden başlıyordu.
 *
 * Kural:
 *  1. İstemci `x-saat-dilimi` başlığıyla geçerli bir IANA saat dilimi gönderirse o.
 *  2. Yoksa birincil pazarın saat dilimi. Saat dilimini bilmediğimiz kullanıcı için
 *     UTC de bir tahmin; Türkiye önce olduğu için tahminin doğru olacağı yer burası.
 *
 * Gövdede açıkça gelen `gun` her zaman önceliklidir; bu yalnızca varsayılan.
 */

export const VARSAYILAN_SAAT_DILIMI = 'Europe/Istanbul';

/** Verilen anın, verilen saat dilimindeki takvim günü (YYYY-AA-GG). */
export function yerelGunISO(simdi: Date = new Date(), saatDilimi = VARSAYILAN_SAAT_DILIMI): string {
  const bicim = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(simdi);

  try {
    return bicim(saatDilimi);
  } catch {
    // Geçersiz saat dilimi RangeError atar; istemcinin hatası 500 olmamalı.
    return bicim(VARSAYILAN_SAAT_DILIMI);
  }
}

/** İsteğin başlığından saat dilimini okuyup "bugün"ü verir. */
export function istekGunu(
  istek: { headers: Record<string, string | string[] | undefined> },
  simdi: Date = new Date(),
): string {
  const baslik = istek.headers['x-saat-dilimi'];
  const saatDilimi = typeof baslik === 'string' && baslik.length <= 64 ? baslik : undefined;
  return yerelGunISO(simdi, saatDilimi);
}
