/**
 * Gün / ay / yıl alanlarını ISO tarihe çeviren saf mantık (F2.2).
 *
 * Değerlendirmenin ilk sorusu doğum tarihi. Bileşende yaşayan bir birleştirme mantığı
 * gerçek bir kullanıcı denemesine kadar sınanamadı ve orada iki hata birden bulundu:
 * üç alanın değeri üst durumdan okunuyordu ama eksik girişte üst durum sıfırlanıyordu
 * (parçalar birbirini siliyordu), ve tek haneli gün/ay reddediliyordu.
 *
 * Mantık buraya alındı: saf, test edilebilir, arayüzden bağımsız. Bileşen artık yalnızca
 * üç metin kutusu tutuyor.
 *
 * Doğrulama gevşek değil: **18 yaş kapısı bu tarihe dayanıyor.** `new Date(1992, 1, 31)`
 * sessizce 2 Mart'a kayar; kabul edilirse yaş yanlış hesaplanır ve sağlık kapısı yanlış
 * karar verir.
 */

/** Makul doğum yılı aralığı. Dışı, yazım hatası ya da bozuk veridir. */
const EN_ERKEN_YIL = 1900;
const EN_GEC_YIL = 2100;

const SADECE_RAKAM = /^\d+$/;

export interface TarihParcalari {
  gun: string;
  ay: string;
  yil: string;
}

/**
 * Üç parçayı `YYYY-AA-GG` biçimine çevirir; geçersizse `null`.
 *
 * Tek haneli gün ve ay kabul edilir ve sıfırla doldurulur: kullanıcıya "03" yazdırmak,
 * hiçbir şey kazandırmayan bir engel.
 */
export function tarihBirlestir(gun: string, ay: string, yil: string): string | null {
  const g = gun.trim();
  const a = ay.trim();
  const y = yil.trim();

  if (!SADECE_RAKAM.test(g) || !SADECE_RAKAM.test(a) || !SADECE_RAKAM.test(y)) return null;
  if (y.length !== 4) return null;

  const gs = Number(g);
  const as = Number(a);
  const ys = Number(y);

  if (as < 1 || as > 12) return null;
  if (gs < 1 || gs > 31) return null;
  if (ys < EN_ERKEN_YIL || ys > EN_GEC_YIL) return null;

  // Takvimde gerçekten var mı? 31 Nisan ve artık olmayan yılda 29 Şubat burada elenir.
  const tarih = new Date(Date.UTC(ys, as - 1, gs));
  if (
    tarih.getUTCFullYear() !== ys ||
    tarih.getUTCMonth() !== as - 1 ||
    tarih.getUTCDate() !== gs
  ) {
    return null;
  }

  return `${y}-${String(as).padStart(2, '0')}-${String(gs).padStart(2, '0')}`;
}

/** ISO tarihi alanlara böler. Bozuk ya da boş girdi boş parçalar verir. */
export function tarihParcala(iso: string | null | undefined): TarihParcalari {
  const bos = { gun: '', ay: '', yil: '' };
  if (!iso) return bos;

  const e = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!e) return bos;

  return { yil: e[1]!, ay: e[2]!, gun: e[3]! };
}
