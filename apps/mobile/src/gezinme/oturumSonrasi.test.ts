import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Oturum açıldıktan sonraki yönlendirme bir kare BEKLİYOR.
 *
 * 2026-10-03'te emülatörde iki kez üretildi: hesap dili İngilizce, cihaz dili Türkçe.
 * Giriş başarılı olunca `kullanici` doluyor, sözlük hesabın diline dönüyor ve `(giris)`
 * yığınının başlık seçenekleri güncelleniyor. Aynı karede `router.replace` o yığını
 * söküyordu; başlık güncellemesi sökülen fragment'a düştü ve yerel katman
 * "ScreenStackFragment added into a non-stack container" ile ÇÖKTÜ. Diller eşleşince
 * çökme yok (aynı akış, aynı hesap).
 */
const APP = join(import.meta.dirname, '..', '..', 'app', '(giris)');

describe('oturum sonrası yönlendirme', () => {
  for (const [dosya, cagri] of [
    ['giris.tsx', 'await girisYap('],
    ['kayit.tsx', 'await kayitOl('],
  ] as const) {
    it(`${dosya}: yönlendirmeden önce yeni dilin karesi işleniyor`, () => {
      const kaynak = readFileSync(join(APP, dosya), 'utf8');
      const oturum = kaynak.indexOf(cagri);
      const bekle = kaynak.indexOf('await sozlukKaresiniBekle()', oturum);
      const git = kaynak.indexOf('router.replace(', oturum);
      expect(oturum).toBeGreaterThan(-1);
      expect(bekle).toBeGreaterThan(oturum);
      expect(git).toBeGreaterThan(bekle);
    });
  }
});
