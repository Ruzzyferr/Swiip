/**
 * Değerlendirme cevaplarının ham biçimi.
 * Soru id'si -> kullanıcının verdiği değer. `assessments.answers_jsonb` ile birebir.
 */
export type CevapDegeri =
  string | number | boolean | string[] | Record<string, string | number | boolean | null> | null;

export type Cevaplar = Record<string, CevapDegeri>;

/** Tek seçimlik cevabı güvenle metne çevirir. */
export function metin(cevaplar: Cevaplar, soruId: string): string | undefined {
  const deger = cevaplar[soruId];
  return typeof deger === 'string' ? deger : undefined;
}

/** Çoklu seçim cevabını her zaman dizi olarak verir. */
export function dizi(cevaplar: Cevaplar, soruId: string): string[] {
  const deger = cevaplar[soruId];
  if (Array.isArray(deger)) return deger;
  if (typeof deger === 'string') return [deger];
  return [];
}

/** Sayısal cevabı güvenle sayıya çevirir; geçersizse undefined. */
export function sayi(cevaplar: Cevaplar, soruId: string): number | undefined {
  const deger = cevaplar[soruId];
  if (typeof deger === 'number' && Number.isFinite(deger)) return deger;
  if (typeof deger === 'string' && deger.trim() !== '') {
    const n = Number(deger.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Ölçü grubu (measure) cevabından tek alan okur. */
export function alan(cevaplar: Cevaplar, soruId: string, alanAdi: string): number | undefined {
  const deger = cevaplar[soruId];
  if (deger && typeof deger === 'object' && !Array.isArray(deger)) {
    const ham = (deger as Record<string, unknown>)[alanAdi];
    if (typeof ham === 'number' && Number.isFinite(ham)) return ham;
    if (typeof ham === 'string' && ham.trim() !== '') {
      const n = Number(ham.replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}
