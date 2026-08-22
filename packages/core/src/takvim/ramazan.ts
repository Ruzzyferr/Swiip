/**
 * Ramazan penceresi.
 *
 * B12 ("Ramazan'da oruç tutar mısın?") bir **tercih** sorusu. Tek başına okunduğunda
 * oruç bayrağını yılın 12 ayı açık tutuyordu: Ağustos ayında bir kullanıcıya sahur,
 * iftar ve iftar sonrası öğünlerinden kurulu bir haftalık plan çıkıyordu. Tercihi
 * duruma çeviren şey takvim.
 *
 * Hicri ay elle yazılmış bir tarih tablosundan değil, `Intl`in Ümmülkura takviminden
 * okunuyor. Tablo yazmak bugün doğru, üç yıl sonra sessizce yanlış olurdu ve kimse
 * fark etmezdi.
 *
 * Ümmülkura ile Diyanet'in ilanı bir gün kayabilir. Öğün penceresinin bir gün kayması
 * kabul edilebilir; beş ay kayması değil.
 */

const RAMAZAN_AYI = 9;

let bicimlendirici: Intl.DateTimeFormat | undefined;

function hicriAy(tarih: Date): number | undefined {
  try {
    bicimlendirici ??= new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'numeric',
      timeZone: 'UTC',
    });
    const ay = Number(bicimlendirici.format(tarih));
    return Number.isFinite(ay) ? ay : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verilen gün Ramazan mı?
 *
 * Takvim okunamazsa `false` dönüyor: emin olmadığımızda kullanıcının öğün düzenini
 * kendiliğinden değiştirmek, yanlış tarafta hata yapmak olurdu.
 */
export function ramazanMi(tarih: Date): boolean {
  return hicriAy(tarih) === RAMAZAN_AYI;
}
