/**
 * Tasarım tokenleri — brand/ ile tutarlı tek kaynak.
 * Kural: neon veya turuncu yok. Kategorinin tamamı orada.
 * Oyunlaştırma rengi yok: kutlama, rozet, seri rengi tanımlanmaz.
 */

export const renkler = {
  murekkep: '#131614',
  murekkepYumusak: '#3A403C',
  murekkepSilik: '#5B625E',
  aksan: '#14615A',
  aksanKoyu: '#0E4741',
  aksanAcik: '#E4EFED',
  /**
   * Aksan ZEMİNİ üstündeki metin rengi.
   *
   * Birincil düğme metni `'#FFFFFF'` olarak sabit yazılmıştı. Açık temada aksan
   * `#14615A` ve beyazla 7.27:1 — sorun yok. Koyu temada aksan `#4FA79C`'ye açılıyor
   * ve beyaz metin **2.86:1**'e düşüyor: uygulamadaki her ana düğme okunmaz hâle
   * geliyordu. Zemin temayla değişiyorsa üstündeki metin de değişmek zorunda.
   */
  aksanUstu: '#FFFFFF',
  /**
   * Zemin bir ton soğudu: #F6F7F5 → #ECEEED.
   *
   * Eski değer kâğıdımsı ve sıcaktı; beyaz kartlarla birleşince ürün bir spor salonunu
   * değil klinik kabul ekranını çağrıştırıyordu. Ölçü aleti gövdesi kâğıt değil metaldir.
   * Aksan ve mürekkep aynı kaldı; kontrast oranları etkilenmiyor (mürekkep/zemin 15,4:1).
   */
  zemin: '#ECEEED',
  yuzey: '#FFFFFF',
  yuzeyIkincil: '#E3E6E4',
  cizgi: '#D2D7D3',
  /**
   * Çelik: ölçeğin gövdesi.
   *
   * Aksan tek başına hem ekseni hem okumayı taşıyamıyordu; her şey yeşile boyanınca
   * yeşilin bir şey işaret etme gücü kalmıyor. Kalibre bir alette gövde nötr metaldir,
   * renk yalnızca okunan değeri gösterir. Pasif çentikler ve eksen bu tonu kullanır.
   */
  celik: '#7C8480',
  celikSilik: '#9DA5A0',
  uyari: '#8A6A1F',
  uyariZemin: '#FBF3DF',
  tehlike: '#8C2F26',
  tehlikeZemin: '#FAEBE9',
  basari: '#245C3D',
  // Koyu tema
  koyu: {
    zemin: '#0E100F',
    yuzey: '#181B19',
    yuzeyIkincil: '#222623',
    murekkep: '#F1F3F0',
    murekkepYumusak: '#B9BFBA',
    murekkepSilik: '#969D98',
    cizgi: '#2E332F',
    celik: '#8B938E',
    celikSilik: '#4A514C',
    aksan: '#4FA79C',
    aksanAcik: '#16302D',
    // Açık aksan üstünde mürekkep okunur: 6.37:1.
    aksanUstu: '#131614',
  },
} as const;

export const bosluk = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Köşe yarıçapı sertleşti: 6/10/16 → 3/6/10.
 *
 * Yumuşak köşe "dostane uygulama" okur; ölçü aleti gövdesi keskindir. Dışarıdan gelen
 * eleştiri bunu "iç içe kutulama hastalığı, yapay zekâ arayüz üreticilerinin imzası"
 * diye adlandırdı — kutuların kendisi kadar yuvarlaklıkları da o izlenimi taşıyordu.
 */
export const yaricap = {
  sm: 3,
  md: 6,
  lg: 10,
  tam: 999,
} as const;

/**
 * Tipografi. Başlıklarda karakterli grotesk, sayısal veride tabular monospace.
 * Rakamların hizalanması hem okunurluk hem "ölçü aleti" hissi verir.
 */
export const tipografi = {
  aileler: {
    baslik: 'Inter_600SemiBold',
    govde: 'Inter_400Regular',
    govdeVurgu: 'Inter_500Medium',
    sayisal: 'JetBrainsMono_500Medium',
  },
  olcek: {
    dev: { size: 34, lineHeight: 40, letterSpacing: -0.6 },
    baslik1: { size: 27, lineHeight: 34, letterSpacing: -0.4 },
    baslik2: { size: 21, lineHeight: 28, letterSpacing: -0.2 },
    baslik3: { size: 17, lineHeight: 24, letterSpacing: -0.1 },
    govde: { size: 16, lineHeight: 24, letterSpacing: 0 },
    kucuk: { size: 14, lineHeight: 20, letterSpacing: 0 },
    etiket: { size: 12, lineHeight: 16, letterSpacing: 0.3 },
  },
} as const;

/** Erişilebilirlik: dokunma hedefi asla 44 px altına inmez. */
export const dokunmaHedefi = 44;

export const gecis = {
  hizli: 140,
  normal: 220,
  yavas: 320,
} as const;

export type Renkler = typeof renkler;
export type Bosluk = typeof bosluk;
