import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * İmajda çalışan npm betiği, imaja kopyalanmayan bir çalışma alanını isteyemez.
 *
 * 2026-08-23'te dağıtım bu yüzden düştü. Kök `typecheck` betiğine mobil uygulamanın
 * tip denetimi eklenmişti (`npm -w @swiip/mobile run typecheck`) — yerelde doğru, çünkü
 * `apps/` orada duruyor. Ama üretim imajı yalnızca `packages/` kopyalıyor: mobil
 * uygulama sunucuda derlenmiyor, gönderilen tarball'da bile yok. `RUN npm run typecheck`
 * konteynerde çalışmayan bir çalışma alanına uzandı ve derleme çöktü.
 *
 * Kusurun sinsiliği: `npm run verify` yerelde tertemiz geçiyor. Yalnızca imaj
 * derlenirken ortaya çıkıyor, yani dağıtım anında.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const kok = resolve(buradan, '../../..');

const dockerfile = readFileSync(resolve(kok, 'infra/api.Dockerfile'), 'utf8');
const kokPaket = JSON.parse(readFileSync(resolve(kok, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

/** `RUN npm run <ad>` ile imaj derlenirken çalışan betikler. */
function imajdaCalisanBetikler(): string[] {
  return [...dockerfile.matchAll(/RUN\s+npm\s+run\s+([\w:-]+)/g)].map((e) => e[1]!);
}

/** `COPY <kaynak> <hedef>` satırlarındaki kaynak yolları. */
function kopyalananYollar(): string[] {
  return [...dockerfile.matchAll(/^COPY\s+(?:--from=\S+\s+)?(.+)$/gm)].flatMap((e) => {
    const parcalar = e[1]!.trim().split(/\s+/);
    return parcalar.slice(0, -1); // son parça hedef
  });
}

/** Çalışma alanı adı → depodaki dizin. */
function calismaAlanlari(): Map<string, string> {
  const harita = new Map<string, string>();
  for (const ust of ['packages', 'apps']) {
    const dizin = resolve(kok, ust);
    if (!existsSync(dizin)) continue;
    for (const ad of readdirSync(dizin)) {
      const paketYolu = resolve(dizin, ad, 'package.json');
      if (!existsSync(paketYolu)) continue;
      const paket = JSON.parse(readFileSync(paketYolu, 'utf8')) as { name?: string };
      if (paket.name) harita.set(paket.name, `${ust}/${ad}`);
    }
  }
  return harita;
}

describe('üretim imajında çalışan betikler', () => {
  it('imaja kopyalanmayan çalışma alanına uzanmamalı', () => {
    const betikler = imajdaCalisanBetikler();
    // Dockerfile hiç betik çalıştırmıyorsa test anlamsızlaşır; bunu sessizce geçme.
    expect(betikler.length).toBeGreaterThan(0);

    const yollar = kopyalananYollar();
    const alanlar = calismaAlanlari();

    for (const betikAdi of betikler) {
      const komut = kokPaket.scripts?.[betikAdi];
      expect(komut, `Dockerfile'da olmayan betik çalıştırılıyor: ${betikAdi}`).toBeTruthy();

      for (const [alanAdi, alanYolu] of alanlar) {
        if (!komut!.includes(alanAdi)) continue;
        const kopyalandi = yollar.some((y) => y === alanYolu || y.startsWith(`${alanYolu}/`));
        expect(
          kopyalandi,
          `"${betikAdi}" betiği ${alanAdi} istiyor ama imaja ${alanYolu} kopyalanmıyor`,
        ).toBe(true);
      }
    }
  });
});
