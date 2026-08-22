import {
  HACIM_GRUPLARI,
  type GunTipi,
  type HacimButcesi,
  type HacimGrubu,
  type Hareket,
  type Kapi,
  type Karar,
  type PlanlananHareket,
  type Profil,
  type SeansPlani,
  type SplitPlani,
} from '@swiip/shared';
import { hacimButcesiHesapla, type Kapasite } from '../hacim/hacim';
import { hacimGrubu, muadilZinciri, yukReferansi } from '../katalog/katalog';
import { splitSec } from '../split/split';
import { baslangicYuku, referansE1rm, type ReferansLift } from '../yuk/tahmin';
import { havuzHazirla, type HavuzSonucu } from './havuz';
import { bilesikMi, hareketSuresiDakika, semaSec } from './semalar';

/**
 * Program üretimi — spec bölüm 6'nın beş aşamasının birleştiği yer.
 * Tamamen deterministik: aynı profil her zaman aynı programı üretir.
 * AI burada hiçbir karar vermez; yalnızca üretilen gerekçeyi güzelleştirir (F3.7).
 */

/** Program uyarısının dilden bağımsız karşılığı. */
export interface ProgramUyariKodu {
  kod: string;
  degerler?: Record<string, string | number>;
}

export interface Program {
  split: SplitPlani;
  butce: HacimButcesi;
  kapasite: Kapasite;
  seanslar: SeansPlani[];
  kararlar: Karar[];
  /** Motorun Türkçe uyarıları — iz ve yedek. */
  uyarilar: string[];
  /** Uyarıların kod karşılığı; cümle sözlükte kuruluyor. */
  uyari_kodlari: ProgramUyariKodu[];
  /** ED modunda arayüz sayıları gizler; motor yine de hesaplar. */
  sayilar_gizli: boolean;
  havuz_boyutu: number;
}

export type ProgramSonucu =
  | { durum: 'uretildi'; program: Program }
  | { durum: 'engellendi'; kapilar: Kapi[]; eksik_tarama: string[] };

export interface ProgramSecenekleri {
  hafta?: number;
  kaloriAcigiYuzdesi?: number;
}

/** Gün tipine düşen hacim grupları. */
const GUN_GRUPLARI: Record<GunTipi, HacimGrubu[]> = {
  full_body: [...HACIM_GRUPLARI],
  upper: ['gogus', 'sirt', 'omuz', 'biceps', 'triceps'],
  lower: ['quadriceps', 'hamstring', 'kalca', 'baldir', 'karin'],
  push: ['gogus', 'omuz', 'triceps'],
  pull: ['sirt', 'biceps'],
  legs: ['quadriceps', 'hamstring', 'kalca', 'baldir'],
};

const LIFT_KANONIK: Record<ReferansLift, string> = {
  squat: 'barbell-squat',
  bench: 'barbell-bench-press',
  deadlift: 'barbell-deadlift',
  ohp: 'barbell-omuz-presi',
  row: 'barbell-row',
};

const MAKINE_EKIPMANLARI = new Set([
  'leg_press',
  'hack_squat',
  'lat_pulldown',
  'kablo_makinesi',
  'smith_makinesi',
  'makine_gogus',
  'makine_hamstring',
  'makine_quadriceps',
  'makine_sirt',
  'makine_omuz',
  'makine_baldir',
  'makine_abduktor',
]);

const ISINMA_DAKIKA_UZUN = 8;
const ISINMA_DAKIKA_KISA = 5;
const MIN_SET = 2;
const MIN_HAREKET = 3;
/** Havuz bunun altına düşerse kullanıcı uyarılır: kısıtlar seçenekleri daralttı. */
const DAR_HAVUZ_ESIGI = 25;

