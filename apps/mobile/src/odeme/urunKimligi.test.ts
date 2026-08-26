import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Android'de mağaza fiyatı ekrana GELİYOR mu?
 *
 * App Store ürün kimliğini olduğu gibi veriyor (`swiip_pro_aylik`); Google Play ise
 * taban plan kimliğini iki nokta üst üste ile ekliyor (`swiip_pro_aylik:aylik`).
 * RevenueCat panelinde Android ürünleri gerçekten böyle kayıtlı.
 *
 * `fiyatlariGetir()` haritayı mağazadan gelen kimlikle anahtarlıyordu, paywall ise
 * son eksiz kimlikle arıyordu. İsabet yok → her Android kullanıcısı, hangi ülkede
 * olursa olsun, sunucudaki TRY liste fiyatını görüyordu. Mağaza dolar tahsil ederken
 * ekranda ₺ yazması yanlış fiyat beyanıdır.
 *
 * `fiyat.test.ts` bu sınıfı kovalıyordu ama yalnızca `magaza.fiyatlar()` ÇAĞRILIYOR
 * mu diye bakıyordu. Çağrılıyordu; sonucu kullanılmıyordu.
 *
 * `magaza.ts` doğrudan içe aktarılamıyor (react-native ve RevenueCat yerel modülünü
 * çekiyor, Node altında ayrıştırılamaz); bu yüzden saf fonksiyon kaynaktan okunup
 * çalıştırılıyor ve bağlantı kaynak taramasıyla doğrulanıyor.
 */

const KAYNAK = readFileSync(join(import.meta.dirname, 'magaza.ts'), 'utf8');

/** Saf fonksiyonu kaynaktan çıkarıp çalıştırır — davranışı gerçekten sınayabilmek için. */
function sadelestir(): (kimlik: string) => string {
  const govde = KAYNAK.match(
    /export function urunKimliginiSadelestir\(magazaKimligi: string\): string \{([\s\S]*?)\n\}/,
  );
  if (!govde) throw new Error('urunKimliginiSadelestir bulunamadı');
  return new Function('magazaKimligi', govde[1]!) as (kimlik: string) => string;
}

describe('mağaza ürün kimliği sadeleştirme', () => {
  const f = sadelestir();

  it('Play taban plan son ekini kırpar', () => {
    expect(f('swiip_pro_aylik:aylik')).toBe('swiip_pro_aylik');
    expect(f('swiip_temel_yillik:yillik')).toBe('swiip_temel_yillik');
  });

  it('App Store kimliğine dokunmaz', () => {
    expect(f('swiip_pro_aylik')).toBe('swiip_pro_aylik');
  });

  it('boş dizede patlamaz', () => {
    expect(f('')).toBe('');
  });
});

describe('fiyat haritası paywall ile aynı anahtarı kullanıyor', () => {
  it('fiyatlariGetir haritayı sadeleştirilmiş kimlikle anahtarlıyor', () => {
    // `lastIndexOf`: ilk eşleşme SDK'sız sağlayıcının boş dönen sürümü.
    const bolum = KAYNAK.slice(KAYNAK.lastIndexOf('async fiyatlariGetir()'));
    expect(
      bolum.slice(0, 500),
      'ham `u.identifier` ile anahtarlanırsa Android fiyatı hiçbir zaman bulunamaz.',
    ).toMatch(/urunKimliginiSadelestir\(u\.identifier\)/);
  });

  it('paywall aramayı URUNLER içindeki kimlikle yapıyor', () => {
    const paywall = readFileSync(
      join(import.meta.dirname, '..', '..', 'app', 'odeme', 'paywall.tsx'),
      'utf8',
    );
    expect(paywall).toMatch(/magazaFiyatlari\[[\s\S]{0,80}urunKimligi\(/);
  });
});
