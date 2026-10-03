import type { Dil } from './diller';
import { varsayilanDil } from './diller';

/**
 * Hareketin kullanıcının dilindeki adı.
 *
 * Katalogda `ad_en` ilk günden beri var ve gerekçe katmanı onu zaten kullanıyor
 * (`shared/gerekce.ts`) — çünkü çevrilmiş bir cümlenin içine Türkçe hareket adı gömmek
 * yarım çevrilmiş bir gerekçe olurdu.
 *
 * Ama arayüzün geri kalanı `ad_tr`'yi koşulsuz basıyordu. Sonuç, İngilizce arayüzde
 * **aynı hareketin aynı ekranda iki ayrı adla** görünmesiydi:
 *
 *   WHY THIS EXERCISE   Hammer Curl was chosen: ...
 *   (kart başlığı)      Çekiç curl
 *   IF THE MACHINE...   Dumbbell biceps curl · Kabloda biceps curl
 *
 * Kullanıcı bunların aynı hareket olduğunu bilemez. Yarım çevrilmiş bir arayüz, hiç
 * çevrilmemiş olandan kötüdür — projenin dil katmanı kararının tamamı bu cümleye dayanıyor.
 *
 * Hareket TALİMATLARI da artık iki dilde (`talimat_en`, `talimat_tr` ile adım adım hizalı;
 * derleyici ve `katalog.test.ts` sayıyı kilitliyor). Bkz. `hareketTalimati`.
 */
export interface AdlandirilabilirHareket {
  ad_tr: string;
  ad_en?: string;
}

export function hareketAdi(
  hareket: AdlandirilabilirHareket | undefined | null,
  dil: Dil = varsayilanDil,
  yedek = '',
): string {
  if (!hareket) return yedek;
  // İngilizce adı yoksa Türkçesine düşülür: uydurmak yerine izi göstermek.
  if (dil === 'en' && hareket.ad_en) return hareket.ad_en;
  return hareket.ad_tr || yedek;
}

/**
 * Hareketin adım adım talimatı, kullanıcının dilinde.
 *
 * İngilizce arayüzdeki kullanıcı uzun süre Türkçe talimat okudu; Ayarlar'daki dil notu
 * bunu itiraf ediyordu. İngilizcesi boşsa Türkçesine düşülür.
 */
export interface TalimatliHareket {
  talimat_tr: readonly string[];
  talimat_en?: readonly string[];
}

export function hareketTalimati(
  hareket: TalimatliHareket | undefined | null,
  dil: Dil = varsayilanDil,
): readonly string[] {
  if (!hareket) return [];
  if (dil === 'en' && hareket.talimat_en && hareket.talimat_en.length > 0) {
    return hareket.talimat_en;
  }
  return hareket.talimat_tr;
}
