/**
 * İstek sınırının kova anahtarı.
 *
 * Sınır IP başınaydı: dakikada 120 istek, kaynak IP'ye göre. Türkiye'de mobil
 * operatörlerin büyük kısmı CGNAT kullanıyor — binlerce abone aynı genel IP'den
 * çıkıyor. Aynı hücredeki otuz kullanıcı normal kullanımıyla bu sınırı birlikte
 * doldurabilir ve otuzu birden "Çok hızlı gidiyorsun" görür. Kimse hızlı gitmemiştir;
 * sadece aynı baz istasyonundadırlar.
 *
 * Oturum açmış istekte kimlik zaten elimizde: sınır kullanıcı başına uygulanıyor.
 * Kimliksiz uçlarda (kayıt, giriş, parola sıfırlama) IP kalmak zorunda — orada
 * korunmak istediğimiz şey zaten tek bir kaynaktan gelen deneme seli, ve o uçların
 * kendi dar sınırı ayrıca var (`KIMLIK_ISTEK_SINIRI`).
 */

export interface IstekKimligi {
  kullaniciId?: string;
  ip?: string;
}

export function istekAnahtari(istek: IstekKimligi): string {
  if (istek.kullaniciId) return `kul:${istek.kullaniciId}`;
  return `ip:${istek.ip ?? 'bilinmiyor'}`;
}
