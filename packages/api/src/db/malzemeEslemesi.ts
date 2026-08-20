import { bilesimHesapla, type BesinDegerleri } from '@made2fit/core';
import type { Tarif } from '@made2fit/core';
import { BESIN_TOHUMU } from './besinler';

/**
 * Malzeme adı → besin tablosu köprüsü ve tarif makrosu türetme (F5.6, F8.2).
 *
 * Tarifler malzemeleri günlük dille yazar ("tavuk göğsü"); besin tablosu durumu da
 * belirtir ("Tavuk göğsü, pişmiş"). Bu sözlük ikisini birleştirir.
 *
 * Neden üretim kodunda: tohumlamada tarif makroları buradan hesaplanıyor. Ürünün sözü
 * "besin değeri veritabanından gelir" ve tarif katmanı bunun istisnası olmamalı.
 *
 * ÇİĞ/PİŞMİŞ UYARISI: tarifler malzemeyi çiğ ağırlıkla yazar. 80 g makarna kuru makarnadır,
 * haşlanmış değil — aradaki fark iki buçuk kat. Eşleme hedefleri bu yüzden çiğ karşılıkları
 * gösterir ve bir test bunu zorlar.
 */

export const MALZEME_ESLEMESI: Record<string, string> = {
  yumurta: 'yumurta, haşlanmış',
  'tavuk göğsü': 'tavuk göğsü, pişmiş',
  'tavuk but': 'tavuk but, pişmiş',
  'hindi göğsü': 'hindi göğsü, pişmiş',
  kıyma: 'dana kıyma, %15 yağlı, pişmiş',
  'dana kıyma': 'dana kıyma, %15 yağlı, pişmiş',
  'kuşbaşı et': 'dana kuşbaşı, çiğ',
  'dana kuşbaşı': 'dana kuşbaşı, çiğ',
  somon: 'somon, ızgara',
  hamsi: 'hamsi, çiğ',
  sardalya: 'sardalya, konserve',
  karides: 'karides, haşlanmış',
  'ton balığı': 'ton balığı, suda',
  levrek: 'levrek, ızgara',
  süt: 'süt, yarım yağlı',
  yoğurt: 'yoğurt, yarım yağlı',
  'beyaz peynir': 'beyaz peynir, yarım yağlı',
  'kaşar peyniri': 'kaşar peyniri',
  pirinç: 'pirinç, çiğ',
  bulgur: 'bulgur, çiğ',
  'ince bulgur': 'bulgur, çiğ',
  'yulaf ezmesi': 'yulaf ezmesi, kuru',
  'kırmızı mercimek': 'kırmızı mercimek, kuru',
  'yeşil mercimek': 'yeşil mercimek, çiğ',
  'kuru fasulye': 'kuru fasulye, çiğ',
  'haşlanmış nohut': 'nohut, haşlanmış',
  'tam buğday ekmek': 'tam buğday ekmek',
  'tam buğday makarna': 'makarna, çiğ',
  zeytinyağı: 'zeytinyağı',
  tereyağı: 'tereyağı',
  'ceviz içi': 'ceviz içi',
  badem: 'badem',
  tahin: 'tahin',
  domates: 'domates',
  salatalık: 'salatalık',
  soğan: 'soğan',
  biber: 'kırmızı biber, çiğ',
  'yeşil biber': 'kırmızı biber, çiğ',
  havuç: 'havuç, çiğ',
  patates: 'patates, haşlanmış',
  patlıcan: 'patlıcan, közlenmiş',
  kabak: 'kabak, haşlanmış',
  brokoli: 'brokoli, haşlanmış',
  karnabahar: 'karnabahar, haşlanmış',
  mantar: 'mantar, pişmiş',
  marul: 'marul',
  roka: 'roka',
  ıspanak: 'ıspanak, haşlanmış',
  muz: 'muz',
  elma: 'elma',
  çilek: 'çilek',
  portakal: 'portakal',
  kinoa: 'kinoa, pişmiş',
  kefir: 'kefir',
  'lor peyniri': 'lor peyniri',
  'süzme yoğurt': 'süzme yoğurt',
  zeytin: 'siyah zeytin',
  bal: 'bal',
  sucuk: 'sucuk',
  semizotu: 'semizotu',
  pırasa: 'pırasa',
  kuskus: 'kuskus, çiğ',
  'asma yaprağı': 'asma yaprağı, salamura',
  bezelye: 'bezelye, haşlanmış',
  'haşlanmış yeşil mercimek': 'yeşil mercimek, haşlanmış',
  kekik: 'kekik, kuru',
  kereviz: 'kereviz kökü, haşlanmış',
  kimyon: 'kimyon, toz',
  limon: 'limon suyu',
  makarna: 'makarna, çiğ',
  mantı: 'mantı, çiğ',
  mısır: 'mısır, haşlanmış',
  nohut: 'nohut, çiğ',
  salça: 'domates salçası',
  'domates salçası': 'domates salçası',
  tarhana: 'tarhana, kuru',
  tarçın: 'tarçın, toz',
  'taze fasulye': 'taze fasulye, haşlanmış',
  un: 'buğday unu',
  şehriye: 'şehriye, çiğ',
  'mısır unu': 'mısır unu',
  'galeta unu': 'galeta unu',
  'kuru kayısı': 'kuru kayısı',
  'ayçiçek yağı': 'ayçiçek yağı',
  hurma: 'hurma',
  pekmez: 'pekmez',
  sarımsak: 'sarımsak',
  maydanoz: 'maydanoz',
  dereotu: 'dereotu',
  fesleğen: 'fesleğen',
  avokado: 'avokado',
  'kuzu pirzola': 'kuzu pirzola, ızgara',
  'kuzu incik': 'kuzu incik',
  'dana bonfile': 'dana bonfile, ızgara',
  çupra: 'çupra, ızgara',
  palamut: 'palamut, fırın',
  istavrit: 'istavrit tava',
  barbunya: 'barbunya pilaki',
  'antep fıstığı': 'antep fıstığı',
  fındık: 'fındık',
  'yer fıstığı': 'yer fıstığı',
  'kabak çekirdeği': 'kabak çekirdeği',
  'ay çekirdeği': 'ay çekirdeği',
  'chia tohumu': 'chia tohumu',
  'keten tohumu': 'keten tohumu',
  nar: 'nar',
  kivi: 'kivi',
  kayısı: 'kayısı',
  'taze incir': 'incir, taze',
  karpuz: 'karpuz',
  kavun: 'kavun',
  şeftali: 'şeftali',
  armut: 'armut',
  erik: 'erik',
  üzüm: 'üzüm',
  mandalina: 'mandalina',
  'kuru üzüm': 'kuru üzüm',
  'kuru incir': 'kuru incir',
  'beyaz lahana': 'beyaz lahana, çiğ',
  pancar: 'pancar, haşlanmış',
  'whey protein tozu': 'whey protein tozu',
  'yumurta akı': 'yumurta akı',
  'krem peynir': 'krem peynir',
  'labne peyniri': 'labne peyniri',
  çökelek: 'çökelek',
  'tulum peyniri': 'tulum peyniri',
  ayran: 'ayran',
  'yulaf sütü': 'yulaf sütü',
  'badem sütü': 'badem sütü, şekersiz',
  'soya sütü': 'soya sütü, şekersiz',
  karabuğday: 'karabuğday, pişmiş',
  erişte: 'erişte',
  'çavdar ekmeği': 'çavdar ekmeği',
  'kepekli ekmek': 'kepekli ekmek',
  yufka: 'yufka ekmek',
  humus: 'humus',
  'fıstık ezmesi': 'fıstık ezmesi',
  'bitter çikolata': 'bitter çikolata, %70',
  granola: 'granola',
  'yulaf kepeği': 'yulaf kepeği',
  'nar ekşisi': 'nar ekşisi',
  sumak: 'sumak',
  'pul biber': 'pul biber',
  karabiber: 'karabiber',
  nane: 'nane, kuru',
  tere: 'tere',
  sirke: 'sirke',
  hardal: 'hardal',
  turşu: 'turşu, karışık',
  'mısır gevreği': 'mısır gevreği, şekersiz',
  'hindi füme': 'hindi füme',
  haydari: 'haydari',
  cacık: 'cacık',
  kaju: 'kaju',
  bamya: 'bamya yemeği',
  enginar: 'zeytinyağlı enginar',
  bakla: 'zeytinyağlı bakla',
  'tavuk kanat': 'tavuk kanat, fırın',
  'protein bar': 'protein bar',
};