export function programUret(profil: Profil, secenekler: ProgramSecenekleri = {}): ProgramSonucu {
  if (profil.kapi_durumu.program_engelli) {
    return {
      durum: 'engellendi',
      kapilar: profil.kapi_durumu.kapilar,
      eksik_tarama: profil.kapi_durumu.eksik_tarama,
    };
  }

  const kararlar: Karar[] = [];
  const uyarilar: string[] = [];
  /** Uyarıların dilden bağımsız karşılığı; cümle sözlükte kuruluyor. */
  const uyari_kodlari: ProgramUyariKodu[] = [];

  const split = splitSec({
    gunSayisi: profil.gun_sayisi,
    antrenmanYasi: profil.antrenman_yasi,
    seansDakika: profil.seans_dakika,
  });
  kararlar.push({
    id: 'split',
    entity_tipi: 'split',
    entity_id: split.tip,
    kurallar: ['gun_sayisi', 'seans_suresi', 'antrenman_yasi'],
    girdiler: [
      { soru_id: 'Z1', deger: `${profil.gun_sayisi} gün` },
      { soru_id: 'Z2', deger: `${profil.seans_dakika} dakika` },
      { soru_id: 'A1', deger: profil.antrenman_yasi },
    ],
    aciklama_tr: split.gerekce,
  });

  const hacimSonucu = hacimButcesiHesapla(profil, secenekler);
  kararlar.push(...hacimSonucu.kararlar);

  const havuzSonucu = havuzHazirla(profil);
  kararlar.push(...havuzKararlari(havuzSonucu));

  // Bir hareket birden fazla kurala takılabilir; kullanıcıya benzersiz hareket sayısı söylenir.
  const elenen = new Set(
    havuzSonucu.elemeler.filter((e) => e.kural !== 'ana_havuz_disi').map((e) => e.hareket_id),
  ).size;
  if (elenen > 0) {
    uyarilar.push(`Bildirdiğin kısıtlar nedeniyle ${elenen} hareket havuzdan çıkarıldı.`);
    uyari_kodlari.push({ kod: 'havuz_elemesi', degerler: { adet: elenen } });
  }
  if (havuzSonucu.havuz.length < DAR_HAVUZ_ESIGI) {
    uyarilar.push(
      'Hareket havuzun dar. Ekipman ekleyebilir veya ağrı bildirdiğin bölgeleri güncelleyebilirsin.',
    );
    uyari_kodlari.push({ kod: 'havuz_dar' });
  }

  const gunHedefleri = gunlukHedefler(hacimSonucu.butce, split.gunler);

  const seanslar: SeansPlani[] = [];
  for (const [indeks, gunTipi] of split.gunler.entries()) {
    const { seans, seansKararlari } = seansKur({
      profil,
      gunTipi,
      gunIndeksi: indeks,
      hedefler: gunHedefleri[indeks]!,
      havuz: havuzSonucu.havuz,
    });
    seanslar.push(seans);
    kararlar.push(...seansKararlari);
  }

  return {
    durum: 'uretildi',
    program: {
      split,
      butce: hacimSonucu.butce,
      kapasite: hacimSonucu.kapasite,
      seanslar,
      kararlar,
      uyarilar,
      uyari_kodlari,
      sayilar_gizli: profil.ed_modu,
      havuz_boyutu: havuzSonucu.havuz.length,
    },
  };
}

/** Haftalık bütçeyi, o grubu içeren gün sayısına bölerek günlük hedefe çevirir. */
function gunlukHedefler(butce: HacimButcesi, gunler: GunTipi[]): Array<Record<HacimGrubu, number>> {
  const gunSayisi = {} as Record<HacimGrubu, number>;
  for (const grup of HACIM_GRUPLARI) {
    gunSayisi[grup] = gunler.filter((g) => GUN_GRUPLARI[g].includes(grup)).length;
  }

  return gunler.map((gunTipi) => {
    const hedef = {} as Record<HacimGrubu, number>;
    for (const grup of HACIM_GRUPLARI) {
      hedef[grup] = GUN_GRUPLARI[gunTipi].includes(grup)
        ? Math.max(MIN_SET, Math.round(butce[grup] / Math.max(1, gunSayisi[grup])))
        : 0;
    }
    return hedef;
  });
}

interface SeansGirdisi {
  profil: Profil;
  gunTipi: GunTipi;
  gunIndeksi: number;
  hedefler: Record<HacimGrubu, number>;
  havuz: readonly Hareket[];
}

