/**
 * Haftanın bitip bitmediği kararı.
 *
 * Ekranda `gunler.every(...)` yazmak kolaydı ama iki kuralı görünmez kılıyordu:
 * ücretsiz kullanıcının kilitli günleri ve atlanan seansın da "bitti" sayılması.
 * Saf mantık ekranda durursa sınanmaz; sınanmayan kural sessizce kayar.
 */

/** Seans durumları — şemadaki `sessions.status` ile aynı sözlük. */
export type SeansDurumu = 'planlandi' | 'tamamlandi' | 'atlandi';

export interface HaftaSeansi {
  status: string;
}

export interface HaftaDurumuGirdisi {
  seanslar: HaftaSeansi[];
  /** Ücretsiz planda gösterilmeyen gün sayısı. */
  kilitliGunSayisi: number;
}

/**
 * Kullanıcıya "sonraki haftayı hesapla" teklif edilebilir mi?
 *
 * Kilitli gün varken teklif edilmez: ücretsiz kullanıcı haftanın yalnızca 1. gününü
 * görüyor, geri kalanını yapmadı. Ona "haftayı bitirdin" demek, göstermediğimiz bir
 * şeyi bitirmiş saymak olurdu.
 *
 * Atlanan seans bitmiş sayılır. Seansı atlamak bir cevaptır; kullanıcı sebebini yazdı
 * ve motor programı kaydırdı. Atlayan kullanıcıyı haftada kilitli tutmak, geri
 * bildirim verdiği için cezalandırmak olurdu.
 */
export function haftaBittiMi(girdi: HaftaDurumuGirdisi): boolean {
  if (girdi.kilitliGunSayisi > 0) return false;
  if (girdi.seanslar.length === 0) return false;
  return girdi.seanslar.every((s) => s.status !== 'planlandi');
}
