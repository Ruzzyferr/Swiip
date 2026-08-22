/**
 * Uygulamanın dışarı açtığı adresler.
 *
 * Uzantı **bilinçli**: `https://swiip.app/gizlilik` uzantısız istendiğinde sunucu
 * 404 vermiyor, ana sayfayı döndürüyor. Yani yanlış yazılmış bir gizlilik bağlantısı
 * kırık görünmez — pazarlama sayfası açılır ve kimse fark etmez. Denenmiş: uzantısız
 * her yol `<title>Swiip — Ölçüne göre</title>` dönüyor.
 */

export const GIZLILIK_URL = 'https://swiip.app/gizlilik.html';

/**
 * Kullanım koşulları Apple'ın standart lisans sözleşmesi.
 *
 * App Store Connect'te "Apple's Standard License Agreement" seçili; kendi metnimiz
 * yok. Bağlantı da oraya gidiyor. Kendi koşullarımızı yazmadan "kullanım
 * koşullarımız" diye bir sayfa açmak, olmayan bir belgeye bağlantı vermek olurdu.
 */
export const KULLANIM_KOSULLARI_URL = 'https://www.apple.com/legal/itunes/appstore/dev/stdeula';
