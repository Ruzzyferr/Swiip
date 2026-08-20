import { BCP47, type Dil } from './i18n';

/**
 * Tarih biçimi (F10.3).
 *
 * Yenileme tarihi, spec bölüm 13'e göre paywall'da en büyük puntoda duran iki bilgiden
 * biri. Onu `toLocaleDateString('tr-TR')` ile yazmak, İngilizce kullanıcıya Türkçe ay
 * adı ve Türk tarih sırası göstermek demekti — üstelik dilin ne olduğundan bağımsız,
 * sabit.
 *
 * Ödeme ekranında okunamayan bir tarih, gizlenmiş bir tarihtir.
 */

/** "20 Ağustos 2026" / "August 20, 2026" — yenileme gibi kritik tarihler için açık biçim. */
export function tarihMetni(tarih: Date, dil: Dil): string {
  return new Intl.DateTimeFormat(BCP47[dil], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(tarih);
}

/** "20.08.2026" / "8/20/2026" — listelerde ve dar alanlarda. */
export function kisaTarihMetni(tarih: Date, dil: Dil): string {
  return new Intl.DateTimeFormat(BCP47[dil]).format(tarih);
}

/** "20 Ağu" / "Aug 20" — grafik ekseni ve dar kartlar için. */
export function gunAyMetni(tarih: Date, dil: Dil): string {
  return new Intl.DateTimeFormat(BCP47[dil], { day: '2-digit', month: 'short' }).format(tarih);
}
