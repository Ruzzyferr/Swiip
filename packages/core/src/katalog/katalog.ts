import {
  aramaAnahtari,
  HAREKET_KATALOGU,
  type Ekipman,
  type HacimGrubu,
  type Hareket,
  type KasGrubu,
  type Kontrendikasyon,
  type YukReferansi,
} from '@made2fit/shared';

/**
 * Hareket kataloğuna erişim.
 * Katalog derlenmiş bir sabittir (scripts/hareketleri-derle.mjs); çalışma anında değişmez.
 */

/**
 * Kas grubu -> hacim bütçesi grubu.
 * Omuz başları tek bütçede toplanır; trapez ve bel sırt bütçesine, önkol biceps bütçesine yazılır.
 * Aksi hâlde küçük kaslar için ayrı bütçe tutmak gerekir ve toplam hacim şişer.
 */
const HACIM_ESLEME: Record<KasGrubu, HacimGrubu> = {
  gogus: 'gogus',
  sirt: 'sirt',
  trapez: 'sirt',
  bel: 'sirt',
  on_omuz: 'omuz',
  yan_omuz: 'omuz',
  arka_omuz: 'omuz',
  omuz: 'omuz',
  biceps: 'biceps',
  onkol: 'biceps',
  triceps: 'triceps',
  karin: 'karin',
  kalca: 'kalca',
  quadriceps: 'quadriceps',
  hamstring: 'hamstring',
  baldir: 'baldir',
};

export function hacimGrubu(kas: KasGrubu): HacimGrubu {
  return HACIM_ESLEME[kas];
}

let dizin: Map<string, Hareket> | undefined;

export function katalogDizini(): Map<string, Hareket> {
  if (!dizin) {
    dizin = new Map(HAREKET_KATALOGU.map((h) => [h.id, h]));
  }
  return dizin;
}

export function hareketBul(id: string): Hareket | undefined {
  return katalogDizini().get(id);
}

let adDizini: Map<string, Hareket> | undefined;

/**
 * Ada göre hareket dizini.
 *
 * Katalog kimlikleri İngilizce slug ("ab-wheel"); kullanıcı ise hareketi Türkçe adıyla
 * sorar ("karın tekerleği"). Kimliğe bakan bir arama bu soruyu hiçbir zaman karşılamaz.
 *
 * Anahtarlar şapkasız katlanıyor, çünkü kullanıcı "karin tekerlegi" de yazar.
 */
function adaGoreDizin(): Map<string, Hareket> {
  if (!adDizini) {
    adDizini = new Map();
    for (const hareket of HAREKET_KATALOGU) {
      adDizini.set(aramaAnahtari(hareket.id), hareket);
      adDizini.set(aramaAnahtari(hareket.ad_tr), hareket);
      if (hareket.ad_en) adDizini.set(aramaAnahtari(hareket.ad_en), hareket);
    }
  }
  return adDizini;
}

/**
 * Hareketi adıyla bulur. Kimlik, Türkçe ad ve İngilizce ad kabul edilir.
 *
 * **Kısmi eşleşme yok.** "karın" onlarca harekete uyar; yanlış hareketi göstermek
 * göstermemekten kötüdür — kullanıcı yanlış hareketi yapar.
 */
export function hareketAdaGoreBul(ad: string): Hareket | undefined {
  return adaGoreDizin().get(aramaAnahtari(ad.trim()));
}

export interface ErisimKisiti {
  ekipman: readonly Ekipman[];
  kontrendikasyonlar?: readonly Kontrendikasyon[];
}

/** Hareket, kullanıcının ekipmanıyla yapılabiliyor mu. */
export function ekipmanYeterli(hareket: Hareket, ekipman: readonly Ekipman[]): boolean {
  return hareket.ekipman.every((gerekli) => ekipman.includes(gerekli));
}

/**
 * "Makine doluysa" zinciri: sırayla denenecek muadiller.
 * Ekipman veya kontrendikasyon nedeniyle yapılamayacaklar zincirden düşer.
 */
export function muadilZinciri(hareketId: string, kisit: ErisimKisiti): Hareket[] {
  const hareket = hareketBul(hareketId);
  if (!hareket) return [];

  const yasakli = new Set(kisit.kontrendikasyonlar ?? []);

  return hareket.alternatifler
    .map((id) => hareketBul(id))
    .filter((h): h is Hareket => h !== undefined)
    .filter((h) => ekipmanYeterli(h, kisit.ekipman))
    .filter((h) => !h.kontrendikasyon.some((k) => yasakli.has(k)));
}

/** Isınma ve süre bazlı hareketler hacim bütçesine girmez. */
export function hacimSayilir(hareket: Hareket): boolean {
  return hareket.isinma !== true && hareket.sure_bazli !== true;
}

export function pliometrikMi(hareket: Hareket): boolean {
  return hareket.pliometrik === true;
}

export function isinmaMi(hareket: Hareket): boolean {
  return hareket.isinma === true;
}

export function sureBazliMi(hareket: Hareket): boolean {
  return hareket.sure_bazli === true;
}

export function yukReferansi(hareket: Hareket): YukReferansi {
  return hareket.yuk_referansi;
}
