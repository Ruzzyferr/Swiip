import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from './sorular.uretilmis';
import { tr } from './metinler.tr';
import { en } from './metinler.en';

/**
 * Kart sonu başlığı her kart için VAR ve doğru kartı anlatıyor.
 *
 * `CLAUDE.md` blok sonu geri bildirimini "terke karşı en güçlü kozumuz" diye
 * tanımlıyor. Buna rağmen başlık haritası soru bankasından ayrışmıştı: değerlendirme
 * sekiz karta indirilirken blok kimlikleri değişti (`S`→`G`, `A` artık "Ağrı ve
 * kısıt", `Y`/`T`/`F` kalktı) ama harita eski kimliklerde kaldı.
 *
 * Emülatörde ölçülen sonuç:
 *  - "Güvenlik" ve "Mutfak" kartları haritada hiç yoktu, genel yedeğe düşüyordu
 *    ("Bu bölüm tamam") — sekiz kartın ikisi kozunu harcıyordu.
 *  - "Ağrı ve kısıt" kartı "Antrenman geçmişin çıkarıldı" diyordu; o kart artık
 *    antrenman geçmişi sormuyor.
 *  - Haritada karşılığı olmayan dört anahtar (`S`, `Y`, `T`, `F`) ölü duruyordu.
 *
 * Bu test haritayı bankaya bağlar: yeni bir kart eklendiğinde ya da bir kart
 * kaldırıldığında başlık haritasını güncellemek artık isteğe bağlı değil.
 */

const BLOK_IDLERI = SORU_BANKASI.blocks.map((b) => b.id);

describe.each([
  ['tr', tr.degerlendirme.blokSonu.basliklar as Record<string, string>],
  ['en', en.degerlendirme.blokSonu.basliklar as Record<string, string>],
])('%s — kart sonu başlıkları', (_dil, basliklar) => {
  const anahtarlar = Object.keys(basliklar);

  it('her blok için bir başlık var', () => {
    for (const id of BLOK_IDLERI) {
      expect(
        anahtarlar,
        `"${id}" bloğunun kart sonu başlığı yok; genel yedeğe ("Bu bölüm tamam") düşer.`,
      ).toContain(id);
    }
  });

  it('karşılığı olmayan başlık yok', () => {
    for (const anahtar of anahtarlar) {
      expect(
        BLOK_IDLERI,
        `"${anahtar}" başlığı hiçbir bloğa ait değil — bankadan çıkmış bir kimlik.`,
      ).toContain(anahtar);
    }
  });

  it('başlıklar birbirinden farklı', () => {
    expect(new Set(Object.values(basliklar)).size).toBe(anahtarlar.length);
  });

  it('hiçbir başlık boş değil', () => {
    for (const [anahtar, metin] of Object.entries(basliklar)) {
      expect(metin.trim().length, `${anahtar} boş`).toBeGreaterThan(0);
    }
  });
});
