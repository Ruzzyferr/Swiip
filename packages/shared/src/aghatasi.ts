/**
 * Ağ hatasını sınıflandırma ve gönderilecek farkı bulma (F2.9).
 *
 * İki ayrı hata, tek bir `catch` ile aynı sayılıyordu:
 *
 *  - **Bağlantı yok.** Cevap cihazda bekler, bağlanınca gider. Kullanıcıya bunu söylemek
 *    doğru ve rahatlatıcı.
 *  - **Sunucu reddetti.** Cevap hiçbir zaman gitmeyecek. Aynı cümleyi söylemek yalan.
 *
 * Ağ katmanı ikisini zaten ayırıyor: bağlantı hatası `durum: 0` ile geliyor. Bu modül
 * o ayrımı ekranların paylaştığı tek bir kurala indiriyor.
 */

/** Ağ katmanının bağlantı hatası için kullandığı kod. */
export const BAGLANTI_KODU = 'baglanti_yok';

interface AgHatasiGibi {
  durum?: unknown;
  kod?: unknown;
}

/**
 * Gerçekten bağlantı sorunu mu?
 *
 * Tanımadığımız hata **bağlantı sayılmaz**: "verin güvende" demek, olmadığı halde
 * söylendiğinde hiçbir şey söylememekten kötü.
 */
export function baglantiSorunuMu(hata: unknown): boolean {
  if (typeof hata !== 'object' || hata === null) return false;
  const h = hata as AgHatasiGibi;
  return h.durum === 0 || h.kod === BAGLANTI_KODU;
}

/**
 * Son başarılı kayıttan bu yana değişen cevaplar.
 *
 * Sunucu gelen cevapları mevcutlarla birleştiriyor, o yüzden yalnızca farkı göndermek
 * yeterli. Tümünü göndermek iki sorun üretiyordu: küme içindeki tek bir geçersiz cevap
 * sonraki her kaydı da reddettiriyor (değerlendirme kalıcı zehirleniyor), ve gövde her
 * soruda büyüyordu.
 */
export function yeniCevaplar<T extends Record<string, unknown>>(
  hepsi: T,
  gonderilmis: Record<string, unknown>,
): T {
  const fark: Record<string, unknown> = {};

  for (const [anahtar, deger] of Object.entries(hepsi)) {
    if (!ayniMi(deger, gonderilmis[anahtar])) fark[anahtar] = deger;
  }

  // Alt küme de aynı tipte: `T` indeks imzalı bir kayıt (soru kimliği → cevap).
  // `Partial<T>` demek her değeri `| undefined` yapardı ve çağrı yerinde tip düşerdi.
  return fark as T;
}

/**
 * Cevap değerleri sayı, dize, dizi ya da nesne olabiliyor (ölçü grubu, yük girişi).
 * Yüzeysel karşılaştırma nesne cevapları her seferinde "değişmiş" sayardı.
 */
function ayniMi(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
