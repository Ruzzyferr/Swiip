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
  /**
   * Bu plan reklam GORUR mu.
   *
   * Uzun sure her planda `false` idi ve paywall'daki "Reklam ve upsell yok" satiri
   * bos bir vaatti: ucretsizde de reklam olmayinca odemenin getirdigi bir sey degildi.
   *
   * `docs/rakip-analizi.md` olctu: Turkiye'nin en yuksek puanli iki fitness uygulamasi
   * (4,87) ucretsiz ve REKLAMLI; abonelikli olan her uygulama 3,2-3,8 bandinda.
   * Yasak olan reklam degil, **odeyene reklam gostermek** (EatBetter: "3 aylik aldim,
   * kaydet'e basiyorum reklam cikiyor" - 1*, 8 begeni).
   *
   * Bu yuzden alan bir TAAHHUT degil bir KAPI: ucretsizde acik, odemelide kapali.
   * Istemci bunu kendi plan bilgisinden turetmez; `GET /v1/abonelik/durum` yaniti
   * tek dogruluk kaynagidir.
   */
  reklam: boolean;
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
    /**
     * Hedef ve barkod ÜCRETSİZ — ikisi de bize sıfıra mal oluyor.
     *
     * Hedef deterministik bir formül (Mifflin-St Jeor + aktivite çarpanı), barkod ise
     * Open Food Facts. İkisinde de AI yok, marjinal maliyet yok.
     *
     * Kilitliyken ücretsiz kullanıcı yemeğini kaydedebiliyor ama kaç kaloride olması
     * gerektiğini bilmiyordu: defter var, hedef yok. "kalori hesaplama" aramasından
     * gelen kullanıcı ilk beş dakikada duvara çarpıyordu ve `rakip-analizi.md`'nin
     * ölçtüğü şey tam bu — 5 yıldızlı yorumlarda en sık geçen övgü kelimesi "ücretsiz".
     *
     * Duvar artık bizim maliyet ürettiğimiz yerde: yemek tanıma (görsel AI), koç (AI),
     * öğün planı ve kaydırma (koçluk ürünü).
     */
    kalori_makro_hedefi: true,
    ogun_plani: false,
    kaydirmali_ogun: false,
    barkod: true,
    koc_mesaji_aylik: 0,
    yemek_tanima_aylik: 0,
    program_duzenleme: 'sinirsiz',
    reklam: true,
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

/*
 * `ozellikAcik` kaldırıldı.
 *
 * `planHaklari(plan).x` ile aynı işi yapıyordu ve hiçbir uç onu çağırmıyordu. Kullanılan
 * yolu tekrarlayan ölü bir soyutlama, iki farklı hak kontrolü yazılabileceği izlenimi
 * veriyordu; bir gün ikisi ayrışırdı.
 */
