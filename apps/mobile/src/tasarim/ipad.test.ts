import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * iPad desteği ve yön beyanı.
 *
 * Uzun süre `supportsTablet: false` idi. Bu, uygulamayı iPad'den GİZLEMİYOR —
 * iPad onu iPhone uyumluluk penceresinde çalıştırıyor ve Apple incelemeyi orada
 * yapıyor (dört turun dördünde de inceleme cihazı iPad'di). 2026-08-28'de
 * Guideline 4 reddi tam o pencereden geldi.
 *
 * Artık iPad **gerçekten** destekleniyor: tam tuval, okuma sütunu, dört yön.
 *
 * Yön neden dört: iPad çoklu görev (Split View / Slide Over) uygulamanın her
 * yöne dönebilmesini şart koşuyor. Yalnız dikey bırakılan bir iPad uygulaması
 * hem doğrulamada uyarı alıyor hem de incelemede "iPad kullanıcısı için
 * beklendiği gibi çalışmıyor" sayılıyor. iPhone dikey kalıyor: orada dönmek bir
 * ürün kararı, `UISupportedInterfaceOrientations~ipad` yalnızca iPad'i ayırıyor.
 */

const YAPILANDIRMA = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'app.json'), 'utf8'),
) as {
  expo: {
    orientation: string;
    ios: { supportsTablet: boolean; infoPlist: Record<string, unknown> };
  };
};

const IOS = YAPILANDIRMA.expo.ios;
const IPAD_YONLERI = IOS.infoPlist['UISupportedInterfaceOrientations~ipad'] as string[] | undefined;

describe('iPad desteği', () => {
  it('açık', () => {
    expect(
      IOS.supportsTablet,
      'Kapatmak uygulamayı iPad’den gizlemiyor, yalnızca uyumluluk penceresine ' +
        'düşürüyor. Apple incelemeyi iPad’de yapıyor.',
    ).toBe(true);
  });

  it('iPad dört yönü de destekliyor', () => {
    expect(IPAD_YONLERI, 'iPad yön listesi yok').toBeDefined();
    for (const yon of [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ]) {
      expect(IPAD_YONLERI, `${yon} eksik — çoklu görev dört yönü şart koşuyor`).toContain(yon);
    }
  });

  it('iPhone dikey kalıyor', () => {
    expect(YAPILANDIRMA.expo.orientation).toBe('portrait');
  });

  /**
   * `UIRequiresFullScreen` çoklu görevi KAPATIYOR. Yalnız yatay çalışmak isteyen
   * oyunların kaçış kapısı; bizim gibi bir uygulamada iPad'i kısıtlamak demek.
   */
  it('çoklu görev kapatılmamış', () => {
    expect(IOS.infoPlist.UIRequiresFullScreen).toBeUndefined();
  });
});
