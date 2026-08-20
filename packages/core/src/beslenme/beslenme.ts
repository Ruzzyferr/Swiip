import type { BeslenmeHedefi, Cinsiyet, Hedef, Profil } from '@made2fit/shared';
import { kirp, yuvarla } from '../profil/olcumler';

/**
 * Beslenme motoru — spec bölüm 8. Tamamen deterministik.
 * Hiçbir kalori veya makro değeri LLM'den gelmez; hepsi buradaki formüllerden çıkar.
 */

/** 1 kg vücut yağının enerji karşılığı. */
const KG_BASINA_KCAL = 7700;
/** Açık hiçbir zaman TDEE'nin bu oranını geçmez — spec bölüm 8, sert tavan. */
const MAKS_ACIK_ORANI = 0.25;
/** Hormonal taban: vücut ağırlığı başına asgari yağ. */
const MIN_YAG_G_KG = 0.6;
/** Yağın hedeflenen kalori payı. */
const YAG_KALORI_PAYI = 0.25;
const LIF_G_1000KCAL = 14;
const SU_ML_KG = 35;
const ANTRENMAN_GUNU_SU_ML = 500;
/** Sağlık için mutlak alt sınır; hiçbir hedef bunun altına inmez. */
const MUTLAK_MIN_KALORI: Record<Cinsiyet, number> = { erkek: 1500, kadin: 1200 };

export interface BmrGirdisi {
  cinsiyet: Cinsiyet;
  yas: number;
  boyCm: number;
  kiloKg: number;
  yagOrani?: number;
}

export interface BmrSonucu {
  bmr: number;
  yontem: 'katch_mcardle' | 'mifflin_st_jeor';
}

export function bmrHesapla(girdi: BmrGirdisi): BmrSonucu {
  if (girdi.yagOrani !== undefined && girdi.yagOrani > 0 && girdi.yagOrani < 70) {
    const lbm = yagsizKutle(girdi.kiloKg, girdi.yagOrani);
    return { bmr: Math.max(900, yuvarla(370 + 21.6 * lbm, 0)), yontem: 'katch_mcardle' };
  }

  const sabit = girdi.cinsiyet === 'erkek' ? 5 : -161;
  const ham = 10 * girdi.kiloKg + 6.25 * girdi.boyCm - 5 * girdi.yas + sabit;
  return { bmr: Math.max(900, yuvarla(ham, 0)), yontem: 'mifflin_st_jeor' };
}

export interface VucutOlculeri {
  cinsiyet: Cinsiyet;
  yas: number;
  boyCm: number;
}

/**
 * Yağsız kütle. Yağ oranı bilinmiyorsa Deurenberg denklemiyle tahmin edilir —
 * kaba bir tahmindir, bu yüzden kullanıcıya sayı olarak gösterilmez, sadece hesapta kullanılır.
 */
export function yagsizKutle(kiloKg: number, yagOrani?: number, olculer?: VucutOlculeri): number {
  if (yagOrani !== undefined && yagOrani > 0 && yagOrani < 70) {
    return yuvarla(kiloKg * (1 - yagOrani / 100), 2);
  }
  if (!olculer) return yuvarla(kiloKg * 0.75, 2);

  const boyM = olculer.boyCm / 100;
  const bki = kiloKg / (boyM * boyM);
  const cinsiyetKatsayisi = olculer.cinsiyet === 'erkek' ? 1 : 0;
  const tahminiYag = kirp(1.2 * bki + 0.23 * olculer.yas - 10.8 * cinsiyetKatsayisi - 5.4, 5, 60);
  return yuvarla(kiloKg * (1 - tahminiYag / 100), 2);
}

/** Hedefe göre kalori yönü ve büyüklüğü. */
function kaloriFarki(hedef: Hedef, tdee: number, kiloKg: number): number {
  switch (hedef) {
    case 'yag_kaybi': {
      // Haftada vücut ağırlığının %0,75'i kadar kayıp hedeflenir.
      const haftalikKg = kiloKg * 0.0075;
      const gunluk = (haftalikKg * KG_BASINA_KCAL) / 7;
      return -Math.min(gunluk, tdee * MAKS_ACIK_ORANI);
    }
    case 'kas_kazanimi':
      return 275;
    case 'guc_artisi':
      return 200;
    case 'dayaniklilik':
    case 'genel_saglik':
    case 'durus_agri':
    case 'spora_ozel':
    case 'sakatlik_donusu':
      return 0;
  }
}

