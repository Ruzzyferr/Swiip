/**
 * Değerlendirme soru bankasının tipleri. Veri `data/sorular.json` dosyasında,
 * derlenmiş hâli `sorular.uretilmis.ts` içinde.
 */

export const SORU_TIPLERI = [
  'date',
  'number',
  'single',
  'multi',
  'scale',
  'text',
  'longtext',
  'bodymap',
  'imagechoice',
  'measure',
  'consent',
  'time',
  'daterange',
  'liftinput',
  'photo',
] as const;
export type SoruTipi = (typeof SORU_TIPLERI)[number];

export type KapiEylemKodu =
  'kayit_reddet' | 'program_uretme' | 'medikal_onay_zorunlu' | 'onay_belgesi_iste' | 'ed_modu_ac';

export interface SoruKapisi {
  if: string[];
  action: KapiEylemKodu;
  mesaj?: string;
}

/**
 * Sorunun hangi akışta sorulduğu.
 *
 * `temel` değerlendirme akışıdır. `keskinlestirme` soruları akışta HİÇ görünmez;
 * programın karar izi bir hareketi elediğinde ("tekniğine güvendiğini bilmiyorum")
 * o kararın `soru_id`'sinden çağrılır. `periyodik` olanlar haftalık ya da mevsimlik
 * check-in'e ait: uyku kalitesi ve stres tek seferlik sorular değil, oruç ise yılın
 * on ayında sorulmaması gereken bir soru.
 */
export type SoruAsamasi = 'temel' | 'keskinlestirme' | 'periyodik';

export interface Soru {
  id: string;
  text: string;
  type: SoruTipi;
  /** Varsayılan `temel`. Bkz. SoruAsamasi. */
  asama?: SoruAsamasi;
  /**
   * Zorunlu mu?
   *
   * Tek bayrak: yanında bir de `optional` vardı ve ikisi ayrışmıştı. Doğrulama
   * (`cevabiDogrula`, `blokHatalari`) yalnızca `required` bakıyordu — yani 110 soru
   * boş bırakılabiliyordu — ama arayüz "istersen atla" notunu `optional` ile
   * çiziyordu ve o bayrak yalnızca 12 soruda vardı. Kalan 98 soru zorunlu görünüyor,
   * kullanıcı 136 sorunun hepsini cevaplamak zorunda sanıyordu.
   */
  required?: boolean;
  /** Varsayılan olarak gizli; bir branch tarafından açılır. */
  conditional?: boolean;
  /**
   * Başka bir sorunun cevabına bağlı görünürlük: `{ K2: 'Kadın' }`.
   *
   * Anahtarlar VE ile, bir anahtarın dizi değeri VEYA ile okunur:
   * `{ E1: ['Ev', 'Karma'], E3: 'Dumbbell' }` = "(evde ya da karma) VE dumbbell var".
   *
   * Dizi desteği sonradan geldi. Öncesinde her bağımlılık tek bir değere
   * eşitlenebiliyordu ve iki değerden birini kabul eden bir koşul yazmanın tek yolu
   * `branch` idi — o da VE kuramıyor. Sonuç: "evde çalışıyorsan dumbbell aralığın ne"
   * sorusu, dumbbell'ı hiç işaretlememiş kullanıcıya da soruluyordu.
   */
  conditionalOn?: Record<string, string | string[]>;
  /** Cevap anahtarla eşleşirse listedeki sorular görünür olur. */
  branch?: Record<string, string[]>;
  /** Bodymap'te seçilen her bölge için tekrarlanan sorular. */
  repeatBranch?: string[];
  /** Her kalem için ayrı cevap alınır; anahtar "A8:Squat" biçimindedir. */
  repeatFor?: string[];
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  maxSelect?: number;
  regions?: string[];
  fields?: string[];
  lifts?: string[];
  count?: number;
  labels?: Record<string, string>;
  gate?: SoruKapisi;
  gerceklikTesti?: {
    maxAylikKayipOrani: number;
    maxAylikKazancKg: number;
    aksiHalde: string;
  };
  /** Cevabın motorda hangi parametreyi değiştirdiği. Boş olamaz. */
  drives: string[];
  [ek: string]: unknown;
}

export interface SoruBlogu {
  id: string;
  title: string;
  order: number;
  /** Blok sonunda gösterilen geri bildirim şablonu. */
  geriBildirim?: string;
  questions: Soru[];
}

export interface SoruBankasi {
  version: number;
  locale: string;
  blocks: SoruBlogu[];
  [ek: string]: unknown;
}
