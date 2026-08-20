/**
 * Görsel girdi boyutu sınırı.
 *
 * Kota çağrı **sayısını** sınırlıyor, maliyeti değil. Görsel modelde maliyet girdi
 * boyutuyla büyür: 12 MB'lık bir fotoğraf, sıkıştırılmış bir karenin onlarca katı tokene
 * karşılık gelir. Tek bir kullanıcı aylık marjı bu yoldan yakabilir — kotası dolmadan.
 *
 * `CLAUDE.md`: "Yeni bir yere AI koymadan önce maliyetini hesapla." Hesabın karşılığı
 * girdiyi sınırlamak; yoksa hesap tahminde kalır.
 *
 * Sınır bilinçli olarak cömert. Uygulamanın kendi çektiği kare (quality 0.6) bunun çok
 * altında; amaç kullanıcıyı zorlamak değil, uç durumu kesmek.
 */

/** İzin verilen en büyük fotoğraf boyutu (çözülmüş bayt). */
export const FOTOGRAF_MAKS_BAYT = 2 * 1024 * 1024;

const VERI_URI_ONEKI = /^data:[^;]+;base64,/;

/**
 * Base64 dizesinin taşıdığı yaklaşık bayt sayısı.
 *
 * Dizeyi çözmüyoruz: 12 MB'lık bir girdiyi belleğe açmak, tam da kaçınmak istediğimiz
 * masrafı yapmak olurdu. Uzunluktan hesaplamak yeterli ve ucuz.
 */
export function base64Bayt(veri: string): number {
  const govde = veri.replace(VERI_URI_ONEKI, '').trim();
  if (govde.length === 0) return 0;

  const dolgu = govde.endsWith('==') ? 2 : govde.endsWith('=') ? 1 : 0;
  return Math.floor((govde.length * 3) / 4) - dolgu;
}

export function fotografBoyutuUygunMu(veri: string): boolean {
  return base64Bayt(veri) <= FOTOGRAF_MAKS_BAYT;
}
