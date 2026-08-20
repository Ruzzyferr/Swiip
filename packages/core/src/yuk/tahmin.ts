import type { AntrenmanYasi, Cinsiyet, ReferansLift } from '@made2fit/shared';
import { kirp, yuvarla } from '../profil/olcumler';

/**
 * 1RM tahmini ve başlangıç yükü ataması — spec bölüm 6, aşama 5.
 * Sağlıkta muhafazakâr ol: ilk hafta hep hafif tarafta başlanır.
 * Ağır başlayıp sakatlanmak, hafif başlayıp bir hafta kaybetmekten çok daha pahalı.
 */

/** Epley tahmini 12 tekrarın üstünde hızla bozulur; girdiyi 12 ile sınırlarız. */
const EPLEY_TEKRAR_TAVANI = 12;

export function epley1rm(kg: number, tekrar: number): number {
  if (kg <= 0 || tekrar <= 0) return 0;
  if (tekrar === 1) return yuvarla(kg, 2);
  const t = Math.min(tekrar, EPLEY_TEKRAR_TAVANI);
  return yuvarla(kg * (1 + t / 30), 2);
}

/** Tekrar sayısına karşılık gelen 1RM yüzdesi (standart güç tablosu). */
const TEKRAR_TABLOSU: ReadonlyArray<readonly [number, number]> = [
  [1, 1.0],
  [2, 0.95],
  [3, 0.93],
  [4, 0.9],
  [5, 0.87],
  [6, 0.85],
  [7, 0.83],
  [8, 0.8],
  [9, 0.77],
  [10, 0.75],
  [11, 0.72],
  [12, 0.7],
  [15, 0.65],
  [20, 0.6],
  [30, 0.5],
];

export function tekrarYuzdesi(tekrar: number): number {
  const t = kirp(tekrar, 1, 30);
  const ilk = TEKRAR_TABLOSU[0]!;
  const son = TEKRAR_TABLOSU[TEKRAR_TABLOSU.length - 1]!;
  if (t <= ilk[0]) return ilk[1];
  if (t >= son[0]) return son[1];

  for (let i = 0; i < TEKRAR_TABLOSU.length - 1; i++) {
    const [t1, y1] = TEKRAR_TABLOSU[i]!;
    const [t2, y2] = TEKRAR_TABLOSU[i + 1]!;
    if (t >= t1 && t <= t2) {
      const oran = (t - t1) / (t2 - t1);
      return yuvarla(y1 + (y2 - y1) * oran, 4);
    }
  }
  return son[1];
}

export function yukYuvarla(kg: number, artis: number, taban = 0): number {
  if (artis <= 0) return Math.max(taban, yuvarla(kg, 1));
  const yuvarlanmis = Math.round(kg / artis) * artis;
  return yuvarla(Math.max(taban, yuvarlanmis), 2);
}

/**
 * e1RM bir tahmindir; en emin kullanıcıda bile ilk hafta %5 pay bırakılır.
 * Bu yüzden tablo hiçbir zaman 1,0'a ulaşmaz.
 */
const GUVEN_CARPANI: Record<number, number> = {
  1: 0.78,
  2: 0.83,
  3: 0.88,
  4: 0.92,
  5: 0.95,
};

/** Yeni başlayan teknik öğrenirken ek pay alır. */
const YAS_GUVENLIK_PAYI: Record<AntrenmanYasi, number> = {
  yeni: 0.85,
  erken: 0.92,
  orta: 1,
  ileri: 1,
  kidemli: 1,
};

export function guvenDuzeltmesi(teknikGuveni: number, antrenmanYasi: AntrenmanYasi): number {
  const yakin = kirp(Math.round(teknikGuveni), 1, 5);
  const guven = GUVEN_CARPANI[yakin] ?? 0.9;
  return yuvarla(Math.min(1, guven * YAS_GUVENLIK_PAYI[antrenmanYasi]), 4);
}

export type { ReferansLift };

/** Vücut ağırlığı katı olarak e1RM referansları (erkek). */
const REFERANS_KAT: Record<ReferansLift, Record<AntrenmanYasi, number>> = {
  squat: { yeni: 0.75, erken: 1.0, orta: 1.25, ileri: 1.6, kidemli: 1.9 },
  bench: { yeni: 0.5, erken: 0.75, orta: 1.0, ileri: 1.25, kidemli: 1.5 },
  deadlift: { yeni: 1.0, erken: 1.25, orta: 1.5, ileri: 1.9, kidemli: 2.25 },
  ohp: { yeni: 0.35, erken: 0.45, orta: 0.6, ileri: 0.75, kidemli: 0.9 },
  row: { yeni: 0.45, erken: 0.65, orta: 0.85, ileri: 1.05, kidemli: 1.25 },
};

/** Kadınlarda üst vücut farkı alt vücuttan belirgin biçimde büyüktür. */
const KADIN_ORANI: Record<ReferansLift, number> = {
  squat: 0.8,
  deadlift: 0.8,
  bench: 0.65,
  ohp: 0.65,
  row: 0.7,
};

export function referansE1rm(
  lift: ReferansLift,
  antrenmanYasi: AntrenmanYasi,
  cinsiyet: Cinsiyet,
  kiloKg: number,
): number {
  const kat = REFERANS_KAT[lift][antrenmanYasi];
  const cinsiyetOrani = cinsiyet === 'kadin' ? KADIN_ORANI[lift] : 1;
  return yuvarla(kiloKg * kat * cinsiyetOrani, 1);
}

export interface BaslangicYukuGirdisi {
  e1rm: number;
  tekrarUst: number;
  artisKg: number;
  teknikGuveni: number;
  antrenmanYasi: AntrenmanYasi;
  tabanKg?: number;
  tavanKg?: number;
  vucutAgirligi?: boolean;
}

export function baslangicYuku(girdi: BaslangicYukuGirdisi): number | null {
  if (girdi.vucutAgirligi) return null;
  if (girdi.e1rm <= 0) return null;

  const ham =
    girdi.e1rm *
    tekrarYuzdesi(girdi.tekrarUst) *
    guvenDuzeltmesi(girdi.teknikGuveni, girdi.antrenmanYasi);
  const tavanli = girdi.tavanKg !== undefined ? Math.min(ham, girdi.tavanKg) : ham;
  const yuvarlanmis = yukYuvarla(tavanli, girdi.artisKg, girdi.tabanKg ?? 0);

  // Yuvarlama tavanı aşmasın: dumbbell 12 kg ise 12,5 yazılmaz.
  if (girdi.tavanKg !== undefined && yuvarlanmis > girdi.tavanKg) {
    return yuvarla(Math.max(girdi.tabanKg ?? 0, yuvarlanmis - girdi.artisKg), 2);
  }
  return yuvarlanmis;
}
