import { turkceNormalize } from '../tanima/tanima';

/**
 * Öğün planlama, kaydırmalı deste ve alışveriş listesi — spec bölüm 10, plan F8.
 *
 * Planlama motoru bir KISIT PROBLEMİDİR, AI serbest yazımı değil. Deste açmak bir
 * veritabanı sorgusudur; hiçbir aşamada model çağrılmaz. Bu hem maliyet hem tutarlılık
 * kararı: aynı kısıtlar aynı desteyi üretir.
 *
 * Beslenme planlarının terk edilme sebebi neredeyse her zaman aynı: "canım onu istemiyor."
 * Makro kilidi bunu çözer — kullanıcı özgürlük hisseder, plan sağlam kalır.
 */

export type Reyon =
  'manav' | 'kasap' | 'balikci' | 'sarkuteri' | 'kuru_gida' | 'firin' | 'dondurulmus' | 'diger';

export interface Malzeme {
  ad: string;
  gram: number;
  reyon: Reyon;
}

export interface Makrolar {
  kalori: number;
  protein_g: number;
  yag_g: number;
  karbonhidrat_g: number;
  lif_g: number;
}

export interface Tarif {
  id: string;
  ad: string;
  malzemeler: Malzeme[];
  makrolar: Makrolar;
  /** 1 (ucuz) - 4 (pahalı). B8 bütçe kısıtıyla eşleşir. */
  maliyet_kademesi: number;
  hazirlik_dakika: number;
  etiketler: string[];
  adimlar_tr: string[];
  /**
   * Et, tavuk ve yumurta içeren tariflerin tamamı gıda güvenliği için elle kontrol edilir.
   * Kontrolden geçmemiş tarif kullanıcıya asla gösterilmez.
   */
  insan_kontrollu: boolean;
}

export interface OgunKisitlari {
  /** B9 — malzeme kesinlikle geçemez. */
  alerjiler: string[];
  /** B10 — laktoz, gluten, FODMAP. */
  intoleranslar: string[];
  /** B11 — helal, vejetaryen, vegan. */
  dini_etik: string[];
  /** B13 — havuzdan çıkarılır, yumuşak filtre. */
  sevmedikleri: string[];
  /** B14 — haftada en az iki kez plana dahil edilir. */
  vazgecemedikleri: string[];
  /** B8 — öğün başına maliyet tavanı (1-4). */
  butce_kademesi: number;
  /** B7 — tarif karmaşıklık tavanı. */
  maks_hazirlik_dakika: number;
  /** B5 — "ailem" ise menü değil porsiyon önerilir. */
  kim_pisiriyor: 'kendim' | 'ailem' | 'disaridan';
  /** B12 — öğün penceresi iftar-sahur. */
  ramazan: boolean;
}

/** Etiket bazlı sert eşlemeler. */
const ETIKET_KISITLARI: Record<string, { gerekli?: string; yasak?: string }> = {
  vegan: { gerekli: 'vegan' },
  vejetaryen: { gerekli: 'vejetaryen' },
  helal: { yasak: 'domuz' },
  pesketaryen: { yasak: 'et' },
  laktoz: { yasak: 'laktozlu' },
  gluten: { yasak: 'glutenli' },
  fodmap: { yasak: 'yuksek_fodmap' },
};

/** Gıda güvenliği: bu malzemeleri içeren tarif elle kontrol edilmeden gösterilmez. */
const RISKLI_MALZEMELER = ['tavuk', 'et', 'kiyma', 'yumurta', 'balik', 'somon', 'hamsi', 'kofte'];

