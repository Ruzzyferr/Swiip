/**
 * Hesaplama kaynakları — uygulamanın kullandığı denklemlerin künyeleri.
 *
 * NEDEN VAR: Apple 2026-08-27'de Guideline 1.4.1 (Safety — Physical Harm) ile
 * reddetti:
 *
 *   "The app includes medical information but does not include citations...
 *    Specifically, the app provides health or medical recommendations,
 *    calculations, and references in the app without citations, such as links
 *    to sources for this information. The citations to the sources should be
 *    easy for the user to find."
 *
 * Yani kalori, makro ve yük hesapları kaynak göstermeden sunuluyordu. Bu ürünün
 * kendi ilkesiyle de çelişiyordu: "her karar izlenebilir" diyoruz ama kararın
 * dayandığı denklemin nereden geldiğini söylemiyorduk.
 *
 * NEDEN SÖZLÜKTE DEĞİL: akademik künye çevrilmez. Yazar adı, dergi adı, cilt ve
 * DOI her dilde aynı; bunları `metinler.tr.ts`/`metinler.en.ts` içine koymak iki
 * kopya yaratır ve biri güncellenmeyi unutur. Çevrilen tek şey her kaynağın NE
 * İÇİN kullanıldığını anlatan cümle; o sözlükte, `anahtar` ile buraya bağlanıyor.
 *
 * KURAL: buraya yalnızca kodun GERÇEKTEN kullandığı bir denklem eklenir.
 * `kaynaklar.test.ts` her anahtarın sözlükte bir karşılığı olmasını şart koşuyor.
 */

export interface Kaynak {
  /** Sözlükteki açıklamaya bağlanan anahtar. */
  anahtar: string;
  /** Akademik künye. Çevrilmez. */
  kunye: string;
  /** DOI ya da kalıcı adres. Yoksa (kitaplar) verilmez. */
  baglanti?: string;
}

export const KAYNAKLAR: readonly Kaynak[] = [
  {
    anahtar: 'bmrMifflin',
    kunye:
      'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. ' +
      '“A new predictive equation for resting energy expenditure in healthy individuals.” ' +
      'The American Journal of Clinical Nutrition, 1990;51(2):241–247.',
    baglanti: 'https://doi.org/10.1093/ajcn/51.2.241',
  },
  {
    anahtar: 'bmrKatch',
    kunye:
      'McArdle WD, Katch FI, Katch VL. ' +
      'Exercise Physiology: Nutrition, Energy, and Human Performance. ' +
      '8. baskı. Wolters Kluwer, 2015.',
  },
  {
    anahtar: 'tdeePal',
    kunye:
      'FAO/WHO/UNU. Human Energy Requirements: Report of a Joint FAO/WHO/UNU ' +
      'Expert Consultation. Roma, 2004.',
    baglanti: 'https://www.fao.org/4/y5686e/y5686e00.htm',
  },
  {
    anahtar: 'yagOrani',
    kunye:
      'Deurenberg P, Weststrate JA, Seidell JC. ' +
      '“Body mass index as a measure of body fatness: age- and sex-specific ' +
      'prediction formulas.” British Journal of Nutrition, 1991;65(2):105–114.',
    baglanti: 'https://doi.org/10.1079/BJN19910073',
  },
  {
    anahtar: 'protein',
    kunye:
      'Jäger R, Kerksick CM, Campbell BI, ve ark. ' +
      '“International Society of Sports Nutrition Position Stand: protein and exercise.” ' +
      'Journal of the International Society of Sports Nutrition, 2017;14:20.',
    baglanti: 'https://doi.org/10.1186/s12970-017-0177-8',
  },
  {
    anahtar: 'kaloriAcigi',
    kunye:
      'Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J. ' +
      '“Effect of two different weight-loss rates on body composition and strength ' +
      'and power-related performance in elite athletes.” ' +
      'International Journal of Sport Nutrition and Exercise Metabolism, 2011;21(2):97–104.',
    baglanti: 'https://doi.org/10.1123/ijsnem.21.2.97',
  },
  {
    anahtar: 'birRm',
    kunye:
      'Epley B. “Poundage Chart.” Boyd Epley Workout. Body Enterprises, Lincoln, NE, 1985. · ' +
      'LeSuer DA, McCormick JH, Mayhew JL, Wasserstein RL, Arnold MD. ' +
      '“The accuracy of prediction equations for estimating 1-RM performance.” ' +
      'Journal of Strength and Conditioning Research, 1997;11(4):211–213.',
  },
  {
    anahtar: 'hacim',
    kunye:
      'Schoenfeld BJ, Ogborn D, Krieger JW. ' +
      '“Dose-response relationship between weekly resistance training volume and ' +
      'increases in muscle mass: A systematic review and meta-analysis.” ' +
      'Journal of Sports Sciences, 2017;35(11):1073–1082.',
    baglanti: 'https://doi.org/10.1080/02640414.2016.1210197',
  },
  {
    anahtar: 'ilerleme',
    kunye:
      'American College of Sports Medicine. ' +
      '“Progression Models in Resistance Training for Healthy Adults.” ' +
      'Medicine & Science in Sports & Exercise, 2009;41(3):687–708.',
    baglanti: 'https://doi.org/10.1249/MSS.0b013e3181915670',
  },
] as const;
