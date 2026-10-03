/**
 * Kameranın çekeceği kare boyutu.
 *
 * Sunucu fotoğraf başına en fazla 2 MB kabul ediyor (`FOTOGRAF_MAKS_BAYT`) ve gövde
 * sınırı 12 MB. Kamera varsayılan olarak sensörün TAM çözünürlüğünü veriyor: 12-50 MP'lik
 * bir telefonda `quality: 0.6` ile bile tek kare 2 MB'ı aşabiliyor ve analiz 400 ile
 * dönüyordu — üstelik kullanıcı tüm protokolü (üç poz, açı, ışık) uyguladıktan sonra.
 *
 * Görsel model zaten ~1.5 bin piksele küçültüyor; daha büyük kare yalnızca yükü ve
 * reddi büyütüyor. Uzun kenarı en fazla `UZUN_KENAR` olan en büyük boyut seçiliyor.
 */
export const UZUN_KENAR = 1920;

/** "1920x1080" biçimindeki boyutlardan uygun olanı; hiçbiri uymuyorsa `undefined`. */
export function uygunKareBoyutu(boyutlar: readonly string[]): string | undefined {
  let enIyi: { ad: string; alan: number } | undefined;
  for (const ad of boyutlar) {
    const eslesme = /^(\d+)x(\d+)$/.exec(ad);
    if (!eslesme) continue;
    const g = Number(eslesme[1]);
    const y = Number(eslesme[2]);
    if (Math.max(g, y) > UZUN_KENAR) continue;
    const alan = g * y;
    if (!enIyi || alan > enIyi.alan) enIyi = { ad, alan };
  }
  return enIyi?.ad;
}
