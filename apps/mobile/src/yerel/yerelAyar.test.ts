import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ekranlarda sabit yerel ayar kalmadı (F10.1, F10.3).
 *
 * `toLocaleUpperCase('tr-TR')`, `toLocaleDateString('tr-TR')` gibi çağrılar Türkçe için
 * doğru, İngilizce kullanıcı için sessizce yanlış: "high" → **"HİGH"**, tarih Türkçe ay
 * adıyla. Hata alınmaz, çeviri denetiminden de geçer — çünkü metin sözlükten geliyor,
 * bozulan şey biçim.
 *
 * Çeviri denetimi (`npm run ceviri`) satır içi **metni** arar; bu test satır içi
 * **yerel ayarı** arar. İkisi farklı sızıntı türü.
 *
 * Doğrusu `buyukHarf(metin, dil)` ve `tarihMetni(tarih, dil)`: karar tek yerde, dil
 * kullanıcıdan gelir.
 */

const EKRANLAR = join(import.meta.dirname, '..', '..', 'app');

function tsxDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return tsxDosyalari(yol);
    return ad.endsWith('.tsx') ? [yol] : [];
  });
}

/** `toLocaleX('tr-TR')` — dili yok sayan her çağrı. */
const SABIT_YEREL = /toLocale\w+\(\s*(?:'[a-z]{2}-[A-Z]{2}'|"[a-z]{2}-[A-Z]{2}")/;

const dosyalar = tsxDosyalari(EKRANLAR);

describe('ekranlarda sabit yerel ayar', () => {
  it('taranacak ekran var', () => {
    expect(dosyalar.length).toBeGreaterThan(20);
  });

  it.each(dosyalar.map((y) => [y.slice(EKRANLAR.length + 1), y]))(
    '%s sabit yerel ayar kullanmıyor',
    (_ad, yol) => {
      const eslesme = readFileSync(yol, 'utf8').match(SABIT_YEREL);

      expect(
        eslesme?.[0],
        `Sabit yerel ayar bulundu: ${eslesme?.[0]}. ` +
          'Bunun yerine buyukHarf(metin, dil) / tarihMetni(tarih, dil) kullan — ' +
          "İngilizce kullanıcıda 'tr-TR' ile büyütmek 'i' harfini 'İ' yapar.",
      ).toBeUndefined();
    },
  );
});
