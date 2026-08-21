import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tr } from '@swiip/shared';

/**
 * Sekme başlığı sayfada tekrarlanmıyor (F1.6).
 *
 * Gezinme çubuğu zaten "Koç" yazıyordu ve ekran hemen altına yine "Koç" basıyordu.
 * Üç sekmede aynı durum vardı. Emülatör ekran görüntüsünde göründü; metin okumakla
 * fark edilmiyordu çünkü ikisi de doğru metinler — sorun ikisinin bir arada olması.
 *
 * Kural: sekmenin kendi bloğundaki `baslik`, sekme çubuğundaki etiketle aynıysa ekranda
 * gösterilmez.
 */

const SEKME = join(import.meta.dirname, '..', '..', 'app', '(sekme)');

/** Sekme adı → o sekmenin sözlük bloğu. */
const BLOKLAR = {
  program: tr.program,
  beslenme: tr.beslenme,
  koc: tr.koc,
  ilerleme: tr.ilerleme,
  ayarlar: tr.ayarlar,
} as const;

const CAKISANLAR = (Object.keys(BLOKLAR) as (keyof typeof BLOKLAR)[]).filter((ad) => {
  const blok = BLOKLAR[ad] as { baslik?: string };
  return blok.baslik !== undefined && blok.baslik === tr.sekmeler[ad];
});

describe('sekme başlığı tekrarı', () => {
  it('en az bir sekme bloğu okunuyor — test boşa dönmüyor', () => {
    expect(Object.keys(BLOKLAR)).toHaveLength(5);
  });

  it.each(CAKISANLAR.length > 0 ? CAKISANLAR : ['cakisan-yok'])(
    '%s ekranı sekme etiketiyle aynı başlığı basmıyor',
    (ad) => {
      if (ad === 'cakisan-yok') return;

      const kaynak = readFileSync(join(SEKME, `${ad}.tsx`), 'utf8');
      const basiyor = /<Yazi tur="baslik[12]">\{[a-zA-Z]+\.baslik\}<\/Yazi>/.test(kaynak);

      expect(
        basiyor,
        `${ad} ekranı kendi bloğundaki "baslik"i gösteriyor ama aynı metin sekme ` +
          'çubuğunda da yazıyor: kullanıcı aynı kelimeyi üst üste iki kez görüyor.',
      ).toBe(false);
    },
  );
});
