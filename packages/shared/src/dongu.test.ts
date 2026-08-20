import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Modüller arasında döngüsel import yok.
 *
 * Sözlükler tarih ve para biçimini kullanıyor, biçimlendiriciler de dilin BCP47
 * karşılığını. İkisi de `i18n.ts` içindeyken zincir kapanmıştı:
 *
 *     i18n → metinler.tr → tarih → i18n
 *
 * Metro bunu uyarıyla geçiyor ve modüllerden birini **yarı yüklenmiş** veriyor: `BCP47`
 * biçimlendirici çalışırken `undefined` olabiliyor. Ne derleme ne test yakalar; yalnızca
 * çalışma zamanında, bazen.
 *
 * Emülatörde Metro logunda görüldü. Dil kimlikleri hiçbir şeye bağımlı olmayan
 * `diller.ts` içine alınarak zincir kırıldı.
 *
 * Tip-yalnızca importlar sayılmıyor: derlemede silindikleri için çalışma zamanı döngüsü
 * üretmezler.
 */

const KAYNAK = import.meta.dirname;

function moduller(): Map<string, string[]> {
  const harita = new Map<string, string[]>();

  for (const ad of readdirSync(KAYNAK)) {
    if (!ad.endsWith('.ts') || ad.endsWith('.test.ts')) continue;
    const kaynak = readFileSync(join(KAYNAK, ad), 'utf8');

    const bagimliliklar = [
      ...kaynak.matchAll(/^import\s+(type\s+)?([^;]*?)from\s+'\.\/([\w.]+)'/gm),
    ]
      .filter((e) => {
        // `import type { X }` ve `import { type X }` derlemede silinir.
        const tipYalnizca = Boolean(e[1]) || /^\{\s*(type\s+\w+\s*,?\s*)+\}$/.test(e[2]!.trim());
        return !tipYalnizca;
      })
      .map((e) => e[3]!);

    harita.set(ad.replace(/\.ts$/, ''), bagimliliklar);
  }

  return harita;
}

/** Döngüye giren ilk zinciri döndürür; yoksa null. */
function donguBul(harita: Map<string, string[]>): string[] | null {
  const gri = new Set<string>();
  const siyah = new Set<string>();

  function gez(dugum: string, yol: string[]): string[] | null {
    if (gri.has(dugum)) return [...yol, dugum];
    if (siyah.has(dugum)) return null;

    gri.add(dugum);
    for (const komsu of harita.get(dugum) ?? []) {
      const sonuc = gez(komsu, [...yol, dugum]);
      if (sonuc) return sonuc;
    }
    gri.delete(dugum);
    siyah.add(dugum);
    return null;
  }

  for (const dugum of harita.keys()) {
    const sonuc = gez(dugum, []);
    if (sonuc) return sonuc;
  }
  return null;
}

describe('paylaşılan modüller', () => {
  it('taranacak modül var — test boşa dönmüyor', () => {
    expect(moduller().size).toBeGreaterThan(8);
  });

  it('döngüsel import yok', () => {
    const dongu = donguBul(moduller());

    expect(dongu, dongu ? `Döngü: ${dongu.join(' → ')}` : '').toBeNull();
  });
});
