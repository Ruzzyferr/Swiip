import { gorunurSorular, sonrakiSoru, type Cevaplar } from '@swiip/core';

/**
 * Değerlendirmede hangi sorunun ekranda durduğu.
 *
 * Ekranda gösterilen soru bir zamanlar doğrudan `sonrakiSoru(cevaplar)` ile
 * hesaplanıyordu. Kullanıcı bir şık seçer seçmez cevap kümesi değişiyor, `sonrakiSoru`
 * bir sonrakini döndürüyor ve ekran kendiliğinden ilerliyordu.
 *
 * Görünürde çalışıyordu. Ama "Devam et" düğmesi cevabı sunucuya kaydeden TEK yol; ekran
 * ondan önce ilerlediği için düğmeye hiç sıra gelmiyordu. Hiçbir cevap sunucuya
 * yazılmıyor, blok sonu geri bildirimleri hiç görünmüyor, güvenlik kapıları sunucuda hiç
 * değerlendirilmiyordu — ve hiçbiri hata üretmiyordu.
 *
 * Kural basit: gösterilen soru, kullanıcı ilerlemeye karar verene kadar sabit kalır.
 */

/** Ekranda duracak soru. `aktifSoruId` boşsa ya da artık görünmüyorsa sıradakine düşer. */
export function gosterilecekSoru(cevaplar: Cevaplar, aktifSoruId: string | undefined) {
  if (aktifSoruId !== undefined) {
    const sabit = gorunurSorular(cevaplar).find((s) => s.id === aktifSoruId);
    // Cevap dallanmayı değiştirip soruyu görünmez yapmış olabilir; orada kilitlenmeyelim.
    if (sabit) return sabit;
  }

  return sonrakiSoru(cevaplar);
}

/** "Devam et" sonrası ekranda duracak sorunun kimliği. */
export function ilerlenecekSoruId(cevaplar: Cevaplar): string | undefined {
  return sonrakiSoru(cevaplar)?.id;
}
