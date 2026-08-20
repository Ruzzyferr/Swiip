import { describe, expect, it } from 'vitest';
import { tr } from './metinler.tr';
import { en } from './metinler.en';
import { aramaAnahtari } from './arama';

/**
 * Gezinme başlığı ile sayfa başlığı aynı olamaz (F1.6).
 *
 * Ekranların gezinme başlığı artık klasör düzeninde tanımlı ve gövdede bir de `baslik`
 * gösteriliyor. İkisi aynı metinse kullanıcı aynı cümleyi üst üste iki kez görüyor:
 *
 *     Hedefin gerçekçi mi     ← gezinme çubuğu
 *     Hedefin gerçekçi mi?    ← sayfa başlığı
 *
 * Emülatör ekran görüntülerinde göründü; metin okuyarak fark edilmiyordu çünkü ikisi de
 * doğru metinler — sorun ikisinin bir arada olması.
 *
 * Karşılaştırma noktalama ve şapka farkını yok sayıyor: "Hedefin gerçekçi mi" ile
 * "Hedefin gerçekçi mi?" kullanıcı için aynı cümle.
 */

/** Gezinme başlığı olarak kullanılan anahtarlar. */
const GEZINME_ANAHTARLARI = [
  'sayfaBasligi',
  'edSayfaBasligi',
  'dogrulaSayfaBasligi',
  'gizlilikSayfaBasligi',
  'kararSayfaBasligi',
  'planlarBasligi',
];

const sadeles = (metin: string) => aramaAnahtari(metin.replace(/[?!.:]+$/u, '').trim());

interface Cakisma {
  blok: string;
  gezinme: string;
  sayfa: string;
}

function cakismalar(sozluk: Record<string, unknown>, onEk = ''): Cakisma[] {
  const sonuc: Cakisma[] = [];

  for (const [ad, deger] of Object.entries(sozluk)) {
    if (!deger || typeof deger !== 'object' || Array.isArray(deger)) continue;
    const blok = deger as Record<string, unknown>;
    const yol = onEk ? `${onEk}.${ad}` : ad;

    const sayfa = blok.baslik;
    if (typeof sayfa === 'string') {
      for (const anahtar of GEZINME_ANAHTARLARI) {
        const gezinme = blok[anahtar];
        if (typeof gezinme === 'string' && sadeles(gezinme) === sadeles(sayfa)) {
          sonuc.push({ blok: yol, gezinme, sayfa });
        }
      }
    }

    sonuc.push(...cakismalar(blok, yol));
  }

  return sonuc;
}

describe('başlık tekrarı', () => {
  it('Türkçe sözlükte gezinme ve sayfa başlığı çakışmıyor', () => {
    const bulunan = cakismalar(tr as unknown as Record<string, unknown>);

    expect(
      bulunan.map((c) => `${c.blok}: "${c.gezinme}" / "${c.sayfa}"`),
      'Gezinme çubuğu ve sayfa başlığı aynı cümleyi gösteriyor.',
    ).toEqual([]);
  });

  it('İngilizce sözlükte de çakışmıyor', () => {
    const bulunan = cakismalar(en as unknown as Record<string, unknown>);

    expect(bulunan.map((c) => `${c.blok}: "${c.gezinme}" / "${c.sayfa}"`)).toEqual([]);
  });
});
