import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { tr } from './metinler.tr';

/**
 * Sitenin uygulamaya dair verdiği sözler.
 *
 * Gizlilik politikası ve hesap silme sayfası kullanıcıya "Ayarlar → Verimi dışa aktar"
 * gibi yollar tarif ediyor. Bu adlar sözlükten kopyalanıyor, yani kod tarafında bir metin
 * değişince sayfalar sessizce yalan söylemeye başlıyor — ve yasal sayfada yanlış tarif,
 * kullanıcının hakkını kullanamaması demek.
 *
 * Bu test ilk yazıldığında iki uyuşmazlık buldu: sayfa "Verilerimi indir" diyordu,
 * arayüzde "Verimi dışa aktar" yazıyordu; ve silme onayının metin kutusuna cümle
 * yazdırdığı söyleniyordu, gerçekte bir onay penceresi çıkıyordu.
 */

const siteKlasoru = join(import.meta.dirname, '..', '..', '..', 'apps', 'site');

/** Sayfalarda geçen "Ayarlar → ... → Şu düğme" yollarındaki her adım. */
const YOL = /Ayarlar\s*→\s*([^<]+)/g;

/** Sözlükteki ayarlar bölümünün kullanıcıya görünen tüm metinleri. */
const ayarMetinleri = new Set(
  Object.values(tr.ayarlar).filter((d): d is string => typeof d === 'string'),
);

function sayfalar(): [string, string][] {
  return readdirSync(siteKlasoru)
    .filter((ad) => ad.endsWith('.html'))
    .map((ad) => [ad, readFileSync(join(siteKlasoru, ad), 'utf8')]);
}

describe('site, uygulamadaki adları doğru yazıyor', () => {
  it('tarif edilen her ayar yolu sözlükte birebir var', () => {
    const bulunamayan: string[] = [];

    for (const [ad, icerik] of sayfalar()) {
      for (const eslesme of icerik.matchAll(YOL)) {
        for (const adim of (eslesme[1] ?? '').split('→')) {
          const temiz = adim.replace(/<\/?[^>]+>/g, '').trim();
          if (temiz.length === 0) continue;
          if (!ayarMetinleri.has(temiz)) bulunamayan.push(`${ad}: "${temiz}"`);
        }
      }
    }

    expect(bulunamayan).toEqual([]);
  });

  // Sayfalar en az bir yol tarif etmeli; testin "hiç eşleşme yok" diye sessizce yeşil
  // kalması, koruduğunu sandığımız şeyi korumaması demek olurdu.
  it('gerçekten tarif edilen yollar var', () => {
    const sayi = sayfalar().reduce((t, [, icerik]) => t + [...icerik.matchAll(YOL)].length, 0);
    expect(sayi).toBeGreaterThanOrEqual(3);
  });
});
