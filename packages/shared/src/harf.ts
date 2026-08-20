import { BCP47, type Dil } from './i18n';

/**
 * Dile bağlı harf dönüşümü (F10.1).
 *
 * Türkçe, büyük/küçük harf dönüşümünde özel davranan diller arasında: `i` → `İ` ve
 * `I` → `ı`. Bu yüzden arayüzün her yerinde `toLocaleUpperCase('tr-TR')` yazıyordu ve
 * doğruydu — Türkçe için.
 *
 * İngilizce kullanıcıda aynı sabit "high protein" etiketini **"HİGH PROTEİN"** yapıyor:
 * gözle yanlış, ekran okuyucuyla daha yanlış. Dönüşüm dilden bağımsız yazılamaz; ama
 * çağrı yerlerine dil etiketi serpiştirmek de aynı hatayı tekrar üretir. Karar tek yerde.
 */

/** Metni kullanıcının diline göre büyük harfe çevirir. */
export function buyukHarf(metin: string, dil: Dil): string {
  return metin.toLocaleUpperCase(BCP47[dil]);
}

/** Metni kullanıcının diline göre küçük harfe çevirir. */
export function kucukHarf(metin: string, dil: Dil): string {
  return metin.toLocaleLowerCase(BCP47[dil]);
}

/** Yalnızca ilk harfi büyütür; geri kalanına dokunmaz. */
export function cumleBasiHarfi(metin: string, dil: Dil): string {
  if (metin.length === 0) return metin;
  return buyukHarf(metin.charAt(0), dil) + metin.slice(1);
}
