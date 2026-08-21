/**
 * Swiip ortak alan modeli.
 * Kod tabanının her katmanı (motor, API, mobil) bu tipleri paylaşır.
 * Türkçe alan adları bilinçli: veri sözlüğü docs/spec.md bölüm 14 ile birebir.
 */

export const KAS_GRUPLARI = [
  'gogus',
  'sirt',
  'trapez',
  'on_omuz',
  'yan_omuz',
  'arka_omuz',
  'omuz',
  'biceps',
  'triceps',
  'onkol',
  'karin',
  'bel',
  'kalca',
  'quadriceps',
  'hamstring',
  'baldir',
] as const;
export type KasGrubu = (typeof KAS_GRUPLARI)[number];

/** Hacim bütçesi bu birleşik gruplar üzerinden tutulur. */
export const HACIM_GRUPLARI = [
  'gogus',
  'sirt',
  'omuz',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstring',
  'kalca',
  'karin',
  'baldir',
] as const;
export type HacimGrubu = (typeof HACIM_GRUPLARI)[number];

export const PATERNLER = [
  'itme_yatay',
  'itme_dikey',
  'cekme_yatay',
  'cekme_dikey',
  'diz_baskin',
  'kalca_baskin',
  'tasima',
  'rotasyon',
  'izolasyon',
] as const;
export type Patern = (typeof PATERNLER)[number];

export const EKIPMANLAR = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'leg_press',
  'hack_squat',
  'lat_pulldown',
  'kablo_makinesi',
  'smith_makinesi',
  'barfiks_bari',
  'dip_bari',
  'duz_bench',
  'egimli_bench',
  'ayarlanabilir_bench',
  'direnc_bandi',
  'kosu_bandi',
  'sabit_bisiklet',
  'kurek_makinesi',
  'merdiven',
  'trx',
  'squat_rack',
  'makine_gogus',
  'makine_hamstring',
  'makine_quadriceps',
  'makine_sirt',
  'makine_omuz',
  'makine_baldir',
  'makine_abduktor',
  'preacher_bench',
  'roman_chair',
  'plyo_box',
] as const;
export type Ekipman = (typeof EKIPMANLAR)[number];

export const KONTRENDIKASYONLAR = [
  'bel_fitigi',
  'boyun_fitigi',
  'omuz_sikismasi',
  'omuz_instabilite',
  'diz_menisküs',
  'diz_patellofemoral',
  'dirsek_tendinit',
  'bilek_agrisi',
  'kalca_impingement',
  'ayak_bilegi_kisitli',
  'tansiyon_kontrolsuz',
] as const;
export type Kontrendikasyon = (typeof KONTRENDIKASYONLAR)[number];

export type EksenelYuk = 'yok' | 'dusuk' | 'orta' | 'yuksek';

export interface Hareket {
  id: string;
  ad_tr: string;
  ad_en: string;
  birincil_kas: KasGrubu[];
  ikincil_kas: KasGrubu[];
  ekipman: Ekipman[];
  patern: Patern;
  kontrendikasyon: Kontrendikasyon[];
  /** 1-5; kullanıcının teknik güveni düşükse yüksek olanlar elenir. */
  teknik_zorluk: number;
  /** Uyaran/yorgunluk oranı 1-5. */
  sfr: number;
  eksenel_yuk: EksenelYuk;
  bas_ustu: boolean;
  gurultu: boolean;
  spotter: boolean;
  /** İlerleme adımı (kg). */
  artis_kg: number;
  alternatifler: string[];
  talimat_tr: string[];
  /** Başlangıç yükü tahmini: hangi referans lifte, hangi katsayıyla bağlı. */
  yuk_referansi: YukReferansi;
  /** Tek taraflı hareketlerde yük tek tarafa yazılır. */
  tek_tarafli?: boolean;
  /** Vücut ağırlığı hareketi: yük ataması yapılmaz. */
  vucut_agirligi?: boolean;
  /** Set/tekrar yerine süre ile planlanır; hacim bütçesine girmez. */
  sure_bazli?: boolean;
  /** Isınma bloğunda kullanılır; hacim bütçesine girmez. */
  isinma?: boolean;
  /** Zıplama içerir; gürültü ve eklem kısıtında elenir. */
  pliometrik?: boolean;
}

export const REFERANS_LIFTLER = ['squat', 'bench', 'deadlift', 'ohp', 'row'] as const;
export type ReferansLift = (typeof REFERANS_LIFTLER)[number];