function seansKur(girdi: SeansGirdisi): { seans: SeansPlani; seansKararlari: Karar[] } {
  const { profil, gunTipi, gunIndeksi, hedefler, havuz } = girdi;
  const isinma = profil.seans_dakika >= 45 ? ISINMA_DAKIKA_UZUN : ISINMA_DAKIKA_KISA;
  const sureButcesi = profil.seans_dakika - isinma;

  const gunGruplari = GUN_GRUPLARI[gunTipi].filter((g) => hedefler[g] > 0);
  const kalan = { ...hedefler };

  // Grup sırası: öncelikli bölgeler önce, sonra hedefi büyük olan. Alfabetik son kırıcı.
  const siraliGruplar = [...gunGruplari].sort((a, b) => {
    const oncelikA = profil.hedef_vektoru.oncelikli_bolgeler.includes(a) ? 1 : 0;
    const oncelikB = profil.hedef_vektoru.oncelikli_bolgeler.includes(b) ? 1 : 0;
    if (oncelikA !== oncelikB) return oncelikB - oncelikA;
    if (kalan[a] !== kalan[b]) return kalan[b] - kalan[a];
    return a.localeCompare(b);
  });

  const secilenler: Array<{ hareket: Hareket; set: number; grup: HacimGrubu; skor: number }> = [];
  const kullanilan = new Set<string>();
  let harcananDakika = 0;

  const grupHareketSayisi = {} as Record<HacimGrubu, number>;

  // İki tur: her turda her gruba bir hareket. Böylece hiçbir grup tamamen boş kalmaz.
  for (const tur of [1, 2]) {
    for (const grup of siraliGruplar) {
      if (kalan[grup] < MIN_SET) continue;
      const tavan = profil.hedef_vektoru.oncelikli_bolgeler.includes(grup) ? 3 : 2;
      if ((grupHareketSayisi[grup] ?? 0) >= Math.min(tur, tavan)) continue;

      const aday = enIyiAday(havuz, grup, profil, kullanilan);
      if (!aday) continue;

      const sema = semaSec(profil.hedef_vektoru.birincil, aday.hareket);
      /**
       * Set TAM SAYI. `kalan` kesirli olabilir — ikincil kas grubundan yarım set
       * düşülüyor ve bu doğru bir muhasebe — ama kesir atanan set sayısına geçemez.
       *
       * Geçtiğinde iki şey oluyordu: `session_items.target_sets` tamsayı sütunu
       * kaydı reddediyor ve program HİÇ üretilemiyordu (kullanıcı "bir şeyler ters
       * gitti" görüyordu), üstelik cümle de saçmalıyordu: "3,5 setin hepsinde...".
       * Set sayılır; yarım set diye bir şey yok.
       */
      const set = Math.floor(Math.min(kalan[grup], sema.max_set));
      if (set < MIN_SET) continue;

      const sure = hareketSuresiDakika(set, sema.dinlenme_sn);
      if (harcananDakika + sure > sureButcesi && secilenler.length >= MIN_HAREKET) continue;

      secilenler.push({ hareket: aday.hareket, set, grup, skor: aday.skor });
      kullanilan.add(aday.hareket.id);
      harcananDakika += sure;
      grupHareketSayisi[grup] = (grupHareketSayisi[grup] ?? 0) + 1;

      kalan[grup] -= set;
      for (const ikincil of aday.hareket.ikincil_kas) {
        const g = hacimGrubu(ikincil);
        if (kalan[g] !== undefined) kalan[g] = Math.max(0, kalan[g] - set * 0.5);
      }
    }
  }

  // Asgari hareket sayısı garantisi: kısıtlı havuzda bile seans boş kalmaz.
  if (secilenler.length < MIN_HAREKET) {
    for (const grup of siraliGruplar) {
      if (secilenler.length >= MIN_HAREKET) break;
      const aday = enIyiAday(havuz, grup, profil, kullanilan);
      if (!aday) continue;
      const sema = semaSec(profil.hedef_vektoru.birincil, aday.hareket);
      secilenler.push({ hareket: aday.hareket, set: MIN_SET, grup, skor: aday.skor });
      kullanilan.add(aday.hareket.id);
      harcananDakika += hareketSuresiDakika(MIN_SET, sema.dinlenme_sn);
    }
  }

  // Yerleşim: bileşik önce, izolasyon sonra; her blok kendi içinde skora göre.
  secilenler.sort((a, b) => {
    const bilesikA = bilesikMi(a.hareket) ? 0 : 1;
    const bilesikB = bilesikMi(b.hareket) ? 0 : 1;
    if (bilesikA !== bilesikB) return bilesikA - bilesikB;
    if (a.skor !== b.skor) return b.skor - a.skor;
    return a.hareket.id.localeCompare(b.hareket.id);
  });

  const hareketler: PlanlananHareket[] = [];
  const seansKararlari: Karar[] = [];

  secilenler.forEach((secim, i) => {
    const sema = semaSec(profil.hedef_vektoru.birincil, secim.hareket);
    const hedefKg = yukAta(secim.hareket, profil, sema.tekrar_ust);
    const gerekceId = `gerekce-g${gunIndeksi}-${secim.hareket.id}`;

    hareketler.push({
      hareket_id: secim.hareket.id,
      sira: i + 1,
      set: secim.set,
      tekrar_alt: sema.tekrar_alt,
      tekrar_ust: sema.tekrar_ust,
      hedef_kg: hedefKg,
      dinlenme_sn: sema.dinlenme_sn,
      ilerleme_kurali: ilerlemeKurali(secim.hareket, secim.set, sema.tekrar_alt, sema.tekrar_ust),
      ilerleme_kurali_kodu: {
        kod: secim.hareket.vucut_agirligi ? ('vucut_agirligi' as const) : ('agirlik' as const),
        set: secim.set,
        tekrar_alt: sema.tekrar_alt,
        tekrar_ust: sema.tekrar_ust,
        ...(secim.hareket.vucut_agirligi
          ? {}
          : { artis: secim.hareket.artis_kg > 0 ? secim.hareket.artis_kg : 2.5 }),
      },
      gerekce_id: gerekceId,
      alternatifler: muadilZinciri(secim.hareket.id, {
        ekipman: profil.kisitlar.ekipman,
        kontrendikasyonlar: profil.kisitlar.kontrendikasyonlar,
      }).map((h) => h.id),
    });

    seansKararlari.push(hareketKarari(gerekceId, secim.hareket, secim.grup, profil));
  });

  const toplamSure =
    isinma + hareketler.reduce((t, h) => t + hareketSuresiDakika(h.set, h.dinlenme_sn), 0);

  return {
    seans: {
      gun_indeksi: gunIndeksi,
      gun_tipi: gunTipi,
      hareketler,
      tahmini_dakika: Math.round(toplamSure),
    },
    seansKararlari,
  };
}

