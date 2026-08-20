import {
  HACIM_GRUPLARI,
  type AntrenmanYasi,
  type HacimButcesi,
  type HacimGrubu,
  type Karar,
  type Profil,
} from '@made2fit/shared';
import { kirp } from '../profil/olcumler';

/**
 * Hacim bütçesi — spec bölüm 6, aşama 2.
 *
 * Not: toparlanma_skoru burada kullanılmaz. Skorun girdileri (uyku, stres, yaş) zaten
 * aşağıdaki çarpanlarda tek tek görünüyor; ikisini birden uygulamak aynı cezayı iki kez
 * kesmek olurdu. Skor deload sıklığında kullanılır.
 */

export interface HacimEsigi {
  baslangic: number;
  hedefAlt: number;
  hedefUst: number;
  tavan: number;
  haftalikArtis: number;
}

export const TABAN_HACIM: Record<AntrenmanYasi, HacimEsigi> = {
  yeni: { baslangic: 8, hedefAlt: 10, hedefUst: 14, tavan: 16, haftalikArtis: 0.5 },
  erken: { baslangic: 10, hedefAlt: 12, hedefUst: 18, tavan: 20, haftalikArtis: 1 },
  orta: { baslangic: 12, hedefAlt: 14, hedefUst: 20, tavan: 22, haftalikArtis: 1.5 },
  ileri: { baslangic: 14, hedefAlt: 16, hedefUst: 22, tavan: 25, haftalikArtis: 2 },
  kidemli: { baslangic: 14, hedefAlt: 16, hedefUst: 24, tavan: 26, haftalikArtis: 2 },
};

/** Hiçbir grup bunun altına inmez: altında uyaran değil gürültü olur. */
const MUTLAK_TABAN = 2;

/** Isınma payı ve set başına ortalama süre (çalışma + dinlenme). */
const ISINMA_DAKIKA = 8;
const SET_DAKIKA = 2.7;

/**
 * Bir set yalnızca birincil kasa yazılmaz: bileşik hareketin ikincil kasları da uyaran alır.
 * Çözücü ikincil kaslara 0,5 kredi verir; ortalama bir programda bir fiziksel set yaklaşık
 * 1,55 "sayılan set" üretir. Bütçe sayılan set cinsindendir, bu yüzden seans kapasitesiyle
 * karşılaştırırken bu kredi hesaba katılır. Aksi halde bütçe hiçbir zaman tutmaz.
 */
const SAYILAN_SET_KREDISI = 1.55;

export function seansBasinaSet(seansDakika: number): number {
  const calisma = Math.max(0, seansDakika - ISINMA_DAKIKA);
  return Math.max(6, Math.floor(calisma / SET_DAKIKA));
}

export interface HacimSecenekleri {
  /** Beslenme motorundan gelen açık yüzdesi; %20 üstü hacmi kısar. */
  kaloriAcigiYuzdesi?: number;
  /** Program haftası; ilerledikçe taban hedefe doğru yükselir. */
  hafta?: number;
}

export interface Kapasite {
  /** Seansa fiilen sığan fiziksel set sayısı. */
  direkt_set: number;
  /** İkincil kas kredisi dahil, bütçeyle karşılaştırılabilir sayılan set sayısı. */
  sayilan_set: number;
}

export interface HacimSonucu {
  butce: HacimButcesi;
  kapasite: Kapasite;
  kararlar: Karar[];
}

interface Duzeltme {
  kural: string;
  carpan: number;
  soruId: string;
  aciklama: string;
  /** Yalnızca bu gruplara uygulanır; boşsa hepsine. */
  gruplar?: HacimGrubu[];
}

export function hacimButcesiHesapla(
  profil: Profil,
  secenekler: HacimSecenekleri = {},
): HacimSonucu {
  const esik = TABAN_HACIM[profil.antrenman_yasi];
  const hafta = Math.max(1, secenekler.hafta ?? 1);

  // Haftalar ilerledikçe taban, hedef aralığın altına doğru tırmanır.
  const taban = Math.min(esik.hedefUst, esik.baslangic + esik.haftalikArtis * (hafta - 1));

  const duzeltmeler = duzeltmeleriTopla(profil, secenekler);

  const hamButce = {} as Record<HacimGrubu, number>;
  for (const grup of HACIM_GRUPLARI) {
    let deger = taban;
    for (const d of duzeltmeler) {
      if (!d.gruplar || d.gruplar.includes(grup)) deger *= d.carpan;
    }
    hamButce[grup] = deger;
  }

  const direkt_set = profil.gun_sayisi * seansBasinaSet(profil.seans_dakika);
  const kapasite: Kapasite = {
    direkt_set,
    sayilan_set: Math.round(direkt_set * SAYILAN_SET_KREDISI),
  };
  const olcekli = kapasiteyeSigdir(hamButce, kapasite.sayilan_set, esik.tavan);

  return {
    butce: olcekli,
    kapasite,
    kararlar: duzeltmeleriKararaCevir(duzeltmeler, profil),
  };
}

