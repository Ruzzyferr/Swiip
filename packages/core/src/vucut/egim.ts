/**
 * Telefon eğim kontrolü (F4.2).
 *
 * Vücut fotoğrafında ölçülen şey oranlar: omuz/bel, bel/kalça. Telefon eğik tutulduğunda
 * perspektif bu oranları değiştirir — kullanıcı hiç değişmemişken "omzun genişlemiş"
 * deriz. Ölçüm aletinin kendisi kaymışsa ölçüm yoktur.
 *
 * Bu yüzden protokol sabit ve eğik telefonda çekim düğmesi açılmaz. Kullanıcıyı
 * kısıtlamak için değil; karşılaştırmayı mümkün kılmak için.
 *
 * Girdi ivmeölçerden gelen yerçekimi vektörü (g cinsinden). Saf fonksiyon: sensör
 * okuması bir üst katmanda yapılır.
 */

export interface IvmeOkumasi {
  x: number;
  y: number;
  z: number;
}

/**
 * İzin verilen sapma (derece).
 *
 * Elde tutulan telefon hiçbir zaman tam dik değildir; 0'da ısrar etmek çekim düğmesini
 * hiç açmaz. 8 derece, perspektif hatasını ihmal edilebilir tutarken elin doğal
 * titremesine yer bırakıyor.
 */
export const EGIM_TOLERANSI = 8;

/** Ölçüm yoksa varsayılan: dik değil. Bilinmeyeni doğru saymayız. */
const OLCUM_YOK_DERECESI = 90;

/**
 * Telefonun dikeyden sapması (0-90 derece).
 *
 * Ölçülen şey, cihazın uzun ekseninin (y) yerçekimiyle ne kadar hizalı olduğu.
 *
 * **İşaret bilerek yok sayılıyor.** İlk hâli `-y` referansı kullanıyordu ve bu yalnızca
 * iOS'ta doğru: CoreMotion dik tutulan telefonda `y = -1` verir, Android ise `y = +9.81`.
 * Expo bu iki sözleşmeyi eşitlemiyor. Sonuç, Android'de eğim her zaman ~180 çıkıyor ve
 * çekim düğmesi **hiç açılmıyordu** — kapı yalnızca telefon baş aşağı tutulduğunda
 * açılıyordu. Emülatörde ölçülerek görüldü.
 *
 * Mutlak değer almak iki platformda da doğru sonucu veriyor ve hangi platformun hangi
 * işareti kullandığına bağımlı kalmıyor. Bedeli: baş aşağı tutulan telefon da "hizalı"
 * sayılıyor. Bu kabul edilebilir — ölçümü bozan şey perspektif, yani eğim; ters çevirmek
 * oranları değiştirmiyor ve zaten canlı önizlemede apaçık görünüyor.
 */
export function egimDerecesi(ivme: IvmeOkumasi): number {
  const buyukluk = Math.hypot(ivme.x, ivme.y, ivme.z);

  // Sensör henüz veri vermediyse veya serbest düşüşteyse açı hesaplanamaz.
  if (buyukluk < 0.1) return OLCUM_YOK_DERECESI;

  // Dikey eksenle hizalanma; işaret değil büyüklük önemli.
  const kosinus = Math.abs(ivme.y) / buyukluk;

  // Kayan nokta hatası kosinüsü 1'in üstüne taşırabilir; acos NaN verir.
  const guvenli = Math.min(1, kosinus);

  return (Math.acos(guvenli) * 180) / Math.PI;
}

export function telefonDikMi(ivme: IvmeOkumasi): boolean {
  const buyukluk = Math.hypot(ivme.x, ivme.y, ivme.z);
  if (buyukluk < 0.1) return false;

  return egimDerecesi(ivme) <= EGIM_TOLERANSI;
}
