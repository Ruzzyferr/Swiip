/**
 * Model çıktısından JSON çıkarır.
 *
 * Sistem mesajında "yalnızca JSON döndür" yazması yetmiyor: modeller cevabı alışkanlıkla
 * ```json çitiyle sarıyor, bazen önüne bir cümle koyuyor. `JSON.parse` ilk karakterde
 * patlıyor, hata sessizce yutuluyor ve kullanıcı "fotoğrafta tanıyabildiğim bir yemek
 * yok" görüyordu — model tabağı gayet iyi görmüşken.
 *
 * Sözü modelden beklemek yerine çıktıyı temizlemek doğru yer. Burası tek yer olsun diye
 * ayrı dosya: aynı hata iki ayrı ayrıştırıcıda birden vardı.
 */

const CIT = /^\s*```(?:[a-z]+)?\s*\n?([\s\S]*?)\n?\s*```\s*$/i;

function coz(metin: string): unknown | undefined {
  try {
    return JSON.parse(metin) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Ham metinden ilk geçerli JSON değerini döndürür; bulunamazsa `undefined`.
 *
 * Uydurulmuş bir nesne döndürmek, modelin söylemediği şeyi söylemiş saymak olurdu;
 * çağıran taraf `undefined` gördüğünde kendi güvenli yedeğine düşüyor.
 */
export function jsonCikar(ham: string): unknown | undefined {
  const temiz = ham.trim();
  if (temiz === '') return undefined;

  const dogrudan = coz(temiz);
  if (dogrudan !== undefined) return dogrudan;

  const citsiz = CIT.exec(temiz)?.[1];
  if (citsiz) {
    const cozulen = coz(citsiz.trim());
    if (cozulen !== undefined) return cozulen;
  }

  // Metnin içine gömülü ilk nesne veya dizi: en dıştaki parantezden en sonuncusuna.
  for (const [ac, kapa] of [
    ['{', '}'],
    ['[', ']'],
  ] as const) {
    const bas = temiz.indexOf(ac);
    const son = temiz.lastIndexOf(kapa);
    if (bas !== -1 && son > bas) {
      const cozulen = coz(temiz.slice(bas, son + 1));
      if (cozulen !== undefined) return cozulen;
    }
  }

  return undefined;
}
