import { tr } from './metinler.tr';
import { en } from './metinler.en';

/**
 * Dil katmanı (F10.1).
 *
 * Türkiye önce, ama veri modeli ilk günden çok dilli: `users.locale`, `exercises.locale`
 * ve `foods.locale` alanları şemada başından beri var. Eksik olan tek şey arayüz
 * sözlüğüydü; burası onu kapatıyor.
 *
 * Tasarım kararı: dil, çalışma zamanında sözlük değiştirerek değil, tip düzeyinde
 * eşitlenmiş iki sözlükten biri seçilerek çözülür. Böylece eksik bir çeviri derlemede
 * yakalanır — kullanıcının karşısına yarı Türkçe bir ekran çıkmaz.
 */

export const DILLER = ['tr', 'en'] as const;
export type Dil = (typeof DILLER)[number];

/**
 * Dilin BCP47 karşılığı — sayı, para ve tarih biçimi için.
 *
 * Ayrı durmalı: 'tr' bizim iç kodumuz, 'tr-TR' `Intl`'in beklediği etiket. Biçimlendirme
 * çağrılarına doğrudan 'tr' vermek sessizce yanlış yerel ayar seçtirir.
 */
export const BCP47: Record<Dil, string> = {
  tr: 'tr-TR',
  en: 'en-US',
};

/** Türkiye önce: kaynak dil ve yedek dil Türkçe. */
export const varsayilanDil: Dil = 'tr';

/**
 * Sözlük tipi: Türkçe sözlükten türetilir ama string sabitleri genişletilir.
 * `as const` olmasaydı bu genişletmeye gerek kalmazdı; `as const` olmasa da metinlerin
 * yanlışlıkla değiştirilmesini engelleyemezdik. Genişletme iki faydayı birden veriyor.
 */
type Genislet<T> = T extends string
  ? string
  : T extends (...girdi: infer G) => infer C
    ? (...girdi: G) => C
    : { [A in keyof T]: Genislet<T[A]> };

export type Metinler = Genislet<typeof tr>;

const SOZLUKLER: Record<Dil, Metinler> = { tr, en };

export function metinleriAl(dil: Dil = varsayilanDil): Metinler {
  return SOZLUKLER[dil] ?? SOZLUKLER[varsayilanDil];
}

function desteklenen(kod: string): Dil | undefined {
  const taban = kod.trim().toLowerCase().split('-')[0];
  return DILLER.find((d) => d === taban);
}

/**
 * Dil kodu veya `Accept-Language` başlığından dil çözer.
 *
 * Kalite değerlerini (`q=0.8`) sıralamak için ayrıştırmıyoruz: başlık zaten tercih
 * sırasında gelir ve listedeki ilk desteklenen dil doğru cevaptır. Fazladan ayrıştırma,
 * fazladan hata yüzeyi.
 */
export function dilCozumle(ham?: string | null): Dil {
  if (!ham) return varsayilanDil;

  for (const parca of ham.split(',')) {
    const kod = parca.split(';')[0];
    const bulunan = kod ? desteklenen(kod) : undefined;
    if (bulunan) return bulunan;
  }

  return varsayilanDil;
}

/** Geriye dönük uyumluluk: mevcut çağrı yerleri `metinler.x.y` kullanıyor. */
export const metinler = tr;

export { tr, en };