/** Ad → 100 gram bileşimi. Sözlükten geçer, yoksa doğrudan tabloda arar. */
const DIZIN = new Map(BESIN_TOHUMU.map((b) => [b.name_tr.toLocaleLowerCase('tr-TR'), b.per_100g]));

export function besinAra(ad: string): BesinDegerleri | undefined {
  const kucuk = ad.trim().toLocaleLowerCase('tr-TR');
  const hedef = MALZEME_ESLEMESI[kucuk];
  return (hedef ? DIZIN.get(hedef) : undefined) ?? DIZIN.get(kucuk);
}

/**
 * Tarifin toplam makrosunu malzemelerinden hesaplar.
 *
 * Toplam enerji pişirme veriminden bağımsızdır: tencerede kaybedilen su enerji taşımaz.
 * Bu yüzden verim katsayısı vermiyoruz — toplam için gereksiz, hatalı varsayım riski taşır.
 *
 * Malzemelerden biri çözülemezse `null`. Yarım hesap, kullanıcıya olduğundan düşük kalori
 * göstermek demek olurdu.
 */
export function tarifMakrolariniHesapla(tarif: Tarif): BesinDegerleri | null {
  const sonuc = bilesimHesapla(
    tarif.malzemeler.map((m) => ({ ad: m.ad, gram: m.gram })),
    besinAra,
  );

  return sonuc?.toplam ?? null;
}
