import { describe, expect, it } from 'vitest';
import { blokGeriBildirimi } from './geriBildirim';
import type { Cevaplar } from '../cevaplar';

/**
 * "Tahminler aralık olarak sunulur, tek sayı olarak asla."
 *
 * Bu, ürünün kilitli sağlık kurallarından biri. Vücut yağı tarafında uygulanmıştı
 * (`vucut.ts` · `yagOraniAralik`), bakım kalorisinde uygulanmamıştı: değerlendirmenin
 * ilk kartının sonunda kullanıcı `Bakım kalorin yaklaşık 1975 kcal` görüyordu.
 *
 * "Yaklaşık" kelimesi vardı ama gösterilen şey yuvarlanmamış dört haneli tek bir
 * sayıydı — Mifflin-St Jeor'un ~%10 standart hatası ve aktivite çarpanının kendi
 * belirsizliği üstüne, olduğundan çok daha kesin okunuyordu.
 *
 * Pratik bedeli de var: kullanıcı sonraki kartta 1990 görürse tek sayı "tutarsızlık"
 * gibi okunur. Rakip analizindeki en çok beğenilen negatif yorum tam olarak buydu
 * ("aynı şeyi eklediğimde yine farklı makrolar çıkarıyor").
 */

const TEMEL: Cevaplar = {
  K1: '1992-06-10',
  K2: 'Kadın',
  K3: 164,
  K4: 78,
  K7: 'Evet',
  Y4: 'Masa başı, çoğunlukla oturarak',
};

function bakim(cevaplar: Cevaplar = TEMEL) {
  const geri = blokGeriBildirimi('K', cevaplar);
  if (!geri) throw new Error('K bloğu geri bildirimi üretmedi');
  return geri;
}

describe('bakım kalorisi tahmini', () => {
  it('aralık olarak üretiliyor', () => {
    const geri = bakim();
    expect(geri.anahtar).toBe('bakimKalorisi');

    const d = geri.degerler as { alt: number; ust: number };
    expect(d.alt, 'alt sınır yok').toBeTypeOf('number');
    expect(d.ust, 'üst sınır yok').toBeTypeOf('number');
    expect(d.ust).toBeGreaterThan(d.alt);
  });

  it('metinde tek sayı değil, aralık yazıyor', () => {
    const metin = bakim().metin;
    expect(metin, `aralık görünmüyor: ${metin}`).toMatch(/\d+\s*[-–]\s*\d+\s*kcal/);
  });

  it('aralık sahte kesinlik taşımıyor — 25 kcal adımına yuvarlı', () => {
    const d = bakim().degerler as { alt: number; ust: number };
    expect(d.alt % 25, `alt sınır yuvarlanmamış: ${d.alt}`).toBe(0);
    expect(d.ust % 25, `üst sınır yuvarlanmamış: ${d.ust}`).toBe(0);
  });

  it('aralık ne saçma dar ne saçma geniş', () => {
    const d = bakim().degerler as { alt: number; ust: number; tdee: number };
    const genislik = (d.ust - d.alt) / d.tdee;
    expect(genislik, 'aralık çok dar — tek sayıdan farkı kalmıyor').toBeGreaterThan(0.08);
    expect(genislik, 'aralık çok geniş — bilgi taşımıyor').toBeLessThan(0.3);
  });

  it('merkez, tahminin kendisini kapsıyor', () => {
    const d = bakim().degerler as { alt: number; ust: number; tdee: number };
    expect(d.tdee).toBeGreaterThanOrEqual(d.alt);
    expect(d.tdee).toBeLessThanOrEqual(d.ust);
  });

  it('farklı kullanıcılarda farklı aralık çıkıyor — sabit metin değil', () => {
    const a = bakim().degerler as { alt: number };
    const b = bakim({ ...TEMEL, K2: 'Erkek', K3: 185, K4: 95 }).degerler as { alt: number };
    expect(b.alt).toBeGreaterThan(a.alt);
  });

  it('ED modunda sayı hiç görünmüyor', () => {
    // ED modu cevaplardan türüyor (S18); ayrı bir parametre değil.
    const geri = blokGeriBildirimi('K', { ...TEMEL, S18: 'Evet' });
    expect(geri?.anahtar).toBe('kimlikEd');
    expect(geri?.metin ?? '', 'ED modunda kalori sızdı').not.toMatch(/\d{3,}/);
  });
});

/**
 * Dağıtım sırası tehlikesi.
 *
 * Sunucu ile mağazadaki sürüm her zaman aynı anda güncellenmiyor. Yeni istemci eski
 * sunucuya bağlandığında `degerler` yalnızca `tdee` taşır; metin bunu karşılamazsa
 * kullanıcı "Bakım kalorin yaklaşık undefined-undefined kcal" görür.
 *
 * Sıraya bağımlı bir metin, sıra bir kez şaşınca sessizce bozulur.
 */
describe('eski sunucuya karşı dayanıklılık', () => {
  it('aralık gelmezse tek sayıya düşer, "undefined" yazmaz', async () => {
    const { tr, en } = await import('@swiip/shared');

    for (const sozluk of [tr.blokGeriBildirimi, en.blokGeriBildirimi]) {
      const metin = sozluk.bakimKalorisi({ tdee: 1975 });
      expect(metin).toContain('1975');
      expect(metin, `undefined sızdı: ${metin}`).not.toContain('undefined');
    }
  });

  it('aralık geldiğinde aralığı yazar', async () => {
    const { tr } = await import('@swiip/shared');
    const metin = tr.blokGeriBildirimi.bakimKalorisi({ alt: 1825, ust: 2125, tdee: 1975 });
    expect(metin).toContain('1825-2125');
  });
});
