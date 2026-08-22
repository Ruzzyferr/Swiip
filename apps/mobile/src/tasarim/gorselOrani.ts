/**
 * Hareket fotoğrafının kabı hangi orana kurulacak.
 *
 * Kaynak (free-exercise-db) tek bir orana sadık değil: 93 fotoğraf 3:2, ikisi 16:9,
 * biri kare, üçü de dikey (2:3'e kadar). Kabı sabit 4:3'e kurmak dikey fotoğrafların
 * **yüksekliğinin yarısını** kesiyordu — başı ve ayakları çerçevenin dışında kalan bir
 * hareket görseli, görselsiz olmaktan kötüdür.
 *
 * Bu yüzden oran fotoğrafın kendisinden okunuyor: kabı fotoğrafa uydurunca `cover`
 * hiçbir şey kesmez. Yalnızca uçlar sınırlanıyor, çünkü sınırsız bırakılırsa tam
 * genişlikte bir 2:3 fotoğraf ekrandan uzun olur ve altındaki talimatı aşağı iter.
 */

/** Bundan dar bir kap ekrandan taşar. 2:3 fotoğrafta %11 yükseklik kesilir. */
export const EN_DAR = 3 / 4;

/** Bundan geniş bir kap şerit gibi görünür; katalogda zaten böyle bir fotoğraf yok. */
export const EN_GENIS = 16 / 9;

/** Ölçüsü okunamayan fotoğrafta kaynağın baskın oranı. */
export const VARSAYILAN = 3 / 2;

export function gorselOrani(genislik?: number, yukseklik?: number): number {
  if (!genislik || !yukseklik || genislik <= 0 || yukseklik <= 0) return VARSAYILAN;
  return Math.min(Math.max(genislik / yukseklik, EN_DAR), EN_GENIS);
}
