import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Başlığı gizlenmiş her ekran üst kenar boşluğunu kendisi vermeli (F1.6).
 *
 * `SafeAreaProvider` kökte takılıydı ama **hiçbir ekran kenar boşluklarını okumuyordu**:
 * paket yalnızca sağlayıcı için duruyordu. Gezinme başlığı olan ekranlarda sorun yok —
 * boşluğu react-navigation veriyor. Başlığı gizlenmiş ekranlarda içerik doğrudan durum
 * çubuğunun altından başlıyor.
 *
 * Emülatörde görüldü: 18 yaş kapısının başlığı saatin hizasına geliyordu. Çentikli bir
 * telefonda çentiğin altında kalırdı ve o ekran bir **güvenlik kapısı** — okunmaması
 * kabul edilebilir değil.
 *
 * Kural bileşenin kendi kendine anlayabileceği bir şey değil (denendi: header bağlamını
 * okumak `@react-navigation/elements`i doğrudan bağımlılık yapıyor ve sürüm çakışıyor).
 * Açık bir prop var; bu test de onun unutulmadığını denetliyor.
 */

const APP = join(import.meta.dirname, '..', '..', 'app');

function tsxDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return tsxDosyalari(yol);
    return ad.endsWith('.tsx') ? [yol] : [];
  });
}

/**
 * Başlığı gizlenmiş ekranlar.
 *
 * Başlık İKİ yerden gizlenebiliyor ve bu test uzun süre yalnızca birine bakıyordu:
 * ekranın kendi dosyasına. Oysa `app/_layout.tsx` de `<Stack.Screen name="index"
 * options={{ headerShown: false }} />` diyor — yani karşılama ekranının başlığı
 * gizliydi ama bu tarama onu HİÇ görmedi. O ekran da güvenli alanı okumuyordu:
 * üst boşluk elle `tema.bosluk.xxl` (32 pt) yazılmıştı, çentikli bir iPhone'da üst
 * kenar boşluğu 59 pt.
 *
 * Yetkili olan **en yakın** `_layout.tsx`: kök düzen `degerlendirme` gibi bütün bir
 * dizini gizliyor, ama o dizinin kendi düzeni başlıkları ekran ekran yeniden
 * tanımlıyor. Bu yüzden yalnızca dosyanın bir üstündeki düzene bakılıyor.
 */
function baslikGizli(yol: string): boolean {
  if (/headerShown:\s*false/.test(readFileSync(yol, 'utf8'))) return true;

  const duzen = join(dirname(yol), '_layout.tsx');
  if (!existsSync(duzen)) return false;

  const ad = basename(yol, '.tsx');
  const bildirim = new RegExp(`name="${ad}"[^>]*headerShown:\\s*false`);
  return bildirim.test(readFileSync(duzen, 'utf8'));
}

const BASLIKSIZ = tsxDosyalari(APP)
  .filter((yol) => !yol.endsWith('_layout.tsx'))
  .filter(baslikGizli);

describe('başlıksız ekranlarda güvenli alan', () => {
  it('başlığını gizleyen ekran var — test boşa dönmüyor', () => {
    expect(BASLIKSIZ.length).toBeGreaterThan(0);
  });

  it.each(BASLIKSIZ.map((y) => [y.slice(APP.length + 1), y]))(
    '%s üst kenar boşluğunu veriyor',
    (_ad, yol) => {
      const kaynak = readFileSync(yol, 'utf8');
      const kapVeriyor = /<Ekran[^>]*ustGuvenliAlan/.test(kaynak);
      const kendiOkuyor = /useSafeAreaInsets\(\)/.test(kaynak);

      expect(
        kapVeriyor || kendiOkuyor,
        'Başlık gizli ama üst kenar boşluğu yok: içerik durum çubuğunun ve çentiğin ' +
          'altına girer. <Ekran ustGuvenliAlan> kullan ya da useSafeAreaInsets() oku.',
      ).toBe(true);
    },
  );
});

/**
 * `Ekran` alt kenar boşluğunu her zaman ekler: jest çubuğunun altında kalan içerik
 * dokunulamaz. Bunu bir kez kaybetmek, ekranın son düğmesini erişilemez yapar.
 */
describe('Ekran kabı', () => {
  const kaynak = readFileSync(join(import.meta.dirname, 'bilesenler.tsx'), 'utf8');

  it('kenar boşluklarını okuyor', () => {
    expect(kaynak).toMatch(/useSafeAreaInsets\(\)/);
  });

  it('alt kenar boşluğunu ekliyor', () => {
    expect(kaynak).toMatch(/kenar\.bottom/);
  });
});
