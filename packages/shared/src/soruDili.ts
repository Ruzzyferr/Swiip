import type { Dil } from './diller';
import { varsayilanDil } from './diller';
import type { SoruBankasiCevirisi } from './degerlendirme';
import { metinleriAl } from './i18n';
import { SORU_BANKASI } from './sorular.uretilmis';
import { SORU_BANKASI_EN } from './sorular.en.uretilmis';

/**
 * Değerlendirmenin görünen metinleri, kullanıcının dilinde.
 *
 * Uygulama 175 ülkede ve arayüzün tamamı İngilizceye çevrilmişti — ama kayıttan sonra
 * ilk görülen şey olan sekiz kart, soru bankasından düz `soru.text` ve seçenek değeri
 * basıyordu. İngilizce kullanıcı ürünün kapısında Türkçe bir anketle karşılaşıyordu.
 *
 * KURAL — bozulmasın: çeviri yalnızca ETİKET. Cevap değeri her dilde bankadaki kanonik
 * Türkçe değerdir; çekirdek ve API 'Evet', 'Ev', 'Barbell ve plaka' gibi değerleri
 * okuyor ve üretimdeki cevaplar bu değerlerle saklı. Ekran etiketi çizer, değeri kaydeder.
 *
 * Türkçe kaynak dil: çevirisi olmayan dilde (ve bulunamayan bir anahtarda) bankanın kendi
 * metnine düşülür — uydurmak yerine izi göstermek. Eksik çeviriyi
 * `soruCevirisi.test.ts` ve derleyici yakalıyor.
 */

const CEVIRILER: Partial<Record<Dil, SoruBankasiCevirisi>> = { en: SORU_BANKASI_EN };

/** Soru ya da tekrar edilen kopyası ("S11:bel"). */
export interface CevrilebilirSoru {
  id: string;
  text: string;
  /** Tekrarlanan sorularda bankadaki asıl kimlik. */
  temel_id?: string;
  /** Tekrarlanan sorularda kalem: bölge kodu ya da hareket adı. */
  kalem?: string;
}

function ceviri(dil: Dil): SoruBankasiCevirisi | undefined {
  return dil === varsayilanDil ? undefined : CEVIRILER[dil];
}

function temelId(soru: Pick<CevrilebilirSoru, 'id' | 'temel_id'>): string {
  return soru.temel_id ?? soru.id.split(':')[0]!;
}

/** Blok (kart) başlığı. */
export function blokBasligi(blokId: string, dil: Dil = varsayilanDil): string {
  const kaynak = SORU_BANKASI.blocks.find((b) => b.id === blokId)?.title ?? blokId;
  return ceviri(dil)?.blocks[blokId]?.title ?? kaynak;
}

/**
 * Kalemin adı: bir bölge kodu (S11 "bel") ya da bir hareket (A5 "Omuz presi").
 * Bölge adları sözlükte, hareket adları soru çevirisinin `lifts` alanında.
 */
export function kalemEtiketi(
  soru: Pick<CevrilebilirSoru, 'id' | 'temel_id'>,
  kalem: string,
  dil: Dil = varsayilanDil,
): string {
  const hareket = ceviri(dil)?.questions[temelId(soru)]?.lifts?.[kalem];
  if (hareket) return hareket;
  const bolgeler = metinleriAl(dil).degerlendirme.bolgeAdlari as Record<string, string>;
  return bolgeler[kalem] ?? kalem;
}

/**
 * Sorunun metni.
 *
 * Türkçede motorun kurduğu metin aynen kalır (tekrarlanan sorularda "— sağ omuz" eki
 * dahil). Diğer dillerde ek de çevrilmiş kalem adıyla yeniden kurulur.
 */
export function soruMetni(soru: CevrilebilirSoru, dil: Dil = varsayilanDil): string {
  const c = ceviri(dil)?.questions[temelId(soru)];
  if (!c) return soru.text;
  return soru.kalem ? `${c.text} — ${kalemEtiketi(soru, soru.kalem, dil)}` : c.text;
}

/** Seçeneğin etiketi. `deger` bankadaki kanonik değer; kaydedilen de odur. */
export function secenekEtiketi(
  soru: Pick<CevrilebilirSoru, 'id' | 'temel_id'>,
  deger: string,
  dil: Dil = varsayilanDil,
): string {
  return ceviri(dil)?.questions[temelId(soru)]?.options?.[deger] ?? deger;
}

/** `cevabiDogrula` sonucunun ekrandaki cümlesi. */
export interface DogrulamaIzi {
  mesaj?: string;
  kod?: string;
  degerler?: Record<string, string | number>;
}

export function dogrulamaMetni(iz: DogrulamaIzi, dil: Dil = varsayilanDil): string {
  const sozluk = metinleriAl(dil).degerlendirme.dogrulama as Record<
    string,
    ((d: Record<string, string | number>) => string) | undefined
  >;
  const uretici = iz.kod ? sozluk[iz.kod] : undefined;
  if (uretici) return uretici(iz.degerler ?? {});
  return iz.mesaj ?? metinleriAl(dil).degerlendirme.gecersizCevap;
}

/**
 * Karar izindeki bir girdinin hangi sorudan geldiği — kullanıcının dilinde.
 *
 * Karar izi girdiyi soru KİMLİĞİYLE saklıyor (`E3`, `S8`) ve ekran o kimliği basıyordu:
 * kullanıcı "E3 · Dumbbell" okuyordu, oysa E3'ü hiçbir yerde görmemişti. Bankada
 * karşılığı olmayan girdiler (ör. `hafta`, `atlama_sebebi`) için `null`.
 */
export function girdiSorusu(soruId: string, dil: Dil = varsayilanDil): string | null {
  const id = soruId.split(':')[0]!;
  for (const blok of SORU_BANKASI.blocks) {
    const soru = blok.questions.find((q) => q.id === id);
    if (soru) return soruMetni({ id: soru.id, text: soru.text }, dil);
  }
  return null;
}

/** Girdinin değeri: virgülle ayrılmış kanonik seçenekler kullanıcının dilinde. */
export function girdiDegeri(soruId: string, deger: string, dil: Dil = varsayilanDil): string {
  return deger
    .split(',')
    .map((ham) => ham.trim())
    .filter((ham) => ham !== '')
    .map((ham) => secenekEtiketi({ id: soruId }, ham, dil))
    .join(', ');
}
