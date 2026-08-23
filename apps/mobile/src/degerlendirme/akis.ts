import {
  ATLANDI,
  cevabiDogrula,
  gorunurSorular,
  sonrakiSoru,
  type Cevaplar,
  type GorunurSoru,
} from '@swiip/core';
import { SORU_BANKASI } from '@swiip/shared';

/**
 * Değerlendirme akışı: ekranda hangi soruların durduğu ve ne zaman ilerlendiği.
 *
 * İki ayrı hata bu dosyanın var olma sebebi.
 *
 * 1. Gösterilen soru doğrudan `sonrakiSoru(cevaplar)` ile hesaplanıyordu. Kullanıcı bir
 *    şık seçer seçmez cevap kümesi değişiyor ve ekran kendiliğinden ilerliyordu. "Devam
 *    et" cevabı sunucuya kaydeden TEK yol; sıra ona hiç gelmiyordu. Hiçbir cevap
 *    sunucuya yazılmıyor, blok sonu geri bildirimleri hiç görünmüyor ve dört güvenlik
 *    kapısı sunucuda hiç değerlendirilmiyordu — hepsi sessizce.
 *
 * 2. Ekran başına tek soru vardı: 134 soru, 134 ekran, her birinin %80'i boş. On iki
 *    dakikalık bir angarya ve terk sebebi. Sorular artık bloklar hâlinde gösteriliyor;
 *    blok zaten soru bankasının kendi yapısı, uydurulmuş bir gruplama değil.
 */

export type Blok = (typeof SORU_BANKASI.blocks)[number];

/** Bir bloğun o anda görünür soruları. Dallanma cevap girildikçe yenilerini açabilir. */
export function blokSorulari(cevaplar: Cevaplar, blokId: string): GorunurSoru[] {
  return gorunurSorular(cevaplar).filter((s) => s.blok_id === blokId);
}

/**
 * Ekranda duracak blok.
 *
 * `secili` boşsa ya da o blokta görünür soru kalmadıysa sıradaki cevaplanmamış sorunun
 * bloğuna düşülür. Cevap dallanmayı değiştirip bloğu tamamen boşaltabiliyor; orada
 * kilitli kalmak kullanıcıyı çıkışsız bırakır.
 */
export function gosterilecekBlokId(
  cevaplar: Cevaplar,
  secili: string | undefined,
): string | undefined {
  if (secili !== undefined && blokSorulari(cevaplar, secili).length > 0) return secili;
  return sonrakiSoru(cevaplar)?.blok_id;
}

/** Cetvelin bölümleri: blok başına toplam ve cevaplanan görünür soru sayısı. */
export function blokBolumleri(
  cevaplar: Cevaplar,
): Array<{ id: string; ad: string; toplam: number; cevaplanan: number }> {
  const gorunur = gorunurSorular(cevaplar);

  return SORU_BANKASI.blocks
    .map((blok) => {
      const sorular = gorunur.filter((s) => s.blok_id === blok.id);
      return {
        id: blok.id,
        ad: blok.title,
        toplam: sorular.length,
        cevaplanan: sorular.filter((s) => cevaplandiMi(cevaplar, s)).length,
      };
    })
    .filter((b) => b.toplam > 0);
}

/** Bir soru geçerli biçimde cevaplandı mı (atlanmış da sayılır). */
export function cevaplandiMi(cevaplar: Cevaplar, soru: GorunurSoru): boolean {
  const deger = cevaplar[soru.id];
  if (deger === undefined || deger === null || deger === '') return false;
  if (Array.isArray(deger) && deger.length === 0) return false;
  return cevabiDogrula(soru, deger as never).gecerli;
}

/**
 * Blok ilerlemeye hazır mı?
 *
 * Yalnızca ZORUNLU sorular engelliyor. İsteğe bağlı olanlar boş bırakılabiliyor —
 * her biri için ayrı bir "Atla" düğmesine dokunmak yüzden fazla gereksiz dokunuş
 * demekti. Boş bırakılan isteğe bağlı soru ilerlerken atlanmış sayılıyor.
 */
export function blokHatalari(cevaplar: Cevaplar, blokId: string): Record<string, string> {
  const hatalar: Record<string, string> = {};

  for (const soru of blokSorulari(cevaplar, blokId)) {
    const deger = cevaplar[soru.id];
    const bos = deger === undefined || deger === null || deger === '';

    if (bos) {
      if (soru.required)
        hatalar[soru.id] = 'Bu soruyu cevaplaman gerekiyor; programın buna dayanıyor.';
      continue;
    }

    const dogrulama = cevabiDogrula(soru, deger as never);
    if (!dogrulama.gecerli && dogrulama.mesaj) hatalar[soru.id] = dogrulama.mesaj;
  }

  return hatalar;
}

/**
 * Blokta kaç görünür soru zorunlu.
 *
 * Bölüm başlığındaki not bunu yazıyor. Sayı `blokHatalari` ile AYNI alandan
 * (`soru.required`) okunuyor; başka bir bayrağa bakan bir not, doğrulamadan ayrışır —
 * bir kez ayrıştı: arayüz `optional` bakıyordu, doğrulama `required`, ve işaretsiz 98
 * soru zorunlu görünüyordu.
 */
export function zorunluSayisi(cevaplar: Cevaplar, blokId: string): number {
  return blokSorulari(cevaplar, blokId).filter((soru) => soru.required).length;
}

/** Boş bırakılan isteğe bağlı soruları atlanmış olarak işaretler. */
export function atlananlariIsaretle(cevaplar: Cevaplar, blokId: string): Cevaplar {
  const sonuc: Cevaplar = { ...cevaplar };

  for (const soru of blokSorulari(cevaplar, blokId)) {
    if (soru.required) continue;
    const deger = sonuc[soru.id];
    if (deger === undefined || deger === null || deger === '') {
      sonuc[soru.id] = ATLANDI as never;
    }
  }

  return sonuc;
}
