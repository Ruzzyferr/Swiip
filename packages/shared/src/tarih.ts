import { BCP47, type Dil } from './diller';

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

/**
 * Sunucudan gelen ISO tarihi kullanıcının dilinde yazar.
 *
 * API tarihi `2026-09-01` gibi gönderiyor; sözlük onu doğrudan cümleye koyarsa kullanıcı
 * makine biçimi görür. Bozuk ya da beklenmedik bir değer gelirse olduğu gibi geçiliyor:
 * kota mesajını hiç göstermemektense makine biçimi göstermek yeğdir.
 */
export function gunMetni(ham: string | number | undefined, dil: Dil): string {
  if (ham === undefined) return '';
  const metin = String(ham);
  const zaman = Date.parse(metin.length === 10 ? `${metin}T00:00:00.000Z` : metin);
  if (Number.isNaN(zaman)) return metin;
  return tarihMetni(new Date(zaman), dil);
}

/**
 * "Bugün" — YEREL güne göre, `YYYY-MM-DD`.
 *
 * Her yerde `new Date().toISOString().slice(0, 10)` yazıyordu ve o UTC günü verir.
 * Türkiye UTC+3: gece 00:00 ile 03:00 arasında girilen yemek DÜNE yazılıyor ve
 * kullanıcının "Bugün" listesinden kayboluyordu. Gece atıştırması bu üründe
 * kenar durum değil — kalori takibinin en sık kaçırılan öğünü.
 *
 * `toISOString` yerine yerel bileşenler okunuyor; cihaz hangi saat diliminde olursa
 * olsun kullanıcının gördüğü tarih ile kaydedilen gün aynı oluyor.
 */
export function yerelGun(tarih: Date = new Date()): string {
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, '0');
  const gun = String(tarih.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
}

/**
 * O haftanın pazartesisi — yerel güne göre, `YYYY-MM-DD`.
 *
 * Öğün planı hafta anahtarıyla saklanıyor. UTC ile hesaplandığında aynı gece penceresi
 * anahtarı bir önceki haftaya kaydırıyor ve kullanıcı kendi planını bulamıyordu.
 */
export function yerelHaftaBasi(tarih: Date = new Date()): string {
  const d = new Date(tarih.getFullYear(), tarih.getMonth(), tarih.getDate());
  // getDay(): 0 pazar. Pazartesi başlangıç olacak şekilde kaydırılıyor.
  const kaydir = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - kaydir);
  return yerelGun(d);
}