interface Aday {
  hareket: Hareket;
  skor: number;
}

function enIyiAday(
  havuz: readonly Hareket[],
  grup: HacimGrubu,
  profil: Profil,
  kullanilan: Set<string>,
): Aday | undefined {
  const adaylar = havuz
    .filter((h) => !kullanilan.has(h.id))
    .filter((h) => h.birincil_kas.some((kas) => hacimGrubu(kas) === grup))
    .map((hareket) => ({ hareket, skor: hareketSkoru(hareket, grup, profil) }))
    .sort((a, b) =>
      b.skor !== a.skor ? b.skor - a.skor : a.hareket.id.localeCompare(b.hareket.id),
    );

  return adaylar[0];
}

/** Skorlama: hedef uyumu × tarz × uyaran/yorgunluk × erişilebilirlik. */
export function hareketSkoru(hareket: Hareket, grup: HacimGrubu, profil: Profil): number {
  let skor = hareket.sfr / 5;

  const bilesik = bilesikMi(hareket);
  const hedef = profil.hedef_vektoru.birincil;
  if (hedef === 'guc_artisi' || hedef === 'spora_ozel') {
    skor *= bilesik ? 1.35 : 0.7;
  } else if (hedef === 'kas_kazanimi') {
    skor *= bilesik ? 1.12 : 1;
  } else if (hedef === 'yag_kaybi' || hedef === 'dayaniklilik') {
    skor *= bilesik ? 1.15 : 0.95;
  } else if (hedef === 'sakatlik_donusu' || hedef === 'durus_agri') {
    skor *= bilesik ? 0.95 : 1.1;
  }

  if (profil.hedef_vektoru.oncelikli_bolgeler.includes(grup)) skor *= 1.2;

  const makine = hareket.ekipman.some((e) => MAKINE_EKIPMANLARI.has(e));
  // Kalabalık salonda popüler makine beklemeye yol açar; serbest ağırlık muadili öne çıkar.
  if (profil.kisitlar.kalabalik_salon && makine) skor *= 0.85;
  // Teknik güveni düşükse makine ve dumbbell varyantı tercih edilir.
  if (profil.kisitlar.teknik_guveni < 3 && (makine || hareket.teknik_zorluk <= 2)) skor *= 1.15;

  // Yaşla birlikte eksenel yüklenmeyi ölçülü tutmak toparlanmayı korur.
  if (profil.yas > 50 && hareket.eksenel_yuk === 'yuksek') skor *= 0.8;

  return Math.round(skor * 10000) / 10000;
}

