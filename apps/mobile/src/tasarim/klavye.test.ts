import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Klavye içeriği örtmez.
 *
 * 2026-08-30'da emülatörde ölçüldü: "Yemiyorum" kartının dibindeki
 * "Vazgeçemeyeceğin yiyecek ne?" alanına dokunulduğunda alan tamamen klavyenin
 * arkasında kalıyor ve yazılan metin ekranda HİÇBİR YERDE görünmüyordu.
 *
 * Sebep iki katmanlı:
 *
 *  - Android'de eskiden `adjustResize` pencereyi daraltıyor, kaydırma kabı da
 *    kendiliğinden küçülüyordu. Uygulama `targetSdkVersion 36` ile derleniyor ve
 *    Android 15'ten (API 35) itibaren pencere kenardan kenara açılıyor:
 *    `adjustResize` artık pencereyi daraltmıyor. Kap ekranın tamamı kadar kalınca
 *    içeriğin altı klavyenin arkasında kalıyor ve oraya KAYDIRMAK da mümkün
 *    olmuyor — kaydırma, içeriğin sonu kabın sonuna geldiğinde bitiyor, kabın sonu
 *    ise klavyenin altında.
 *
 *  - iOS'ta bir `ScrollView` klavyeyi zaten hiç umursamıyor; `automaticallyAdjust\
 *    KeyboardInsets` açılmadıkça inset de eklenmiyor, odaklı alana kaydırma da
 *    yapılmıyor. App Store'a giden derleme buydu.
 *
 * Kural: klavyeyi tek bir kap çözer (`Ekran`), her ekran ayrı ayrı değil. Depoda
 * ikinci bir çözüm (`koc.tsx`'teki `KeyboardAvoidingView`) var ve o ekran kendi
 * sohbet düzenini kuruyor — istisna orada kalsın, çoğalmasın.
 */

const TASARIM = import.meta.dirname;
const APP = join(TASARIM, '..', '..', 'app');

function kod(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

const KAYNAK = kod(join(TASARIM, 'bilesenler.tsx'));

describe('Ekran klavyeyi hesaba katıyor', () => {
  it('iOS: kaydırma kabı klavye inset’ini kendisi ekliyor', () => {
    expect(
      /automaticallyAdjustKeyboardInsets/.test(KAYNAK),
      'iOS’ta ScrollView klavyeyi umursamaz; bu bayrak olmadan alan klavyenin ' +
        'arkasında kalır ve odaklı alana kaydırma da yapılmaz.',
    ).toBe(true);
  });

  it('Android: klavye yüksekliği dinleniyor', () => {
    expect(KAYNAK).toMatch(/Keyboard\.addListener\('keyboardDidShow'/);
    expect(KAYNAK).toMatch(/Keyboard\.addListener\('keyboardDidHide'/);
    expect(
      /Platform\.OS !== 'android'/.test(KAYNAK),
      'Dinleyici iOS’ta da çalışırsa inset ile dolgu toplanır, boşluk ikiye katlanır.',
    ).toBe(true);
  });

  /**
   * Kabın KENDİSİ daralıyor — alt dolguya pay eklemek YETMİYOR.
   *
   * Önce `contentContainerStyle`'ın alt dolgusuna klavye payı ekleniyordu. Dolgu
   * içeriği uzatıyor ama kap ekranın tamamı kadar kaldığı için kaydırmanın tavanı
   * değişmiyor; emülatörde ölçüldü, odaklı alan klavyenin kenarında 35 dp eksik
   * kalıyordu. Kabı daraltmak `adjustResize`'ın eskiden yaptığı şeydir.
   */
  it('Android: kap klavye kadar daralıyor', () => {
    expect(
      /paddingBottom: klavye/.test(KAYNAK),
      'Klavye payı kabı daraltmıyor; içeriğe dolgu eklemek kaydırma tavanını yükseltmez.',
    ).toBe(true);
  });

  it('Android: odaklı alan görünüre kaydırılıyor', () => {
    expect(
      /currentlyFocusedInput\(\)/.test(KAYNAK),
      'Dolgu tek başına yetmiyor: alan ulaşılabilir olur ama kullanıcı onu elle ' +
        'aramak zorunda kalır, yazdığını göremez.',
    ).toBe(true);
    expect(KAYNAK).toMatch(/measureInWindow/);
    expect(KAYNAK).toMatch(/scrollTo\(/);
  });

  it('dinleyiciler sökülüyor', () => {
    expect(KAYNAK, 'Sökülmeyen dinleyici her ekran açılışında birikir').toMatch(
      /acildi\.remove\(\)[\s\S]{0,80}kapandi\.remove\(\)/,
    );
  });

  it('dokunuşlar klavye açıkken de geçiyor', () => {
    // Klavye açıkken ilk dokunuş yalnızca klavyeyi kapatırsa şık seçmek iki dokunuş olur.
    expect(KAYNAK).toMatch(/keyboardShouldPersistTaps="handled"/);
  });
});

/**
 * Klavye çözümü ÇOĞALMIYOR.
 *
 * Her ekranın kendi `KeyboardAvoidingView`ini kurması, bu kusurun geri gelme yolu:
 * biri unutulur ve yalnızca o formda sessizce bozulur. Tek istisna sohbet ekranı.
 */
describe('klavye çözümü tek yerde', () => {
  function tsxDosyalari(dizin: string): string[] {
    return readdirSync(dizin).flatMap((ad) => {
      const yol = join(dizin, ad);
      if (statSync(yol).isDirectory()) return tsxDosyalari(yol);
      return ad.endsWith('.tsx') ? [yol] : [];
    });
  }

  const ISTISNA = ['koc.tsx'];

  it('ekranlar kendi klavye kabını kurmuyor', () => {
    const suclular = tsxDosyalari(APP)
      .filter((yol) => !ISTISNA.some((ad) => yol.endsWith(ad)))
      .filter((yol) => /KeyboardAvoidingView/.test(kod(yol)))
      .map((yol) => yol.slice(APP.length + 1));

    expect(
      suclular,
      'Klavyeyi `Ekran` çözüyor. Ekran başına ikinci bir çözüm, birinin unutulması demek.',
    ).toEqual([]);
  });
});