export interface YukReferansi {
  lift: ReferansLift;
  /** Referans liftin e1RM'ine göre çarpan. 0 ise yük atanmaz. */
  katsayi: number;
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export type Cinsiyet = 'erkek' | 'kadin';

export const ANTRENMAN_YASLARI = ['yeni', 'erken', 'orta', 'ileri', 'kidemli'] as const;
export type AntrenmanYasi = (typeof ANTRENMAN_YASLARI)[number];

export const HEDEFLER = [
  'yag_kaybi',
  'kas_kazanimi',
  'guc_artisi',
  'dayaniklilik',
  'genel_saglik',
  'sakatlik_donusu',
  'spora_ozel',
  'durus_agri',
] as const;
export type Hedef = (typeof HEDEFLER)[number];

export type Ortam = 'salon' | 'ev' | 'ev_ve_salon' | 'acik_alan';

export interface Sakatlik {
  bolge: string;
  kontrendikasyonlar: Kontrendikasyon[];
  /** 0-10 arası bildirilen ağrı; 4 ve üzeri aktif kabul edilir. */
  agri_seviyesi: number;
  aktif: boolean;
}

export interface Kisitlar {
  ekipman: Ekipman[];
  sakatliklar: Sakatlik[];
  kontrendikasyonlar: Kontrendikasyon[];
  /** T2'de reddedilen hareketler; id ve İngilizce ad üzerinde anahtar kelime eşlemesi. */
  reddedilen_anahtarlar: string[];
  /** Aktif sakatlık bölgeleriyle örtüşen hacim grupları — hacim ×0,60. */
  kisitli_hacim_gruplari: HacimGrubu[];
  /** S12: ağrıyı artıran hareket paternleri. Havuzdan çıkarılır. */
  kisitli_paternler: Patern[];
  bas_ustu_yasak: boolean;
  /** E6: zıplama yasağı — pliometrik hareketler çıkar. */
  zipla_yasak: boolean;
  /** E6: ağırlık bırakma yasağı — gürültülü hareketler çıkar. */
  gurultu_yasak: boolean;
  spotter_yok: boolean;
  kalabalik_salon: boolean;
  /** A8 teknik güveni ortalaması (1-5). Düşükse serbest ağırlık karmaşıklığı sınırlanır. */
  teknik_guveni: number;
  /** Yüksek eksenel yüklenme yasak (bel/boyun fıtığı, aktif bel ağrısı). */
  eksenel_yuk_yasak: boolean;
  dumbbell_max_kg?: number;
}

export interface HedefVektoru {
  birincil: Hedef;
  ikincil?: Hedef;
  oncelikli_bolgeler: HacimGrubu[];
  memnun_bolgeler: HacimGrubu[];
  hedef_kilo_kg?: number;
  hedef_tarih?: string;
  aylik_beklenti_kg?: number;
}

export interface Profil {
  user_id: string;
  locale: string;
  cinsiyet: Cinsiyet;
  yas: number;
  boy_cm: number;
  kilo_kg: number;
  vucut_yag_orani?: number;
  antrenman_yasi: AntrenmanYasi;
  /** 0-1 arası; uyku, stres, yaş ve iş yükünden hesaplanır. */
  toparlanma_skoru: number;
  uyku_saati: number;
  stres_seviyesi: number;
  aktivite_carpani: number;
  gun_sayisi: number;
  seans_dakika: number;
  /** Z3: kullanıcının uygun işaretlediği hafta günleri (0 = Pazar). Boşsa belirtilmemiş. */
  uygun_gunler: number[];
  ortam: Ortam;
  kisitlar: Kisitlar;
  hedef_vektoru: HedefVektoru;
  ed_modu: boolean;
  kapi_durumu: KapiDurumu;
  /** Bilinen 1RM veya tahmini e1RM değerleri (hareket id -> kg). */
  bilinen_yukler: Record<string, number>;
  vucut_agirligi_kapasitesi: {
    sinav?: number;
    barfiks?: number;
    plank_saniye?: number;
  };
}

// ---------------------------------------------------------------------------
// Güvenlik kapıları
// ---------------------------------------------------------------------------

export const KAPI_TIPLERI = ['yas', 'gebelik', 'kardiyak', 'yeme_bozuklugu'] as const;
export type KapiTipi = (typeof KAPI_TIPLERI)[number];

export type KapiEylemi =
  'kayit_reddet' | 'program_uretme' | 'doktor_onayi_bekle' | 'sayilari_gizle';

export interface Kapi {
  tip: KapiTipi;
  eylem: KapiEylemi;
  /** Kullanıcıya gösterilecek metin: suçlamaz, kapıyı çarpmaz. */
  mesaj: string;
  /** Kapıyı tetikleyen soru id'leri. */
  tetikleyen: string[];
}

export interface KapiDurumu {
  kapilar: Kapi[];
  kayit_engelli: boolean;
  program_engelli: boolean;
  sayilar_gizli: boolean;
  /** Cevaplanmamış zorunlu tarama soruları. Boş değilse program üretilmez. */
  eksik_tarama: string[];
}

// ---------------------------------------------------------------------------
// Hacim, split, program
// ---------------------------------------------------------------------------

export type HacimButcesi = Record<HacimGrubu, number>;

export const SPLITLER = [
  'full_body',
  'upper_lower',
  'upper_lower_full',
  'ppl',
  'upper_lower_ppl',
  'ppl_x2',
] as const;
export type SplitTipi = (typeof SPLITLER)[number];

export type GunTipi = 'full_body' | 'upper' | 'lower' | 'push' | 'pull' | 'legs';

export interface SplitPlani {
  tip: SplitTipi;
  gun_sayisi: number;
  gunler: GunTipi[];
  gerekce: string;
  /**
   * Gerekçenin dilden bağımsız anahtarı.
   *
   * `gerekce` motorun Türkçe metni; iz o ve çeviremediğimiz yerde yedek o. Cümle
   * sözlükte bu anahtar ve değerlerle kuruluyor.
   */
  gerekce_anahtari?: string;
  gerekce_degerleri?: Record<string, string | number>;
}

export interface PlanlananHareket {
  hareket_id: string;
  sira: number;
  set: number;
  tekrar_alt: number;
  tekrar_ust: number;
  hedef_kg: number | null;
  dinlenme_sn: number;
  /** Motorun Türkçe ilerleme kuralı — iz ve yedek. */
  ilerleme_kurali: string;
  /**
   * Kuralın dilden bağımsız karşılığı.
   *
   * "Kaç tekrarda ne olacak" cümlesi programın her satırında görünüyor; motorda
   * sabitlemek onu yalnızca Türkçe kullanıcıya vermek olurdu.
   */
  ilerleme_kurali_kodu?: {
    kod: 'agirlik' | 'vucut_agirligi';
    set: number;
    tekrar_alt: number;
    tekrar_ust: number;
    artis?: number;
  };
  gerekce_id: string;
  alternatifler: string[];
}

export interface SeansPlani {
  gun_indeksi: number;
  gun_tipi: GunTipi;
  hareketler: PlanlananHareket[];
  tahmini_dakika: number;
}

// ---------------------------------------------------------------------------
// Karar izi — ürünün kalbi
// ---------------------------------------------------------------------------

export interface KararGirdisi {
  soru_id: string;
  deger: string;
}

/**
 * Gerekçeyi herhangi bir dilde kurmaya yeten parametreler.
 *
 * `aciklama_tr` adı doğruyu söylüyor: o cümle Türkçe. Ürünün çekirdek vaadi "programın
 * neden o program olduğunu da söyleriz" ise, cümleyi motorda sabitlemek o vaadi yalnızca
 * Türkçe kullanıcıya tutmak demek.
 *
 * Çözüm cümleyi çevirmek değil, **cümleyi kurmak için gerekeni taşımak**: kural kimlikleri
 * zaten vardı, eksik olan parametrelerdi. Bunlarla metin uçta veya arayüzde kurulabiliyor
 * ve çekirdek metinsiz kalıyor — motorun zaten olması gereken hâli.
 */
export interface KararParametreleri {
  /** Hareket kararında hareketin görünen adı. */
  hareket_adi?: string;
  /** Hacim grubu kodu; adı sözlükten çözülür. */
  grup?: string;
  /** Hareket paterni kodu; adı sözlükten çözülür. */
  patern?: string;
  /** Havuz kararında elenen hareket sayısı. */
  adet?: number;
  /** İlerleme kararında yeni yük (kg). */
  kg?: number;
  /** İlerleme kararında yeni tekrar hedefi. */
  tekrar?: number;
  /** İlerleme kararında uygulanan yük artışı (kg). */
  artis?: number;
  /** Hareket vücut ağırlığıyla mı yapılıyor — cümle buna göre kuruluyor. */
  vucut_agirligi?: boolean;
}

export interface Karar {
  id: string;
  entity_tipi: 'hareket' | 'havuz' | 'hacim' | 'split' | 'yuk' | 'beslenme' | 'ilerleme';
  entity_id: string;
  /** Ateşlenen kural kodları. */
  kurallar: string[];
  girdiler: KararGirdisi[];
  /** Cümleyi dilden bağımsız kurmak için gereken değerler. */
  parametreler?: KararParametreleri;
  /** Deterministik Türkçe açıklama. AI yalnızca bunu güzelleştirir, karar vermez. */
  aciklama_tr: string;
}

// ---------------------------------------------------------------------------
// Geri bildirim ve ilerleme
// ---------------------------------------------------------------------------

export type GeriBildirim = 'tamamladim' | 'zorlandim' | 'yapamadim';

export interface IlerlemeDurumu {
  hareket_id: string;
  mevcut_kg: number;
  mevcut_tekrar: number;
  ustuste_basari: number;
  ustuste_zorlanma: number;
  son_deload_hafta?: number;
  e1rm: number;
}

export interface SeansGeriBildirimi {
  hareket_id: string;
  sonuc: GeriBildirim;
  agri: boolean;
}

// ---------------------------------------------------------------------------
// Beslenme
// ---------------------------------------------------------------------------

export interface Makrolar {
  kalori: number;
  protein_g: number;
  yag_g: number;
  karbonhidrat_g: number;
  lif_g: number;
  su_ml: number;
}

export interface BeslenmeHedefi extends Makrolar {
  bmr: number;
  tdee: number;
  yontem: 'katch_mcardle' | 'mifflin_st_jeor';
  /** Açık/fazla yönü ve büyüklüğü (kcal). */
  kalori_farki: number;
  uyari?: string;
}