export function beslenmeHedefiHesapla(profil: Profil): BeslenmeHedefi {
  const olculer: VucutOlculeri = {
    cinsiyet: profil.cinsiyet,
    yas: profil.yas,
    boyCm: profil.boy_cm,
  };
  const { bmr, yontem } = bmrHesapla({
    ...olculer,
    kiloKg: profil.kilo_kg,
    ...(profil.vucut_yag_orani !== undefined ? { yagOrani: profil.vucut_yag_orani } : {}),
  });

  const tdee = yuvarla(bmr * profil.aktivite_carpani, 0);
  const hedef = profil.hedef_vektoru.birincil;
  const fark = kaloriFarki(hedef, tdee, profil.kilo_kg);

  const hamKalori = tdee + fark;
  const kalori = Math.max(MUTLAK_MIN_KALORI[profil.cinsiyet], yuvarla(hamKalori, 0));
  const gercekFark = kalori - tdee;

  const lbm = yagsizKutle(profil.kilo_kg, profil.vucut_yag_orani, olculer);

  // Açıkta protein yüksek tutulur: kas kaybını sınırlayan tek beslenme kaldıracı budur.
  const proteinKatsayisi = gercekFark < 0 ? 2.2 : 2.0;
  const protein_g = yuvarla(lbm * proteinKatsayisi, 0);

  const yagTabani = profil.kilo_kg * MIN_YAG_G_KG;
  const yagHedefi = (kalori * YAG_KALORI_PAYI) / 9;
  const yag_g = yuvarla(Math.max(yagTabani, yagHedefi), 0);

  const kalanKalori = kalori - protein_g * 4 - yag_g * 9;
  const karbonhidrat_g = Math.max(0, yuvarla(kalanKalori / 4, 0));

  const sonuc: BeslenmeHedefi = {
    bmr,
    tdee,
    yontem,
    kalori,
    kalori_farki: gercekFark,
    protein_g,
    yag_g,
    karbonhidrat_g,
    lif_g: yuvarla((kalori / 1000) * LIF_G_1000KCAL, 0),
    su_ml: yuvarla(
      profil.kilo_kg * SU_ML_KG + (profil.gun_sayisi > 0 ? ANTRENMAN_GUNU_SU_ML : 0),
      0,
    ),
  };

  const beklenti = profil.hedef_vektoru.aylik_beklenti_kg;
  if (beklenti !== undefined) {
    const test = gercekcilikTesti({
      kiloKg: profil.kilo_kg,
      aylikBeklentiKg: beklenti,
      hedef,
    });
    if (!test.gercekci) sonuc.uyari = test.mesaj;
  }

  return sonuc;
}

// ---------------------------------------------------------------------------
// TDEE uyum döngüsü — formül yanılır, veri yanılmaz
// ---------------------------------------------------------------------------

export interface TdeeDuzeltmeGirdisi {
  mevcutTdee: number;
  /** Dönem boyunca günlük ortalama kalori alımı. */
  ortalamaAlim: number;
  /** Dönemdeki gerçek kilo değişimi (kg). Negatif = kayıp. */
  kiloDegisimiKg: number;
  gunSayisi: number;
}

export interface TdeeDuzeltmeSonucu {
  tdee: number;
  duzeltildi: boolean;
  mesaj: string;
}

/** Tek seferde bu orandan fazla oynamaz; ölçüm gürültüsü hedefi savurmasın. */
const MAKS_TDEE_OYNAMASI = 0.15;
const ASGARI_GUN = 14;

export function tdeeDuzelt(girdi: TdeeDuzeltmeGirdisi): TdeeDuzeltmeSonucu {
  if (girdi.gunSayisi < ASGARI_GUN) {
    return {
      tdee: girdi.mevcutTdee,
      duzeltildi: false,
      mesaj: 'Düzeltme için en az iki haftalık veri gerekiyor.',
    };
  }

  // Gerçek TDEE = ortalama alım − depolanan/harcanan enerjinin günlük karşılığı.
  const gunlukEnerjiDegisimi = (girdi.kiloDegisimiKg * KG_BASINA_KCAL) / girdi.gunSayisi;
  const olculenTdee = girdi.ortalamaAlim - gunlukEnerjiDegisimi;

  // Yumuşatma: ölçüm ile mevcut tahmin arasında yarı yolda buluşulur.
  const harmanlanmis = girdi.mevcutTdee * 0.5 + olculenTdee * 0.5;
  const yeniTdee = yuvarla(
    kirp(
      harmanlanmis,
      girdi.mevcutTdee * (1 - MAKS_TDEE_OYNAMASI),
      girdi.mevcutTdee * (1 + MAKS_TDEE_OYNAMASI),
    ),
    0,
  );

  const fark = yeniTdee - girdi.mevcutTdee;
  return {
    tdee: yeniTdee,
    duzeltildi: true,
    mesaj:
      `Son ${girdi.gunSayisi} günün gerçek kilo değişimine göre günlük ihtiyacını ` +
      `${fark > 0 ? '+' : ''}${fark} kcal güncelledim. Formül yanılır, veri yanılmaz.`,
  };
}

