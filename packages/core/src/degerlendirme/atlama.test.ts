import { describe, expect, it } from 'vitest';
import { ATLANDI, dizi, metin, sayi } from '../cevaplar';
import { cevabiDogrula, gorunurSorular, sonrakiSoru } from './motor';
import type { Cevaplar } from '../cevaplar';

/**
 * "Bu soruyu atla" (F2.2).
 *
 * Atlama, istemcide `'__atlandi__'` diye bir işaretle yapılıyordu ve bu işareti
 * **yalnızca istemci biliyordu.** Sunucu onu listede olmayan bir seçenek sayıp cevabı
 * reddediyordu: bir soruyu atlayan kullanıcının değerlendirmesi o andan itibaren hiç
 * kaydedilmiyordu.
 *
 * Hata görünmüyordu çünkü istemci her hatayı "bağlantı yok" diye gösteriyordu — iki
 * kusur birbirini örtüyordu. Emülatörde gerçek bir kullanıcı gibi kullanınca ikisi de
 * ortaya çıktı.
 *
 * Atlama artık motorun bildiği bir kavram:
 *  - İsteğe bağlı soruda geçerli; soru bir daha sorulmaz.
 *  - Zorunlu soruda geçersiz; atlanamayan bir soru atlanmış sayılamaz.
 *  - Veri okuyan hiçbir yer işareti görmez: atlanmış cevap, cevapsızdır.
 */

const isteğeBagli = () => gorunurSorular({}).find((s) => !s.required)!;
const zorunlu = () => gorunurSorular({}).find((s) => s.required)!;

describe('atlama işareti', () => {
  it('isteğe bağlı soruda geçerli', () => {
    expect(cevabiDogrula(isteğeBagli(), ATLANDI as never).gecerli).toBe(true);
  });

  it('zorunlu soruda geçersiz — atlanamayan soru atlanmış sayılamaz', () => {
    expect(cevabiDogrula(zorunlu(), ATLANDI as never).gecerli).toBe(false);
  });

  it('atlanan soru bir daha sorulmaz', () => {
    const soru = isteğeBagli();
    const cevaplar: Cevaplar = {};
    for (const s of gorunurSorular({})) {
      if (s.id === soru.id) break;
      cevaplar[s.id] = ornek(s);
    }
    expect(sonrakiSoru(cevaplar)?.id).toBe(soru.id);

    cevaplar[soru.id] = ATLANDI;
    expect(sonrakiSoru(cevaplar)?.id).not.toBe(soru.id);
  });
});

describe('atlanan cevap veri katmanında görünmez', () => {
  it('metin() atlanan cevabı vermez', () => {
    expect(metin({ X: ATLANDI }, 'X')).toBeUndefined();
  });

  it('dizi() atlanan cevabı boş verir', () => {
    expect(dizi({ X: ATLANDI }, 'X')).toEqual([]);
  });

  it('sayi() atlanan cevabı vermez', () => {
    expect(sayi({ X: ATLANDI }, 'X')).toBeUndefined();
  });

  it('normal cevaplar etkilenmiyor', () => {
    expect(metin({ X: 'Evet' }, 'X')).toBe('Evet');
    expect(dizi({ X: ['a'] }, 'X')).toEqual(['a']);
    expect(sayi({ X: 42 }, 'X')).toBe(42);
  });
});

function ornek(soru: { type: string; options?: string[]; regions?: string[]; min?: number }) {
  if (soru.options?.length) return soru.options[0]!;
  if (soru.regions?.length) return [soru.regions[0]!];
  if (soru.type === 'number' || soru.type === 'scale') return soru.min ?? 1;
  if (soru.type === 'date') return '1990-05-10';
  if (soru.type === 'consent') return true;
  if (soru.type === 'multi') return ['x'];
  return 'x';
}