export function tarifleriFiltrele(tarifler: readonly Tarif[], kisitlar: OgunKisitlari): Tarif[] {
  return tarifler.filter((tarif) => {
    // --- Gıda güvenliği: en sert kapı ---
    const riskli = tarif.malzemeler.some((m) =>
      RISKLI_MALZEMELER.some((r) => turkceNormalize(m.ad).includes(r)),
    );
    if (riskli && !tarif.insan_kontrollu) return false;

    // --- B9 alerji: malzeme kesinlikle geçemez ---
    for (const alerjen of kisitlar.alerjiler) {
      const normal = turkceNormalize(alerjen);
      const malzemede = tarif.malzemeler.some((m) => turkceNormalize(m.ad).includes(normal));
      const etikette = tarif.etiketler.some((e) => turkceNormalize(e).includes(normal));
      if (malzemede || etikette) return false;
    }

    // --- B11 dini/etik ve B10 intolerans ---
    for (const kisit of [...kisitlar.dini_etik, ...kisitlar.intoleranslar]) {
      const kural = ETIKET_KISITLARI[turkceNormalize(kisit)];
      if (!kural) continue;
      if (kural.gerekli && !tarif.etiketler.includes(kural.gerekli)) return false;
      if (kural.yasak && tarif.etiketler.includes(kural.yasak)) return false;
    }

    // --- B8 bütçe ---
    if (tarif.maliyet_kademesi > kisitlar.butce_kademesi) return false;

    // --- B7 pişirme süresi ---
    if (tarif.hazirlik_dakika > kisitlar.maks_hazirlik_dakika) return false;

    // --- B13 sevmedikleri (yumuşak filtre) ---
    for (const sevmedigi of kisitlar.sevmedikleri) {
      const normal = turkceNormalize(sevmedigi);
      if (
        tarif.malzemeler.some((m) => turkceNormalize(m.ad).includes(normal)) ||
        turkceNormalize(tarif.ad).includes(normal)
      ) {
        return false;
      }
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Öğün hedefleri
// ---------------------------------------------------------------------------

export interface OgunHedefi {
  /** Motorun Türkçe adı — iz ve çeviremediğimiz yerde yedek. */
  ad: string;
  /** Öğün adının dilden bağımsız kodu; görünen ad sözlükte çözülür. */
  kod: string;
  hedef: Makrolar;
}

/** Normal gün ve Ramazan günü için öğün dağılım oranları. */
const NORMAL_DAGILIM: Record<number, Array<{ ad: string; kod: string; oran: number }>> = {
  1: [{ ad: 'Ana öğün', kod: 'ana_ogun', oran: 1 }],
  2: [
    { ad: 'Öğle', kod: 'ogle', oran: 0.45 },
    { ad: 'Akşam', kod: 'aksam', oran: 0.55 },
  ],
  3: [
    { ad: 'Kahvaltı', kod: 'kahvalti', oran: 0.25 },
    { ad: 'Öğle', kod: 'ogle', oran: 0.35 },
    { ad: 'Akşam', kod: 'aksam', oran: 0.4 },
  ],
  4: [
    { ad: 'Kahvaltı', kod: 'kahvalti', oran: 0.22 },
    { ad: 'Öğle', kod: 'ogle', oran: 0.3 },
    { ad: 'Ara öğün', kod: 'ara_ogun', oran: 0.13 },
    { ad: 'Akşam', kod: 'aksam', oran: 0.35 },
  ],
  5: [
    { ad: 'Kahvaltı', kod: 'kahvalti', oran: 0.2 },
    { ad: 'Ara öğün', kod: 'ara_ogun', oran: 0.1 },
    { ad: 'Öğle', kod: 'ogle', oran: 0.28 },
    { ad: 'Ara öğün 2', kod: 'ara_ogun_2', oran: 0.1 },
    { ad: 'Akşam', kod: 'aksam', oran: 0.32 },
  ],
};

/** Ramazan: öğün penceresi iftar-sahur arasına sıkışır, iftar en büyük öğündür. */
const RAMAZAN_DAGILIM: Array<{ ad: string; kod: string; oran: number }> = [
  { ad: 'Sahur', kod: 'sahur', oran: 0.3 },
  { ad: 'İftar', kod: 'iftar', oran: 0.45 },
  { ad: 'İftar sonrası', kod: 'iftar_sonrasi', oran: 0.25 },
];

export function ogunHedefleriniBol(
  gunluk: Makrolar,
  ogunSayisi: number,
  ramazan: boolean,
): OgunHedefi[] {
  const dagilim = ramazan
    ? RAMAZAN_DAGILIM
    : (NORMAL_DAGILIM[Math.min(5, Math.max(1, ogunSayisi))] ?? NORMAL_DAGILIM[3]!);

  return dagilim.map((ogun) => ({
    /** Motorun Türkçe adı — iz ve yedek. */
    ad: ogun.ad,
    /** Öğün adının dilden bağımsız kodu; ad sözlükte çözülür. */
    kod: ogun.kod,
    hedef: {
      kalori: Math.round(gunluk.kalori * ogun.oran),
      protein_g: Math.round(gunluk.protein_g * ogun.oran),
      yag_g: Math.round(gunluk.yag_g * ogun.oran),
      karbonhidrat_g: Math.round(gunluk.karbonhidrat_g * ogun.oran),
      lif_g: Math.round(gunluk.lif_g * ogun.oran),
    },
  }));
}

// ---------------------------------------------------------------------------
// Makro kilidi
// ---------------------------------------------------------------------------

/** Destedeki her tarif öğün hedefinin bu oran içinde kalır. */
const MAKRO_TOLERANSI = 0.08;
/** Protein hedefin bu oranının altına düşemez: kas koruması pazarlık konusu değil. */
const PROTEIN_ALT_ORANI = 0.7;

/**
 * Öğün hedefi sabit; destedeki her tarif ±%8 içinde. Kullanıcı ne seçerse günlük toplam
 * bozulmaz — özgürlük hissi burada, planın sağlamlığı da burada.
 *
 * Bu kontrol tarifi OLDUĞU GİBİ değerlendirir. Porsiyonla ölçeklenmiş hâli için
 * `porsiyonKatsayisi` kullanılır.
 */
export function makroKilidi(tarif: Tarif, hedef: Makrolar): boolean {
  const kaloriFarki = Math.abs(tarif.makrolar.kalori - hedef.kalori) / Math.max(1, hedef.kalori);
  if (kaloriFarki > MAKRO_TOLERANSI) return false;

  // Kalori tutup protein çökerse öğün "aynı" değildir.
  return tarif.makrolar.protein_g >= hedef.protein_g * PROTEIN_ALT_ORANI;
}

/** Porsiyon bu aralığın dışına çıkarsa tabak gerçekçi olmaktan çıkar. */
const MIN_PORSIYON = 0.5;
const MAKS_PORSIYON = 2.5;

/**
 * Bir tarifin hedefe ulaşması için gereken porsiyon katsayısı.
 *
 * Tek bir tarif nadiren 950 kcal'lık bir öğünü olduğu gibi karşılar; gerçek mutfakta
 * değişen şey tarif değil PORSİYONDUR. Katsayı çeyrek porsiyona yuvarlanır — "1,37 porsiyon"
 * mutfakta ölçülemez, "1,25 porsiyon" ölçülebilir.
 *
 * Uygun bir katsayı yoksa null döner; tarif desteye girmez.
 */
export function porsiyonKatsayisi(tarif: Tarif, hedef: Makrolar): number | null {
  if (tarif.makrolar.kalori <= 0) return null;

  const ham = hedef.kalori / tarif.makrolar.kalori;
  const katsayi = Math.round(ham * 4) / 4;

  if (katsayi < MIN_PORSIYON || katsayi > MAKS_PORSIYON) return null;

  const olcekli = makrolariOlcekle(tarif.makrolar, katsayi);
  const kaloriFarki = Math.abs(olcekli.kalori - hedef.kalori) / Math.max(1, hedef.kalori);
  if (kaloriFarki > MAKRO_TOLERANSI) return null;

  return olcekli.protein_g >= hedef.protein_g * PROTEIN_ALT_ORANI ? katsayi : null;
}

export function makrolariOlcekle(makrolar: Makrolar, katsayi: number): Makrolar {
  return {
    kalori: Math.round(makrolar.kalori * katsayi),
    protein_g: Math.round(makrolar.protein_g * katsayi * 10) / 10,
    yag_g: Math.round(makrolar.yag_g * katsayi * 10) / 10,
    karbonhidrat_g: Math.round(makrolar.karbonhidrat_g * katsayi * 10) / 10,
    lif_g: Math.round(makrolar.lif_g * katsayi * 10) / 10,
  };
}

/** Porsiyonla ölçeklenmiş tarif; malzeme gramları da katsayıyla çarpılır. */
export function tarifiOlcekle(tarif: Tarif, katsayi: number): OlcekliTarif {
  return {
    ...tarif,
    porsiyon_katsayisi: katsayi,
    makrolar: makrolariOlcekle(tarif.makrolar, katsayi),
    malzemeler: tarif.malzemeler.map((m) => ({ ...m, gram: Math.round(m.gram * katsayi) })),
  };
}

export interface OlcekliTarif extends Tarif {
  /** 1 = tarifteki porsiyon. 1,5 = bir buçuk porsiyon. */
  porsiyon_katsayisi: number;
}

// ---------------------------------------------------------------------------
// Kaydırmalı deste
// ---------------------------------------------------------------------------

/** Sonsuz kaydırma yok: deste biter, kullanıcı karar verir. */
const DESTE_TAVANI = 15;
const DESTE_TABANI = 12;

export interface DesteGirdisi {
  tarifler: readonly Tarif[];
  hedef: Makrolar;
  kisitlar: OgunKisitlari;
  /** Buzdolabı envanteri; verilirse yalnızca yapılabilenler gösterilir. */
  envanter?: readonly string[];
}

export interface Deste {
  kartlar: OlcekliTarif[];
  /** 'menu' | 'porsiyon' — B5 "ailem" ise menü dayatılmaz. */
  mod: 'menu' | 'porsiyon';
  mesaj: string;
  eksik_malzeme_onerisi: Array<{ malzeme: string; acilan_tarif: number }>;
  /** Deste bir veritabanı sorgusudur; AI çağrısı yapılmaz. */
  ai_cagrisi: false;
}

export function desteHazirla(girdi: DesteGirdisi): Deste {
  const uygunTarifler = tarifleriFiltrele(girdi.tarifler, girdi.kisitlar);

  // Makro kilidi porsiyonla tutturulur: tarif sabit, porsiyon değişir.
  const makroUyanlar = uygunTarifler
    .map((tarif) => {
      const katsayi = porsiyonKatsayisi(tarif, girdi.hedef);
      return katsayi === null ? null : tarifiOlcekle(tarif, katsayi);
    })
    .filter((t): t is OlcekliTarif => t !== null);

  const envanterli =
    girdi.envanter === undefined
      ? makroUyanlar
      : makroUyanlar.filter((t) => tarifYapilabilir(t, girdi.envanter!));

  // B14: vazgeçemediği yiyecek destede öne alınır.
  const siralanmis = [...envanterli].sort((a, b) => {
    const aVazgecilmez = vazgecilmezMi(a, girdi.kisitlar.vazgecemedikleri) ? 1 : 0;
    const bVazgecilmez = vazgecilmezMi(b, girdi.kisitlar.vazgecemedikleri) ? 1 : 0;
    if (aVazgecilmez !== bVazgecilmez) return bVazgecilmez - aVazgecilmez;
    return a.id.localeCompare(b.id, 'tr');
  });

  const kartlar = siralanmis.slice(0, DESTE_TAVANI);
  const mod = girdi.kisitlar.kim_pisiriyor === 'ailem' ? 'porsiyon' : 'menu';

  if (kartlar.length === 0) {
    const oneriler = eksikMalzemeOner(makroUyanlar, girdi.envanter ?? []);
    return {
      kartlar: [],
      mod,
      mesaj:
        oneriler.length > 0
          ? `Dolabındakilerle bu öğün için seçenek çıkmıyor. ` +
            `${oneriler
              .slice(0, 3)
              .map((o) => o.malzeme)
              .join(', ')} eklersen ${oneriler[0]!.acilan_tarif} seçenek açılıyor.`
          : 'Bu öğün için uygun tarif bulunamadı. Kısıtlarını gözden geçirebiliriz.',
      eksik_malzeme_onerisi: oneriler,
      ai_cagrisi: false,
    };
  }

  return {
    kartlar,
    mod,
    mesaj:
      mod === 'porsiyon'
        ? 'Bugün ne pişti? Ev yemeğini seç, sana porsiyon ve tamamlayıcı önerelim — menü dayatmıyoruz.'
        : kartlar.length < DESTE_TABANI
          ? `${kartlar.length} seçenek var. Hepsi günlük toplamını bozmuyor.`
          : `${kartlar.length} seçenek. Hangisini seçersen seç, günlük toplamın aynı kalıyor.`,
    eksik_malzeme_onerisi: [],
    ai_cagrisi: false,
  };
}

function vazgecilmezMi(tarif: Tarif, vazgecemedikleri: readonly string[]): boolean {
  return vazgecemedikleri.some((v) => {
    const normal = turkceNormalize(v);
    return (
      turkceNormalize(tarif.ad).includes(normal) ||
      tarif.malzemeler.some((m) => turkceNormalize(m.ad).includes(normal))
    );
  });
}

function tarifYapilabilir(tarif: Tarif, envanter: readonly string[]): boolean {
  const normalEnvanter = envanter.map(turkceNormalize);
  return tarif.malzemeler.every((m) =>
    normalEnvanter.some(
      (e) => e.includes(turkceNormalize(m.ad)) || turkceNormalize(m.ad).includes(e),
    ),
  );
}

/** Hangi malzeme eklenirse en çok tarif açılır — tek dokunuşla alışveriş listesine. */
function eksikMalzemeOner(
  tarifler: readonly Tarif[],
  envanter: readonly string[],
): Array<{ malzeme: string; acilan_tarif: number }> {
  const normalEnvanter = envanter.map(turkceNormalize);
  const sayac = new Map<string, number>();

  for (const tarif of tarifler) {
    const eksikler = tarif.malzemeler.filter(
      (m) => !normalEnvanter.some((e) => e.includes(turkceNormalize(m.ad))),
    );
    // Tek malzeme eksikse o malzeme en değerli öneridir.
    if (eksikler.length === 0) continue;
    for (const eksik of eksikler) {
      sayac.set(eksik.ad, (sayac.get(eksik.ad) ?? 0) + 1);
    }
  }

  return [...sayac.entries()]
    .map(([malzeme, acilan_tarif]) => ({ malzeme, acilan_tarif }))
    .sort((a, b) =>
      a.acilan_tarif !== b.acilan_tarif
        ? b.acilan_tarif - a.acilan_tarif
        : a.malzeme.localeCompare(b.malzeme, 'tr'),
    )
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// Kaydırma öğrenmesi
// ---------------------------------------------------------------------------

export interface Ogrenme {
  sevilen: Record<string, number>;
  sevilmeyen: Record<string, number>;
  /** Üç kez reddedilen malzeme B13'e önerilir. */
  sevmediklerine_ekle?: string[];
}

export interface Kaydirma {
  tarif: Tarif;
  yon: 'saga' | 'sola';
}

/** Üç kez sola kaydırılan malzeme artık tercih değil, kısıt sayılır. */
const SEVMEME_ESIGI = 3;

export function kaydirmaOgren(kaydirma: Kaydirma, mevcut: Ogrenme): Ogrenme {
  const sevilen = { ...mevcut.sevilen };
  const sevilmeyen = { ...mevcut.sevilmeyen };

  for (const malzeme of kaydirma.tarif.malzemeler) {
    const hedef = kaydirma.yon === 'saga' ? sevilen : sevilmeyen;
    hedef[malzeme.ad] = (hedef[malzeme.ad] ?? 0) + 1;
  }

  const sevmediklerine_ekle = Object.entries(sevilmeyen)
    .filter(([, sayi]) => sayi >= SEVMEME_ESIGI)
    .map(([malzeme]) => malzeme)
    .sort((a, b) => a.localeCompare(b, 'tr'));

  return sevmediklerine_ekle.length > 0
    ? { sevilen, sevilmeyen, sevmediklerine_ekle }
    : { sevilen, sevilmeyen };
}

// ---------------------------------------------------------------------------
// Alışveriş listesi
// ---------------------------------------------------------------------------

export interface AlisverisKalemi {
  ad: string;
  gram: number;
  reyon: Reyon;
}

export interface AlisverisListesi {
  kalemler: AlisverisKalemi[];
  /** Markette dolaşma sırasına göre gruplanır. */
  reyonlar: Record<string, AlisverisKalemi[]>;
}

const REYON_SIRASI: Reyon[] = [
  'manav',
  'kasap',
  'balikci',
  'sarkuteri',
  'firin',
  'kuru_gida',
  'dondurulmus',
  'diger',
];

export function alisverisListesi(
  tarifler: readonly Tarif[],
  envanter: readonly string[] = [],
): AlisverisListesi {
  const normalEnvanter = envanter.map(turkceNormalize);
  const toplam = new Map<string, AlisverisKalemi>();

  for (const tarif of tarifler) {
    for (const malzeme of tarif.malzemeler) {
      // Dolapta varsa listeye girmez.
      if (normalEnvanter.some((e) => e.includes(turkceNormalize(malzeme.ad)))) continue;

      const mevcut = toplam.get(malzeme.ad);
      toplam.set(
        malzeme.ad,
        mevcut
          ? { ...mevcut, gram: mevcut.gram + malzeme.gram }
          : { ad: malzeme.ad, gram: malzeme.gram, reyon: malzeme.reyon },
      );
    }
  }

  const kalemler = [...toplam.values()].sort(
    (a, b) =>
      REYON_SIRASI.indexOf(a.reyon) - REYON_SIRASI.indexOf(b.reyon) ||
      a.ad.localeCompare(b.ad, 'tr'),
  );

  const reyonlar: Record<string, AlisverisKalemi[]> = {};
  for (const kalem of kalemler) {
    (reyonlar[kalem.reyon] ??= []).push(kalem);
  }

  return { kalemler, reyonlar };
}
