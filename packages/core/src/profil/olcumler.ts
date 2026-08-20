import { ANTRENMAN_YASLARI, type AntrenmanYasi } from '@made2fit/shared';
import { metin, sayi, type Cevaplar } from '../cevaplar';

/**
 * Profil ölçümleri: antrenman yaşı, toparlanma kapasitesi, aktivite çarpanı.
 * Hepsi saf fonksiyon — aynı girdi her zaman aynı çıktı.
 */

const A1_HARITA: Record<string, AntrenmanYasi> = {
  'Hiç yapmadım': 'yeni',
  '6 aydan az': 'yeni',
  '6-12 ay': 'erken',
  '1-3 yıl': 'orta',
  '3-5 yıl': 'ileri',
  '5 yıldan fazla': 'kidemli',
};

/** Antrenmansızlık eşiği: son 13 haftanın 3'ünden azı düzenli değildir. */
const ANTRENMANSIZLIK_HAFTA = 3;

export function antrenmanYasiBelirle(cevaplar: Cevaplar): AntrenmanYasi {
  const beyan = A1_HARITA[metin(cevaplar, 'A1') ?? ''] ?? 'yeni';
  const sonUcAy = sayi(cevaplar, 'A3');

  if (sonUcAy !== undefined && sonUcAy < ANTRENMANSIZLIK_HAFTA) {
    const indeks = ANTRENMAN_YASLARI.indexOf(beyan);
    return ANTRENMAN_YASLARI[Math.max(0, indeks - 1)]!;
  }
  return beyan;
}

const UYKU_PUANI: Record<string, number> = {
  '5 saatten az': 0.15,
  '5-6 saat': 0.4,
  '6-7 saat': 0.7,
  '7-8 saat': 1,
  '8 saatten fazla': 1,
};

const IS_TOPARLANMA_PUANI: Record<string, number> = {
  'Masa başı, çoğunlukla oturarak': 1,
  'Karma, biraz ayakta': 0.95,
  'Ayakta çalışıyorum': 0.88,
  'Fiziksel iş yapıyorum': 0.78,
  Çalışmıyorum: 1,
};

/** Toparlanma kapasitesi 0-1. Hacim düzeltmelerinin girdisi. */
export function toparlanmaSkoru(cevaplar: Cevaplar, yas: number): number {
  const uyku = UYKU_PUANI[metin(cevaplar, 'Y1') ?? ''] ?? 0.7;
  const kalite = normalize(sayi(cevaplar, 'Y2') ?? 5, 1, 10);
  const stres = 1 - normalize(sayi(cevaplar, 'Y6') ?? 5, 1, 10);
  const isPuani = IS_TOPARLANMA_PUANI[metin(cevaplar, 'Y4') ?? ''] ?? 0.95;
  const yasPuani = yasToparlanmaPuani(yas);

  const skor = uyku * 0.35 + kalite * 0.15 + stres * 0.25 + yasPuani * 0.15 + isPuani * 0.1;
  return yuvarla(kirp(skor, 0, 1), 3);
}

function yasToparlanmaPuani(yas: number): number {
  if (yas <= 29) return 1;
  if (yas <= 39) return 0.9;
  if (yas <= 49) return 0.8;
  if (yas <= 59) return 0.7;
  return 0.6;
}

const IS_AKTIVITE_CARPANI: Record<string, number> = {
  'Masa başı, çoğunlukla oturarak': 1.25,
  'Karma, biraz ayakta': 1.35,
  'Ayakta çalışıyorum': 1.45,
  'Fiziksel iş yapıyorum': 1.7,
  Çalışmıyorum: 1.25,
};

const ADIM_DUZELTME: Record<string, number> = {
  "3.000'den az": -0.05,
  '3.000-6.000': 0,
  '6.000-10.000': 0.04,
  "10.000'den fazla": 0.08,
  Bilmiyorum: 0,
};

/** TDEE aktivite çarpanı. Spec bölüm 8. */
export function aktiviteCarpani(cevaplar: Cevaplar, gunSayisi: number): number {
  const taban = IS_AKTIVITE_CARPANI[metin(cevaplar, 'Y4') ?? ''] ?? 1.25;
  const adim = ADIM_DUZELTME[metin(cevaplar, 'Y5') ?? ''] ?? 0;
  const antrenman = 0.03 * kirp(gunSayisi, 0, 7);

  return yuvarla(kirp(taban + adim + antrenman, 1.15, 1.9), 3);
}

export function normalize(deger: number, alt: number, ust: number): number {
  if (ust === alt) return 0;
  return kirp((deger - alt) / (ust - alt), 0, 1);
}

export function kirp(deger: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, deger));
}

export function yuvarla(deger: number, basamak: number): number {
  const carpan = 10 ** basamak;
  return Math.round(deger * carpan) / carpan;
}
