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
  zemin: '#F6F7F5',
  yuzey: '#FFFFFF',
  yuzeyIkincil: '#EFF1EE',
  cizgi: '#DCE0DB',
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
    aksan: '#4FA79C',
    aksanAcik: '#16302D',
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

export const yaricap = {
  sm: 6,
  md: 10,
  lg: 16,
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
