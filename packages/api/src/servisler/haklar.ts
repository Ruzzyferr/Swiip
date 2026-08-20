/**
 * Plan hakları — spec bölüm 13.
 *
 * Dördüncü plan asla eklenmez. Bu tablo tek doğruluk kaynağıdır; özellik kilitleri
 * her yerde buradan okunur, koda serpiştirilmez.
 */

export const PLANLAR = ['ucretsiz', 'temel', 'pro'] as const;
export type Plan = (typeof PLANLAR)[number];

export interface Haklar {
  ad: string;
  aylik_fiyat_try: number;
  yillik_fiyat_try: number;

  degerlendirme: boolean;
  /** Ücretsiz katmanda bir kez; ödemelide ayda bir. */
  vucut_analizi_aylik: number;
  /** Ücretsiz katmanda yalnızca 1. gün görünür. */
  gorunur_gun_sayisi: number | 'tumu';
  manuel_kalori: boolean;
  seans_geri_bildirimi: boolean;
  kalori_makro_hedefi: boolean;
  ogun_plani: boolean;
  kaydirmali_ogun: boolean;
  barkod: boolean;
  koc_mesaji_aylik: number;
  yemek_tanima_aylik: number;
  program_duzenleme: 'sinirsiz';
  reklam: false;
}

export const HAK_TABLOSU: Record<Plan, Haklar> = {
  ucretsiz: {
    ad: 'Ücretsiz',
    aylik_fiyat_try: 0,
    yillik_fiyat_try: 0,
    degerlendirme: true,
    vucut_analizi_aylik: 1,
    gorunur_gun_sayisi: 1,
    manuel_kalori: true,
    seans_geri_bildirimi: false,
    kalori_makro_hedefi: false,
    ogun_plani: false,
    kaydirmali_ogun: false,
    barkod: false,
    koc_mesaji_aylik: 0,
    yemek_tanima_aylik: 0,
    program_duzenleme: 'sinirsiz',
    reklam: false,
  },
  temel: {
    ad: 'Temel',
    aylik_fiyat_try: 99,
    yillik_fiyat_try: 690,
    degerlendirme: true,
    vucut_analizi_aylik: 1,
    gorunur_gun_sayisi: 'tumu',
    manuel_kalori: true,
    seans_geri_bildirimi: true,
    kalori_makro_hedefi: true,
    ogun_plani: true,
    kaydirmali_ogun: true,
    barkod: true,
    koc_mesaji_aylik: 60,
    yemek_tanima_aylik: 0,
    program_duzenleme: 'sinirsiz',
    reklam: false,
  },
  pro: {
    ad: 'Pro',
    aylik_fiyat_try: 169,
    yillik_fiyat_try: 1190,
    degerlendirme: true,
    vucut_analizi_aylik: 1,
    gorunur_gun_sayisi: 'tumu',
    manuel_kalori: true,
    seans_geri_bildirimi: true,
    kalori_makro_hedefi: true,
    ogun_plani: true,
    kaydirmali_ogun: true,
    barkod: true,
    koc_mesaji_aylik: 150,
    yemek_tanima_aylik: 250,
    program_duzenleme: 'sinirsiz',
    reklam: false,
  },
};

export function planHaklari(plan: Plan): Haklar {
  return HAK_TABLOSU[plan];
}

/** Ücretsiz katmanda vücut analizi ömür boyu bir kez; ödemelide her ay. */
export function vucutAnaliziHakki(plan: Plan, toplamAnaliz: number, buAyAnaliz: number): boolean {
  if (plan === 'ucretsiz') return toplamAnaliz < 1;
  return buAyAnaliz < HAK_TABLOSU[plan].vucut_analizi_aylik;
}

export function ozellikAcik(plan: Plan, ozellik: keyof Haklar): boolean {
  const deger = HAK_TABLOSU[plan][ozellik];
  if (typeof deger === 'boolean') return deger;
  if (typeof deger === 'number') return deger > 0;
  return true;
}
