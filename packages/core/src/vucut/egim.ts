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
 * Telefonun dikeyden sapması (derece).
 *
 * Portre modda dik tutulan telefonda yerçekimi -y ekseninde okunur. Sapma, ölçülen
 * vektör ile bu referans arasındaki açı.
 */
export function egimDerecesi(ivme: IvmeOkumasi): number {
  const buyukluk = Math.hypot(ivme.x, ivme.y, ivme.z);

  // Sensör henüz veri vermediyse veya serbest düşüşteyse açı hesaplanamaz.
  if (buyukluk < 0.1) return OLCUM_YOK_DERECESI;

  // -y referansıyla iç çarpım; buyukluk ile normalleştirince kosinüs kalır.
  const kosinus = -ivme.y / buyukluk;

  // Kayan nokta hatası kosinüsü [-1, 1] dışına taşırabilir; acos NaN verir.
  const guvenli = Math.min(1, Math.max(-1, kosinus));

  return (Math.acos(guvenli) * 180) / Math.PI;
}

export function telefonDikMi(ivme: IvmeOkumasi): boolean {
  const buyukluk = Math.hypot(ivme.x, ivme.y, ivme.z);
  if (buyukluk < 0.1) return false;

  return egimDerecesi(ivme) <= EGIM_TOLERANSI;
}