// ---------------------------------------------------------------------------
// H10 gerçeklik testi
// ---------------------------------------------------------------------------

export interface GercekcilikGirdisi {
  kiloKg: number;
  aylikBeklentiKg: number;
  hedef: Hedef;
}

export interface GercekcilikSonucu {
  gercekci: boolean;
  onerilen_aralik: string;
  mesaj: string;
}

/** Yağ kaybında ayda vücut ağırlığının %2-4'ü korunabilir üst sınırdır. */
const AYLIK_KAYIP_ORANI = { alt: 0.02, ust: 0.04 };
/** Kas kazanımı çok daha yavaştır: ayda 0,25-0,5 kg (yeni başlayanda 1 kg'a kadar). */
const AYLIK_KAZANIM_KG = { alt: 0.25, ust: 1 };

export function gercekcilikTesti(girdi: GercekcilikGirdisi): GercekcilikSonucu {
  const beklenti = Math.abs(girdi.aylikBeklentiKg);

  if (girdi.hedef === 'kas_kazanimi' || girdi.hedef === 'guc_artisi') {
    const gercekci = beklenti <= AYLIK_KAZANIM_KG.ust;
    const aralik = `${sayiMetni(AYLIK_KAZANIM_KG.alt)}-${sayiMetni(AYLIK_KAZANIM_KG.ust)} kg`;
    return {
      gercekci,
      onerilen_aralik: aralik,
      mesaj: gercekci
        ? `Ayda ${sayiMetni(beklenti)} kg kazanım gerçekçi bir hedef.`
        : `Ayda ${sayiMetni(beklenti)} kg kas kazanımı fizyolojik olarak mümkün değil; bu hızda ` +
          `artan kilonun büyük kısmı yağ olur. Korunabilir aralık ${aralik}. Hedefini bu aralığa ` +
          `çekersek kazandığın kilo gerçekten kas olur.`,
    };
  }

  const altKg = yuvarla(girdi.kiloKg * AYLIK_KAYIP_ORANI.alt, 1);
  const ustKg = yuvarla(girdi.kiloKg * AYLIK_KAYIP_ORANI.ust, 1);
  const aralik = `${sayiMetni(altKg)}-${sayiMetni(ustKg)} kg`;
  const gercekci = beklenti <= ustKg;

  return {
    gercekci,
    onerilen_aralik: aralik,
    mesaj: gercekci
      ? `Ayda ${sayiMetni(beklenti)} kg gerçekçi ve korunabilir bir hız.`
      : `Ayda ${sayiMetni(beklenti)} kg hedefliyorsun. Senin kilonda sağlıklı ve korunabilir ` +
        `aralık ${aralik}. Daha hızlısı genelde kas kaybı, hormonal düşüş ve geri alım demek. ` +
        `Hedefini bu aralığa çekmeni öneriyoruz — daha yavaş görünür ama sonuç kalıcı olur.`,
  };
}

function sayiMetni(deger: number): string {
  return Number.isInteger(deger) ? String(deger) : String(deger).replace('.', ',');
}

// ---------------------------------------------------------------------------
// ED modu — sayı yok, porsiyon var
// ---------------------------------------------------------------------------

export interface PorsiyonRehberi {
  ozet: string;
  ogunler: string[];
  not: string;
}

/**
 * Yeme bozukluğu modunda beslenme sayıyla değil el ölçüsüyle anlatılır.
 * Hiçbir rakam görünmez: kalori, gram, yüzde, öğün sayısı — hiçbiri.
 */
export function porsiyonRehberi(hedef: BeslenmeHedefi): PorsiyonRehberi {
  const bolPorsiyon = hedef.karbonhidrat_g > hedef.protein_g * 2;

  return {
    ozet: 'Sayılar yerine el ölçüsü kullanıyoruz. Tabağını şöyle kur:',
    ogunler: [
      'Her ana öğünde bir avuç kadar protein kaynağı — et, tavuk, balık, yumurta veya baklagil.',
      bolPorsiyon
        ? 'Yanına bir yumruk kadar karbonhidrat — pilav, bulgur, ekmek veya patates.'
        : 'Yanına yarım yumruk kadar karbonhidrat — pilav, bulgur, ekmek veya patates.',
      'İki avuç kadar sebze; renkli olsun, çeşitli olsun.',
      'Bir başparmak kadar yağ — zeytinyağı, ceviz veya avokado.',
      'Susadıkça su iç; idrar renginin açık kalması iyi bir işaret.',
    ],
    not:
      'Bu bir kural listesi değil, bir çerçeve. Aç kalırsan ekle. Bugün uymadıysa yarın devam et; ' +
      'tek bir öğün hiçbir şeyi bozmaz.',
  };
}
