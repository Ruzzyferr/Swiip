import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/**
 * Mağaza puanı isteme.
 *
 * 2026-10-06'ya kadar uygulama kullanıcıdan HİÇ puan istemiyordu. App Store'da tek puan
 * vardı; "kalori", "diyet", "antrenman programı" aramalarında ilk sıradakiler 10-60 bin
 * puanla duruyor ve sıralama büyük ölçüde indirme + puan hacmine bakıyor. Memnun kalan
 * kullanıcıya sormamak, aramada görünmemenin kendi elimizdeki tek sebebiydi.
 *
 * Oyunlaştırma YASAĞIYLA çelişmiyor: rozet, ödül, "5 yıldız ver" yönlendirmesi yok.
 * Yalnızca platformun KENDİ penceresi (Apple SKStoreReviewController, Google In-App
 * Review); ikisi de kendi sıklık sınırını ayrıca uyguluyor ve gösterip göstermeyeceğine
 * kendisi karar veriyor.
 *
 * An: seans geri bildirimi olumlu döndüğünde — kullanıcı programın işe yaradığını az
 * önce kendisi söyledi. Ağrı bildiren, "yapamadım" diyen kullanıcıya sorulmaz.
 */

const ANAHTAR = 'swiip.puan';

/** İlk istekten önce gereken olumlu seans sayısı. */
export const GEREKEN_IYI_SEANS = 3;
/** İlk olumlu seanstan sonra beklenecek gün: ilk gün heyecanı puan değil. */
export const ILK_BEKLEME_GUN = 2;
/** İki istek arası en az bu kadar gün. */
export const TEKRAR_GUN = 120;

export interface PuanDurumu {
  iyiSeans: number;
  /** İlk olumlu seansın zamanı (ms). */
  ilkIyi: number | null;
  /** Son istek zamanı (ms). */
  sonIstek: number | null;
}

export const BOS_PUAN_DURUMU: PuanDurumu = { iyiSeans: 0, ilkIyi: null, sonIstek: null };

export type SeansSonucu = 'tamamladim' | 'zorlandim' | 'yapamadim';

/** Seans "olumlu" mu: en az bir tamamlanan hareket, hiç "yapamadım" yok, ağrı yok. */
export function olumluSeansMi(sonuclar: SeansSonucu[], agri: boolean): boolean {
  return !agri && sonuclar.includes('tamamladim') && !sonuclar.includes('yapamadim');
}

/** Saf karar: olumlu bir seanstan sonra yeni durum ve "şimdi sor" kararı. */
export function olumluSeansSonrasi(
  durum: PuanDurumu,
  simdi: number,
): { durum: PuanDurumu; sor: boolean } {
  const yeni: PuanDurumu = {
    iyiSeans: durum.iyiSeans + 1,
    ilkIyi: durum.ilkIyi ?? simdi,
    sonIstek: durum.sonIstek,
  };
  const gun = 86_400_000;
  const sor =
    yeni.iyiSeans >= GEREKEN_IYI_SEANS &&
    simdi - (yeni.ilkIyi ?? simdi) >= ILK_BEKLEME_GUN * gun &&
    (yeni.sonIstek === null || simdi - yeni.sonIstek >= TEKRAR_GUN * gun);
  return { durum: sor ? { ...yeni, sonIstek: simdi } : yeni, sor };
}

async function oku(): Promise<PuanDurumu> {
  try {
    const ham = await AsyncStorage.getItem(ANAHTAR);
    return ham
      ? { ...BOS_PUAN_DURUMU, ...(JSON.parse(ham) as Partial<PuanDurumu>) }
      : BOS_PUAN_DURUMU;
  } catch {
    return BOS_PUAN_DURUMU;
  }
}

/**
 * Seans geri bildirimi başarıyla gönderildikten sonra çağrılır. Hiçbir koşulda hata
 * fırlatmaz: puan isteği, geri bildirimin kendisini asla bozmamalı.
 */
export async function seansSonrasiPuanIste(sonuclar: SeansSonucu[], agri: boolean): Promise<void> {
  try {
    if (!olumluSeansMi(sonuclar, agri)) return;
    const { durum, sor } = olumluSeansSonrasi(await oku(), Date.now());
    await AsyncStorage.setItem(ANAHTAR, JSON.stringify(durum));
    if (!sor) return;
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return;
    // Karar kartları önce okunsun: pencere sonucu gördükten sonra gelsin.
    setTimeout(() => void StoreReview.requestReview().catch(() => undefined), 1500);
  } catch {
    // sessiz: puan isteği yan iş
  }
}