function yukAta(hareket: Hareket, profil: Profil, tekrarUst: number): number | null {
  if (hareket.vucut_agirligi) return null;

  const e1rm = e1rmTahmini(hareket, profil);
  if (e1rm <= 0) return null;

  const girdi: Parameters<typeof baslangicYuku>[0] = {
    e1rm,
    tekrarUst,
    artisKg: hareket.artis_kg,
    teknikGuveni: profil.kisitlar.teknik_guveni,
    antrenmanYasi: profil.antrenman_yasi,
  };

  if (hareket.ekipman.includes('barbell')) girdi.tabanKg = 20;
  if (hareket.ekipman.includes('dumbbell') && profil.kisitlar.dumbbell_max_kg !== undefined) {
    girdi.tavanKg = profil.kisitlar.dumbbell_max_kg;
  }

  return baslangicYuku(girdi);
}

function e1rmTahmini(hareket: Hareket, profil: Profil): number {
  const dogrudan = profil.bilinen_yukler[hareket.id];
  if (dogrudan !== undefined && dogrudan > 0) return dogrudan;

  const referans = yukReferansi(hareket);
  if (referans.katsayi <= 0) return 0;

  const lift = referans.lift as ReferansLift;
  const kanonik = LIFT_KANONIK[lift];
  const taban =
    (kanonik !== undefined ? profil.bilinen_yukler[kanonik] : undefined) ??
    referansE1rm(lift, profil.antrenman_yasi, profil.cinsiyet, profil.kilo_kg);

  return taban * referans.katsayi;
}

function ilerlemeKurali(
  hareket: Hareket,
  set: number,
  tekrarAlt: number,
  tekrarUst: number,
): string {
  if (hareket.vucut_agirligi) {
    return (
      `${set} setin hepsinde ${tekrarUst} tekrarı tamamlarsan bir sonraki hafta zorlaştırılmış ` +
      `varyanta geç. ${tekrarAlt} tekrarın altına düşersen aynı varyantta kal.`
    );
  }
  const artis = hareket.artis_kg > 0 ? hareket.artis_kg : 2.5;
  const artisMetni = Number.isInteger(artis) ? `${artis}` : `${artis}`.replace('.', ',');
  return (
    `${set} setin hepsinde ${tekrarUst} tekrarı tamamlarsan gelecek hafta ${artisMetni} kg ekle. ` +
    `${tekrarAlt} tekrarın altına düşersen ağırlığı sabit tut.`
  );
}

/** Havuzu daraltan her kural bir karar olarak kaydedilir; "3 hareket çıkarıldı" buradan gelir. */
function havuzKararlari(havuz: HavuzSonucu): Karar[] {
  const aciklamalar: Record<string, string> = {
    ekipman_yok: 'Ekipman listende olmayan hareketleri havuzdan çıkardım.',
    kontrendikasyon: 'Bildirdiğin sakatlıkla çelişen hareketleri havuzdan çıkardım.',
    agriyi_artiran_patern: 'Ağrının arttığını söylediğin hareket paternini havuzdan çıkardım.',
    eksenel_yuk_yasak: 'Omurgana dikey yük bindiren hareketleri havuzdan çıkardım.',
    tavan_alcak: 'Tavan yüksekliğin yeterli olmadığı için baş üstü hareketleri çıkardım.',
    gurultu_kisiti: 'Gürültü kısıtın nedeniyle ağırlık bırakılan hareketleri çıkardım.',
    zipla_yasak: 'Zıplama kısıtın nedeniyle pliometrik hareketleri çıkardım.',
    spotter_yok: 'Yardımcın olmadığı için tek başına riskli hareketleri çıkardım.',
    teknik_guven_dusuk:
      'Teknik güvenin oturana kadar karmaşık serbest ağırlık hareketlerini çıkardım.',
    kullanici_reddetti: 'Yapmak istemediğini söylediğin hareketleri çıkardım.',
  };

  const soruEslemesi: Record<string, string> = {
    ekipman_yok: 'E3',
    kontrendikasyon: 'S8',
    agriyi_artiran_patern: 'S12',
    eksenel_yuk_yasak: 'S17',
    tavan_alcak: 'E5a',
    gurultu_kisiti: 'E6',
    zipla_yasak: 'E6',
    spotter_yok: 'E8',
    teknik_guven_dusuk: 'A8',
    kullanici_reddetti: 'T2',
  };

  return Object.entries(havuz.eleme_sayilari)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kural, sayi]) => ({
      id: `havuz-${kural}`,
      entity_tipi: 'havuz' as const,
      entity_id: kural,
      kurallar: [kural],
      girdiler: [{ soru_id: soruEslemesi[kural] ?? '-', deger: `${sayi} hareket` }],
      parametreler: { adet: sayi },
      aciklama_tr: aciklamalar[kural] ?? `${sayi} hareket havuzdan çıkarıldı.`,
    }));
}

