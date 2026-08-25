import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { paraParcalari } from './para';

/**
 * `₺` işareti sayısal fontta YOK.
 *
 * Ölçüldü: `JetBrainsMono_500Medium.ttf` cmap tablosunda 976 kod noktası var ve
 * U+20BA bunlardan biri değil; `Inter` içinde var. Eksik glif sessizce sistem
 * yedeğine düşüyor — paywall'da ₺ serif bir harf gibi, farklı kalınlıkta ve rakama
 * yapışık çıkıyor, "₺99" yerine "Ł99" okunuyordu.
 *
 * Türkiye önce bir üründe ödeme ekranının en büyük puntosu bu.
 *
 * Aşağıdaki font testi belirteci de koruyor: biri sayısal fontu ₺ İÇEREN bir kesime
 * çevirirse test düşer ve `Para` bileşeninin artık gerekmediği anlaşılır. Tersi de
 * geçerli — başka bir monospace'e geçilirse aynı kontrol yeniden sorulmuş olur.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const KOK = resolve(buradan, '../../../..');

/** TrueType `cmap` tablosundaki kod noktalarını okur (format 4 ve 12). */
function kodNoktalari(yol: string): Set<number> {
  const d = readFileSync(yol);
  const tabloSayisi = d.readUInt16BE(4);

  let cmap: number | undefined;
  for (let i = 0; i < tabloSayisi; i++) {
    const o = 12 + i * 16;
    if (d.toString('ascii', o, o + 4) === 'cmap') cmap = d.readUInt32BE(o + 8);
  }
  if (cmap === undefined) throw new Error(`cmap yok: ${yol}`);

  const kodlar = new Set<number>();
  const altTablo = d.readUInt16BE(cmap + 2);

  for (let i = 0; i < altTablo; i++) {
    const o = cmap + 4 + i * 8;
    const alt = cmap + d.readUInt32BE(o + 4);
    const bicim = d.readUInt16BE(alt);

    if (bicim === 4) {
      const segX2 = d.readUInt16BE(alt + 6);
      const seg = segX2 / 2;
      for (let j = 0; j < seg; j++) {
        const son = d.readUInt16BE(alt + 14 + j * 2);
        const bas = d.readUInt16BE(alt + 16 + segX2 + j * 2);
        if (son === 0xffff) continue;
        for (let c = bas; c <= son; c++) kodlar.add(c);
      }
    } else if (bicim === 12) {
      const grup = d.readUInt32BE(alt + 12);
      for (let j = 0; j < grup; j++) {
        const g = alt + 16 + j * 12;
        const bas = d.readUInt32BE(g);
        const son = d.readUInt32BE(g + 4);
        for (let c = bas; c <= Math.min(son, bas + 2000); c++) kodlar.add(c);
      }
    }
  }
  return kodlar;
}

const TL = 0x20ba;

describe('yazı tipi glif kapsamı', () => {
  it('sayısal font ₺ İÇERMİYOR — `Para` bileşeni bu yüzden var', () => {
    const mono = kodNoktalari(
      resolve(
        KOK,
        'node_modules/@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf',
      ),
    );
    expect(mono.has(TL), 'artık içeriyorsa `Para` gereksiz olabilir — yeniden değerlendir').toBe(
      false,
    );
  });

  it('arayüz fontu ₺ içeriyor — sembol oraya basılıyor', () => {
    const inter = kodNoktalari(
      resolve(KOK, 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    );
    expect(inter.has(TL)).toBe(true);
  });
});

describe('paraParcalari', () => {
  it('sembol başta: ₺ ayrı parça, rakamlar sayısal', () => {
    expect(paraParcalari('₺99')).toEqual([
      { metin: '₺', sayisal: false },
      { metin: '99', sayisal: true },
    ]);
  });

  it('binlik ayracı sayısal parçada kalıyor', () => {
    expect(paraParcalari('₺1.190')).toEqual([
      { metin: '₺', sayisal: false },
      { metin: '1.190', sayisal: true },
    ]);
  });

  /** `Intl` İngilizcede "TRY 1,190" yazıyor — sembol başta ama harf. */
  it('harfli para birimi de sembol sayılıyor', () => {
    expect(paraParcalari('TRY 1,190')).toEqual([
      { metin: 'TRY', sayisal: false },
      { metin: ' 1,190', sayisal: true },
    ]);
  });

  /** Bazı diller birimi sona koyuyor: "99,00 TL". */
  it('sembol sonda olabilir', () => {
    expect(paraParcalari('99 TL')).toEqual([
      { metin: '99 ', sayisal: true },
      { metin: 'TL', sayisal: false },
    ]);
  });

  it('boş dize çökmüyor', () => {
    expect(paraParcalari('')).toEqual([{ metin: '', sayisal: false }]);
  });
});
