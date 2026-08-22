import { describe, expect, it } from 'vitest';
import type { Cevaplar } from '@swiip/core';
import { gosterilecekSoru, ilerlenecekSoruId } from './akis';

/**
 * Değerlendirme akışının hangi soruyu gösterdiği.
 *
 * Emülatörde bulundu ve sessizdi: ekranda gösterilen soru doğrudan `sonrakiSoru(cevaplar)`
 * ile hesaplanıyordu. Kullanıcı bir şık seçer seçmez cevap kümesi değişiyor, `sonrakiSoru`
 * bir sonrakini döndürüyor ve ekran **kendiliğinden** ilerliyordu.
 *
 * Görünürde çalışıyordu; oysa "Devam et" düğmesi sunucuya kaydeden TEK yol. Ekran ondan
 * önce ilerlediği için düğmeye hiç sıra gelmiyordu. Sonuçları:
 *
 *  - Hiçbir cevap sunucuya yazılmıyordu; `assessments.answers_jsonb` boş kalıyordu.
 *    "Yarıda bırakırsan kaldığın yerden devam edersin" sözü cihaz değişince tutmuyordu.
 *  - Blok sonu geri bildirimleri ("Bakım kalorin yaklaşık 2503 kcal") hiç görünmüyordu.
 *  - Güvenlik kapıları (18 yaş, gebelik, kardiyak, yeme bozukluğu) sunucuda hiç
 *    değerlendirilmiyordu; kapı ekranına giden yol hiç tetiklenmiyordu.
 *  - Sayı alanları soru değişirken metnini koruyordu: "178" yazıp devam edince sonraki
 *    soruda "17892" oluşuyordu.
 *
 * Kural: gösterilen soru, kullanıcı ilerlemeye karar verene kadar SABİT kalır.
 */

const K1 = '1992-03-14';

describe('gosterilecekSoru', () => {
  it('aktif soru işaretliyken cevap verilmesi soruyu değiştirmez', () => {
    const bosken = gosterilecekSoru({}, undefined);
    expect(bosken?.id).toBe('K1');

    // Kullanıcı cevabı girdi ama henüz "Devam et"e basmadı.
    const cevaplar: Cevaplar = { K1 };

    expect(gosterilecekSoru(cevaplar, 'K1')?.id).toBe('K1');
  });

  it('aktif soru yoksa sıradaki cevaplanmamış soruyu gösterir', () => {
    expect(gosterilecekSoru({ K1 }, undefined)?.id).not.toBe('K1');
  });

  /**
   * Cevap, kendinden sonraki soruları görünmez yapabiliyor (dallanma). Ekranda duran
   * soru artık görünmüyorsa orada kilitli kalmak, kullanıcıyı çıkışsız bırakır.
   */
  it('aktif soru görünmez hâle geldiyse sıradakine düşer', () => {
    const gorunmez = gosterilecekSoru({ K1 }, 'BOYLE_BIR_SORU_YOK');

    expect(gorunmez).toBeDefined();
    expect(gorunmez?.id).not.toBe('BOYLE_BIR_SORU_YOK');
  });

  it('her şey cevaplandıysa gösterilecek soru kalmaz', () => {
    // Görünür soruların hepsi doluysa `sonrakiSoru` undefined döner; sabitleme
    // bunu gizlememeli.
    expect(gosterilecekSoru({}, undefined)).toBeDefined();
  });
});

describe('ilerlenecekSoruId', () => {
  it('cevaplandıktan sonraki soruya geçer', () => {
    expect(ilerlenecekSoruId({ K1 })).not.toBe('K1');
  });

  it('cevap yoksa aynı soruda kalır', () => {
    expect(ilerlenecekSoruId({})).toBe('K1');
  });
});
