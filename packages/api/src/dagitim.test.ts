import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Üretim imajının açılabilirliği.
 *
 * 2026-08-21'de ilk gerçek dağıtımda API konteyneri yeniden başlama döngüsüne girdi:
 * `Cannot find package 'tsx'`. Sebep, imajın iki yarısının birbiriyle çelişmesiydi —
 * çalıştırma katmanı `npm ci --omit=dev` ile kuruyor, ama başlatma komutu
 * `node --import tsx` diyor ve `tsx` devDependencies'te duruyordu.
 *
 * Bu, tip denetiminden de testlerden de geçen bir kusur: her ikisi de imajın içine
 * bakmıyor. Yalnızca konteyner çalıştırıldığında ortaya çıkıyor.
 *
 * Test, Dockerfile'ın kendisini okuyup çalışma anında çözülecek paketleri çıkarıyor
 * ve her birinin `dependencies` altında olmasını şart koşuyor.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const kok = resolve(buradan, '../../..');

const dockerfile = readFileSync(resolve(kok, 'infra/api.Dockerfile'), 'utf8');
const paketJson = JSON.parse(readFileSync(resolve(kok, 'packages/api/package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** Çalıştırma katmanı geliştirme bağımlılıklarını atıyor mu? */
function gelistirmeBagimliliklariAtiliyor(): boolean {
  return /npm ci[^\n]*--omit=dev/.test(dockerfile);
}

/**
 * Başlatma komutunda `--import <paket>` / `--loader <paket>` ile çözülen paketler.
 *
 * Yol (`./` veya `/` ile başlayan) olanlar elenir; onlar dosya, paket değil.
 */
function calismaAnindaCozulenPaketler(): string[] {
  const cmd = /CMD\s+\[([^\]]+)\]/.exec(dockerfile);
  const icerik = cmd?.[1];
  if (!icerik) return [];
  const parcalar = icerik.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
  const paketler: string[] = [];
  for (let i = 0; i < parcalar.length - 1; i++) {
    if (parcalar[i] === '--import' || parcalar[i] === '--loader' || parcalar[i] === '--require') {
      const sonraki = parcalar[i + 1];
      if (sonraki && !sonraki.startsWith('.') && !sonraki.startsWith('/')) paketler.push(sonraki);
    }
  }
  return paketler;
}

describe('üretim imajı', () => {
  it('başlatma komutunda çözülen her paket dependencies altında olmalı', () => {
    const paketler = calismaAnindaCozulenPaketler();

    // Komut hiç paket çözmüyorsa test anlamsızlaşır; bunu sessizce geçme.
    expect(paketler.length).toBeGreaterThan(0);

    for (const ad of paketler) {
      const uretimde = Boolean(paketJson.dependencies?.[ad]);
      const yalnizGelistirmede = Boolean(paketJson.devDependencies?.[ad]);

      expect(
        uretimde,
        `"${ad}" başlatma komutunda kullanılıyor ama packages/api/package.json ` +
          `dependencies altında değil${yalnizGelistirmede ? ' (devDependencies altında)' : ''}. ` +
          `Çalıştırma katmanı --omit=dev ile kurduğu için konteyner açılmaz.`,
      ).toBe(true);
    }
  });

  it('çalıştırma katmanı geliştirme bağımlılıklarını gerçekten atıyor', () => {
    // Üstteki testin gerekçesi buna dayanıyor. Dockerfile bir gün --omit=dev'i
    // bırakırsa kural gevşeyebilir; o zaman bu test kırmızıya düşüp haber versin.
    expect(gelistirmeBagimliliklariAtiliyor()).toBe(true);
  });
});