function duzeltmeleriTopla(profil: Profil, secenekler: HacimSecenekleri): Duzeltme[] {
  const duzeltmeler: Duzeltme[] = [];

  if (profil.uyku_saati < 6) {
    duzeltmeler.push({
      kural: 'uyku_kisa',
      carpan: 0.88,
      soruId: 'Y1',
      aciklama: 'Gecede 6 saatin altında uyuduğun için haftalık set sayısını %12 düşürdüm.',
    });
  }

  if (profil.stres_seviyesi >= 8) {
    duzeltmeler.push({
      kural: 'stres_yuksek',
      carpan: 0.9,
      soruId: 'Y6',
      aciklama: 'Stres seviyen yüksek; toparlanmaya alan bırakmak için hacmi %10 düşürdüm.',
    });
  }

  if (profil.yas > 50) {
    duzeltmeler.push({
      kural: 'yas_50_ustu',
      carpan: 0.9,
      soruId: 'K1',
      aciklama: 'Toparlanma süresi yaşla uzuyor; haftalık hacmi %10 daha ölçülü tuttum.',
    });
  }

  const acik = secenekler.kaloriAcigiYuzdesi ?? 0;
  if (acik > 20) {
    duzeltmeler.push({
      kural: 'kalori_acigi_yuksek',
      carpan: 0.9,
      soruId: 'H1',
      aciklama: 'Kalori açığın yüksek olduğu için antrenman hacmini %10 düşürdüm.',
    });
  }

  if (profil.hedef_vektoru.oncelikli_bolgeler.length > 0) {
    duzeltmeler.push({
      kural: 'oncelikli_bolge',
      carpan: 1.25,
      soruId: 'H6',
      aciklama: 'Öncelik verdiğin bölgelere haftalık set sayısını %25 fazladan ayırdım.',
      gruplar: profil.hedef_vektoru.oncelikli_bolgeler,
    });
  }

  const memnun = profil.hedef_vektoru.memnun_bolgeler.filter(
    (g) => !profil.hedef_vektoru.oncelikli_bolgeler.includes(g),
  );
  if (memnun.length > 0) {
    duzeltmeler.push({
      kural: 'memnun_bolge_koruma',
      carpan: 0.8,
      soruId: 'H7',
      aciklama: 'Halinden memnun olduğun bölgeleri koruma hacminde tuttum, zaman kazandın.',
      gruplar: memnun,
    });
  }

  if (profil.kisitlar.kisitli_hacim_gruplari.length > 0) {
    duzeltmeler.push({
      kural: 'aktif_sakatlik',
      carpan: 0.6,
      soruId: 'S8',
      aciklama: 'Ağrı bildirdiğin bölgeye binen haftalık yükü %40 azalttım.',
      gruplar: profil.kisitlar.kisitli_hacim_gruplari,
    });
  }

  return duzeltmeler;
}

/**
 * Bütçeyi seans kapasitesine sığdırır. Ölçekleme oransaldır: öncelik farkları korunur.
 * Taban sınırına takılan gruplar sabitlenir, kalan kapasite diğerlerine dağıtılır.
 */
function kapasiteyeSigdir(
  ham: Record<HacimGrubu, number>,
  kapasite: number,
  tavan: number,
): HacimButcesi {
  const sonuc = {} as HacimButcesi;
  const toplam = HACIM_GRUPLARI.reduce((t, g) => t + ham[g], 0);
  const olcek = toplam > kapasite ? kapasite / toplam : 1;

  for (const grup of HACIM_GRUPLARI) {
    sonuc[grup] = Math.round(kirp(ham[grup] * olcek, MUTLAK_TABAN, tavan));
  }
  return sonuc;
}

function duzeltmeleriKararaCevir(duzeltmeler: Duzeltme[], profil: Profil): Karar[] {
  return duzeltmeler.map((d, i) => ({
    id: `hacim-${i}-${d.kural}`,
    entity_tipi: 'hacim' as const,
    entity_id: d.gruplar ? d.gruplar.join(',') : 'tum_gruplar',
    kurallar: [d.kural],
    girdiler: [{ soru_id: d.soruId, deger: girdiDegeri(d.kural, profil) }],
    aciklama_tr: d.aciklama,
  }));
}

function girdiDegeri(kural: string, profil: Profil): string {
  switch (kural) {
    case 'uyku_kisa':
      return `${profil.uyku_saati} saat`;
    case 'stres_yuksek':
      return `${profil.stres_seviyesi}/10`;
    case 'yas_50_ustu':
      return `${profil.yas} yaş`;
    case 'oncelikli_bolge':
      return profil.hedef_vektoru.oncelikli_bolgeler.join(', ');
    case 'memnun_bolge_koruma':
      return profil.hedef_vektoru.memnun_bolgeler.join(', ');
    case 'aktif_sakatlik':
      return profil.kisitlar.kisitli_hacim_gruplari.join(', ');
    default:
      return '';
  }
}
