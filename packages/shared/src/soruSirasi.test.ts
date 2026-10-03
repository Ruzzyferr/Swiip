import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from './sorular.uretilmis';

/**
 * Aynı karttaki Evet/Hayır soruları seçenekleri AYNI sırada gösteriyor.
 *
 * 2026-10-03'te emülatörde görüldü: Güvenlik kartında ilk soru (18 yaş) "Evet / Hayır",
 * hemen ardından gelen kardiyak sorular "Hayır / Evet" sırasındaydı. Arka arkaya gelen
 * sorularda aynı konuma dokunan kullanıcı bir sonraki soruda TERS cevabı veriyor — ve
 * burada yanlış bir "Evet", program üretimini kapatan kardiyak kapıyı açıyor
 * (CLAUDE.md, 7. kusur: yanlış dokunulmuş tek bir soru kalıcı kilit demekti).
 */
describe('Evet/Hayır sırası kart içinde tutarlı', () => {
  it.each(SORU_BANKASI.blocks.map((b) => [b.id, b]))('%s kartı', (_id, blok) => {
    const siralar = blok.questions
      .filter((q) => q.options?.includes('Evet') && q.options.includes('Hayır'))
      .map((q) => ({
        id: q.id,
        hayirOnce: q.options!.indexOf('Hayır') < q.options!.indexOf('Evet'),
      }));
    const farkli = siralar.filter((s) => s.hayirOnce !== siralar[0]?.hayirOnce);
    expect(
      farkli.map((s) => s.id),
      'Bu karttaki Evet/Hayır soruları farklı sırada. Kullanıcı aynı konuma dokunur.',
    ).toEqual([]);
  });
});

/**
 * Zorunlu sorular kartın BAŞINDA.
 *
 * "İsteğe bağlı soruları sonra cevaplayacağım" bağlantısı kartın ilk isteğe bağlı
 * sorusunun üstünde duruyor. Hedef kartında altında hâlâ zorunlu bir soru vardı
 * ("Ayda kaç kilo…"); bağlantıya basan kullanıcı "1 zorunlu soru eksik" hatasıyla
 * karşılaşıyordu — atla dediğimiz yerde atlatmıyorduk. Takvim kartında da aynısı.
 */
describe('zorunlu sorular isteğe bağlılardan önce', () => {
  it.each(SORU_BANKASI.blocks.map((b) => [b.id, b]))('%s kartı', (_id, blok) => {
    const ilkIstegeBagli = blok.questions.findIndex((q) => !q.required);
    const sonraGelenZorunlu =
      ilkIstegeBagli === -1
        ? []
        : blok.questions
            .slice(ilkIstegeBagli)
            .filter((q) => q.required)
            .map((q) => q.id);
    expect(sonraGelenZorunlu).toEqual([]);
  });
});
