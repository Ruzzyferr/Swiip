/**
 * Değerlendirme cevaplarının ham biçimi.
 * Soru id'si -> kullanıcının verdiği değer. `assessments.answers_jsonb` ile birebir.
 */
export type CevapDegeri =
  string | number | boolean | string[] | Record<string, string | number | boolean | null> | null;

export type Cevaplar = Record<string, CevapDegeri>;

/**
 * "Bu soruyu atla" işareti.
 *
 * İsteğe bağlı bir soruyu atlayan kullanıcının cevabı bu. Boş bırakmakla aynı şey değil:
 * boş cevap sıradaki soru olarak geri gelir, atlanan gelmez. Ayrım kullanıcının niyetinde.
 *
 * İşaret motorun bildiği bir kavram olmak zorunda. Yalnızca ekranda tanımlıyken sunucu
 * onu "listede olmayan seçenek" sayıp cevabı reddediyordu; bir soruyu atlayan kullanıcının
 * değerlendirmesi o andan sonra hiç kaydedilmiyordu.
 */
export const ATLANDI = '__atlandi__';

/** Atlanmış bir cevap mı? Veri okuyan hiçbir yerin işareti görmemesi gerekir. */
export function atlandiMi(deger: CevapDegeri | undefined): boolean {
  return deger === ATLANDI;
}

/** Tek seçimlik cevabı güvenle metne çevirir. */
export function metin(cevaplar: Cevaplar, soruId: string): string | undefined {
  const deger = cevaplar[soruId];
  if (atlandiMi(deger)) return undefined;
  return typeof deger === 'string' ? deger : undefined;
}

/** Çoklu seçim cevabını her zaman dizi olarak verir. */
export function dizi(cevaplar: Cevaplar, soruId: string): string[] {
  const deger = cevaplar[soruId];
  if (atlandiMi(deger)) return [];
  if (Array.isArray(deger)) return deger;
  if (typeof deger === 'string') return [deger];
  return [];
}

/** Sayısal cevabı güvenle sayıya çevirir; geçersizse undefined. */
export function sayi(cevaplar: Cevaplar, soruId: string): number | undefined {
  const deger = cevaplar[soruId];
  if (atlandiMi(deger)) return undefined;
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
