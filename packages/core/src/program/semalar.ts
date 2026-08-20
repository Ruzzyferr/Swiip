import type { Hareket, Hedef } from '@made2fit/shared';

/**
 * Set/tekrar/dinlenme şemaları. Hedefe ve hareketin bileşik/izolasyon oluşuna bağlı.
 * Kaynak: ACSM direnç antrenmanı önerileri + hipertrofi literatürünün ortak paydası.
 */

export interface Sema {
  tekrar_alt: number;
  tekrar_ust: number;
  dinlenme_sn: number;
  max_set: number;
}

interface HedefSemasi {
  bilesik: Sema;
  izolasyon: Sema;
}

const SEMALAR: Record<Hedef, HedefSemasi> = {
  guc_artisi: {
    bilesik: { tekrar_alt: 3, tekrar_ust: 6, dinlenme_sn: 180, max_set: 5 },
    izolasyon: { tekrar_alt: 8, tekrar_ust: 12, dinlenme_sn: 90, max_set: 3 },
  },
  kas_kazanimi: {
    bilesik: { tekrar_alt: 6, tekrar_ust: 10, dinlenme_sn: 120, max_set: 4 },
    izolasyon: { tekrar_alt: 10, tekrar_ust: 15, dinlenme_sn: 75, max_set: 4 },
  },
  yag_kaybi: {
    bilesik: { tekrar_alt: 8, tekrar_ust: 12, dinlenme_sn: 90, max_set: 4 },
    izolasyon: { tekrar_alt: 12, tekrar_ust: 20, dinlenme_sn: 60, max_set: 3 },
  },
  dayaniklilik: {
    bilesik: { tekrar_alt: 12, tekrar_ust: 15, dinlenme_sn: 75, max_set: 3 },
    izolasyon: { tekrar_alt: 15, tekrar_ust: 20, dinlenme_sn: 45, max_set: 3 },
  },
  genel_saglik: {
    bilesik: { tekrar_alt: 8, tekrar_ust: 12, dinlenme_sn: 90, max_set: 3 },
    izolasyon: { tekrar_alt: 12, tekrar_ust: 15, dinlenme_sn: 60, max_set: 3 },
  },
  sakatlik_donusu: {
    bilesik: { tekrar_alt: 10, tekrar_ust: 15, dinlenme_sn: 90, max_set: 3 },
    izolasyon: { tekrar_alt: 12, tekrar_ust: 18, dinlenme_sn: 60, max_set: 3 },
  },
  spora_ozel: {
    bilesik: { tekrar_alt: 4, tekrar_ust: 8, dinlenme_sn: 150, max_set: 4 },
    izolasyon: { tekrar_alt: 10, tekrar_ust: 15, dinlenme_sn: 75, max_set: 3 },
  },
  durus_agri: {
    bilesik: { tekrar_alt: 10, tekrar_ust: 15, dinlenme_sn: 90, max_set: 3 },
    izolasyon: { tekrar_alt: 12, tekrar_ust: 20, dinlenme_sn: 60, max_set: 3 },
  },
};

export function bilesikMi(hareket: Hareket): boolean {
  return hareket.patern !== 'izolasyon';
}

export function semaSec(hedef: Hedef, hareket: Hareket): Sema {
  const hedefSemasi = SEMALAR[hedef];
  return bilesikMi(hareket) ? hedefSemasi.bilesik : hedefSemasi.izolasyon;
}

/** Bir setin toplam süresi: kaldırma + dinlenme (saniye). */
export const SET_CALISMA_SN = 40;

export function hareketSuresiDakika(set: number, dinlenmeSn: number): number {
  return (set * (SET_CALISMA_SN + dinlenmeSn)) / 60;
}