/** Bir hareketi seçimi kazandıran kuralların izi. Kullanıcıya gösterilen gerekçe budur. */
function hareketKarari(id: string, hareket: Hareket, grup: HacimGrubu, profil: Profil): Karar {
  const kurallar: string[] = [];
  const girdiler = [{ soru_id: 'E3', deger: hareket.ekipman.join(', ') || 'ekipman gerekmez' }];
  const cumleler: string[] = [];

  if (profil.hedef_vektoru.oncelikli_bolgeler.includes(grup)) {
    kurallar.push('oncelikli_bolge');
    girdiler.push({ soru_id: 'H6', deger: grup });
    cumleler.push(`${grupAdi(grup)} bölgesini öncelik olarak seçtin`);
  }

  if (bilesikMi(hareket)) {
    kurallar.push('bilesik_cekirdek');
    cumleler.push(`${paternAdi(hareket.patern)} paterni haftalık hacminin çekirdeği`);
  } else {
    kurallar.push('izolasyon_tamamlayici');
    cumleler.push(`${grupAdi(grup)} hacmini tamamlamak için izolasyon olarak ekledim`);
  }

  if (hareket.sfr >= 4) {
    kurallar.push('sfr_yuksek');
    cumleler.push('uyaran/yorgunluk oranı yüksek');
  }

  if (profil.kisitlar.kontrendikasyonlar.length > 0) {
    kurallar.push('kontrendikasyon_uyumlu');
    girdiler.push({ soru_id: 'S8', deger: profil.kisitlar.kontrendikasyonlar.join(', ') });
    cumleler.push('bildirdiğin kısıtlarla çelişmiyor');
  }

  if (profil.kisitlar.kalabalik_salon && hareket.ekipman.every((e) => !MAKINE_EKIPMANLARI.has(e))) {
    kurallar.push('kalabalik_salon_uyumlu');
    girdiler.push({ soru_id: 'E4', deger: 'salon kalabalık' });
    cumleler.push('makine beklemeden yapabilirsin');
  }

  const aciklama = `${hareket.ad_tr} seçildi: ${cumleler.join(', ')}.`;

  return {
    id,
    entity_tipi: 'hareket',
    entity_id: hareket.id,
    kurallar,
    girdiler,
    parametreler: { hareket_adi: hareket.ad_tr, grup, patern: hareket.patern },
    aciklama_tr: aciklama,
  };
}

const GRUP_ADLARI: Record<HacimGrubu, string> = {
  gogus: 'Göğüs',
  sirt: 'Sırt',
  omuz: 'Omuz',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Ön bacak',
  hamstring: 'Arka bacak',
  kalca: 'Kalça',
  karin: 'Karın',
  baldir: 'Baldır',
};

export function grupAdi(grup: HacimGrubu): string {
  return GRUP_ADLARI[grup];
}

const PATERN_ADLARI: Record<Hareket['patern'], string> = {
  itme_yatay: 'Yatay itme',
  itme_dikey: 'Dikey itme',
  cekme_yatay: 'Yatay çekme',
  cekme_dikey: 'Dikey çekme',
  diz_baskin: 'Diz baskın',
  kalca_baskin: 'Kalça baskın',
  tasima: 'Taşıma',
  rotasyon: 'Rotasyon',
  izolasyon: 'İzolasyon',
};

export function paternAdi(patern: Hareket['patern']): string {
  return PATERN_ADLARI[patern];
}
