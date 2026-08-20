import { describe, expect, it } from 'vitest';
import { aramaAnahtari } from './arama';
import { metinleriAl } from './i18n';
import { SORU_BANKASI } from './sorular.uretilmis';

/**
 * Soru metinleri belirsiz olamaz (F2.2).
 *
 * K3 "Boyun" yazıyordu ve `cm` cinsinden bir sayı istiyordu. Türkçede bu kelime hem
 * "boy uzunluğun" hem de "boyun" (ense) demek — ve uygulama F1'de gerçekten **boyun
 * çevresi** soruyor (`boyun_cm`, Navy formülü için).
 *
 * Yani aynı uygulama, aynı kelimeyi, aynı birimle iki farklı vücut ölçüsü için
 * kullanıyordu. Boy yerine boyun çevresi giren kullanıcının BMR'si, TDEE'si, kalori
 * hedefi ve makroları toptan yanlış çıkar. 120 cm alt sınırı çoğu hatayı yakalar ama
 * kullanıcı anlamadığı bir hata mesajı görür.
 *
 * Emülatörde gerçek bir kullanıcı gibi denenirken çıktı: soru "Boyun" diye okunup
 * boyun ölçüsü girildi ve değerlendirme oracıkta durdu.
 */

const OLCU_ETIKETLERI = metinleriAl('tr').degerlendirme.alanEtiketleri;

/** cm cinsinden sayı isteyen sorular. */
const CM_SORULARI = SORU_BANKASI.blocks.flatMap((b) =>
  b.questions.filter((q) => q.type === 'number' && q.unit === 'cm'),
);

describe('soru metni belirsizliği', () => {
  it('cm soran soru var — test boşa dönmüyor', () => {
    expect(CM_SORULARI.length).toBeGreaterThan(0);
  });

  it.each(CM_SORULARI.map((q) => [q.id, q.text]))(
    '%s metni bir çevre ölçüsü etiketiyle çakışmıyor',
    (_id, metin) => {
      const cakisan = Object.entries(OLCU_ETIKETLERI).find(
        ([, etiket]) => aramaAnahtari(etiket) === aramaAnahtari(metin),
      );

      expect(
        cakisan?.[0],
        `Soru metni "${metin}", çevre ölçüsü alanı "${cakisan?.[0]}" ile aynı. ` +
          'Kullanıcı hangi ölçüyü istediğimizi ayırt edemez ve yanlış değer girerse ' +
          'kalori hesabının tamamı kayar.',
      ).toBeUndefined();
    },
  );

  it('boy sorusu boydan söz ediyor', () => {
    const boy = CM_SORULARI.find((q) => (q.min ?? 0) >= 100);

    expect(boy, '120-230 cm aralığında bir boy sorusu bekleniyor').toBeDefined();
    expect(aramaAnahtari(boy!.text)).toContain('boy');
  });
});
