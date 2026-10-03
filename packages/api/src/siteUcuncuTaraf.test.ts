import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Site hiçbir üçüncü taraf sunucudan kaynak YÜKLEMİYOR.
 *
 * Fontlar Google Fonts'tan çekiliyordu: her ziyaret ziyaretçinin IP adresini Google'a
 * gönderiyordu ve gizlilik politikası bunu söylemiyordu. Artık `varliklar/fontlar/`.
 * Bağlantı (`<a href>`) serbest; yüklenen kaynak (stil, betik, font, görsel) değil.
 */
const SITE = join(import.meta.dirname, '..', '..', '..', 'apps', 'site');

function sayfalar(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return sayfalar(yol);
    return /\.(html|css)$/.test(ad) ? [yol] : [];
  });
}

describe('site: üçüncü taraf kaynak yok', () => {
  for (const yol of sayfalar(SITE)) {
    const ad = relative(SITE, yol);
    it(`${ad} dışarıdan kaynak yüklemiyor`, () => {
      const metin = readFileSync(yol, 'utf8');
      expect(metin).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
      expect(metin).not.toMatch(/<(link|script|img)\b[^>]*\b(href|src)="https?:\/\/(?!swiip\.app)/);
      expect(metin).not.toMatch(/url\(\s*['"]?https?:\/\//);
    });
  }

  it('yerel font dosyalarının hepsi var', () => {
    const css = readFileSync(join(SITE, 'varliklar', 'fontlar.css'), 'utf8');
    const dosyalar = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1] ?? '');
    expect(dosyalar.length).toBeGreaterThan(0);
    for (const d of dosyalar) expect(existsSync(join(SITE, 'varliklar', d)), d).toBe(true);
  });
});
