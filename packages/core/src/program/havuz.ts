import { HAREKET_KATALOGU, type Hareket, type Profil } from '@made2fit/shared';
import { hacimSayilir, isinmaMi, pliometrikMi } from '../katalog/katalog';

/**
 * Sert filtreler — spec bölüm 6, aşama 4.
 * Buradan geçemeyen hareket hiçbir skorla geri gelemez. Güvenlik pazarlık konusu değildir.
 */

export interface Eleme {
  hareket_id: string;
  kural: string;
}

export interface HavuzSonucu {
  havuz: Hareket[];
  elemeler: Eleme[];
  /** Hangi kural kaç hareketi eledi — kullanıcıya "3 hareket çıkarıldı" demek için. */
  eleme_sayilari: Record<string, number>;
}

/** Teknik güveni bu değerin altındaysa yüksek teknik zorluklu hareketler elenir. */
const DUSUK_GUVEN_ESIGI = 2.5;

export function havuzHazirla(
  profil: Profil,
  katalog: readonly Hareket[] = HAREKET_KATALOGU,
): HavuzSonucu {
  const k = profil.kisitlar;
  const yasakli = new Set(k.kontrendikasyonlar);
  const yasakliPatern = new Set(k.kisitli_paternler);
  const elemeler: Eleme[] = [];

  const teknikTavani = teknikZorlukTavani(k.teknik_guveni, profil.antrenman_yasi);

  const havuz = katalog.filter((hareket) => {
    // Isınma ve süre bazlı hareketler ana havuzda değil; ayrı bloklarda yerleşir.
    if (isinmaMi(hareket) || !hacimSayilir(hareket)) {
      elemeler.push({ hareket_id: hareket.id, kural: 'ana_havuz_disi' });
      return false;
    }

    const ad = `${hareket.id} ${hareket.ad_en.toLowerCase()}`;

    // Tüm ihlaller kaydedilir, ilki değil. Kullanıcıya "neden yok" derken en anlamlı
    // gerekçeyi verebilmek için bir hareketin hangi kuralların hepsine takıldığını bilmeliyiz.
    const ihlaller: Array<[boolean, string]> = [
      [!hareket.ekipman.every((e) => k.ekipman.includes(e)), 'ekipman_yok'],
      [hareket.kontrendikasyon.some((kk) => yasakli.has(kk)), 'kontrendikasyon'],
      [yasakliPatern.has(hareket.patern), 'agriyi_artiran_patern'],
      [k.eksenel_yuk_yasak && hareket.eksenel_yuk === 'yuksek', 'eksenel_yuk_yasak'],
      [k.bas_ustu_yasak && hareket.bas_ustu, 'tavan_alcak'],
      [k.gurultu_yasak && hareket.gurultu, 'gurultu_kisiti'],
      [k.zipla_yasak && pliometrikMi(hareket), 'zipla_yasak'],
      [k.spotter_yok && hareket.spotter, 'spotter_yok'],
      [hareket.teknik_zorluk > teknikTavani, 'teknik_guven_dusuk'],
      [k.reddedilen_anahtarlar.some((anahtar) => ad.includes(anahtar)), 'kullanici_reddetti'],
    ];

    const takilanlar = ihlaller.filter(([ihlal]) => ihlal).map(([, kural]) => kural);
    for (const kural of takilanlar) elemeler.push({ hareket_id: hareket.id, kural });

    return takilanlar.length === 0;
  });

  const eleme_sayilari: Record<string, number> = {};
  for (const eleme of elemeler) {
    if (eleme.kural === 'ana_havuz_disi') continue;
    eleme_sayilari[eleme.kural] = (eleme_sayilari[eleme.kural] ?? 0) + 1;
  }

  return { havuz, elemeler, eleme_sayilari };
}

/**
 * Teknik güveni düşük kullanıcıya barbell squat yazmak, birinci haftada sakatlık üretmenin
 * en hızlı yoludur. Güven arttıkça tavan yükselir.
 */
export function teknikZorlukTavani(
  teknikGuveni: number,
  antrenmanYasi: Profil['antrenman_yasi'],
): number {
  if (teknikGuveni <= DUSUK_GUVEN_ESIGI) return antrenmanYasi === 'yeni' ? 3 : 3;
  if (teknikGuveni < 4) return 4;
  return 5;
}
