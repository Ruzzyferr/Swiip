/**
 * Hangi dilin besin ve tarif verisi kullanılacak? (F10.2, F10.4)
 *
 * `foods.locale` ve `recipes.locale` sütunları ilk günden beri şemada — hatta
 * `(locale, name_tr)` indeksi de var. Ama **hiçbir sorgu bu sütuna bakmıyordu.**
 * İkinci pazarın verisi eklendiği an iki dil karışacaktı: Türkçe kullanıcı aramada
 * İngilizce besin adları görecek, İngilizce kullanıcı Türkçe tarif alacaktı.
 *
 * Sütunu eklemek yetmiyor; sorguların onu kullanması gerekiyor. Bu modül "bu kullanıcı
 * hangi veri kümesini görür" sorusunun tek cevabı.
 *
 * ---
 *
 * **Şu an tek bir veri kümesi var: Türkçe.**
 *
 * Arayüz İngilizce olabiliyor ama besin ve tarif içeriği Türkçe; ayarlardaki dil notu
 * bunu kullanıcıya açıkça söylüyor. İngilizce kullanıcıya boş bir besin veritabanı
 * vermek, uygulamayı onun için çalışmaz hâle getirirdi.
 *
 * İkinci pazar eklendiğinde yapılacak tek şey `VERI_YERELLERI`'ne yeni yereli yazmak;
 * sorgular kendiliğinden ayrışır.
 */

/** Gerçekten veri bulunan yereller. Sıra önemsiz; eşleşme dile göre yapılıyor. */
export const VERI_YERELLERI = ['tr-TR'] as const;

export type VeriYereli = (typeof VERI_YERELLERI)[number];

/** Veri kümesi olmayan diller bu yerele düşer. */
export const VARSAYILAN_VERI_YERELI: VeriYereli = 'tr-TR';

/**
 * Kullanıcının `locale` alanından veri yerelini çözer.
 *
 * Önce birebir eşleşme ("en-US" → "en-US"), sonra dil eşleşmesi ("en-GB" → "en-US"),
 * sonra varsayılan. Bölge farkı yüzünden kullanıcıyı veri kümesiz bırakmıyoruz.
 */
export function veriYereli(kullaniciLocale: string | null | undefined): VeriYereli {
  if (!kullaniciLocale) return VARSAYILAN_VERI_YERELI;

  const ham = kullaniciLocale.trim();
  const birebir = VERI_YERELLERI.find((y) => y.toLowerCase() === ham.toLowerCase());
  if (birebir) return birebir;

  const dil = ham.toLowerCase().split('-')[0];
  const dilEslesmesi = VERI_YERELLERI.find((y) => y.toLowerCase().split('-')[0] === dil);
  if (dilEslesmesi) return dilEslesmesi;

  return VARSAYILAN_VERI_YERELI;
}

/**
 * Kullanıcı kendi dilinin verisini mi görüyor, yoksa yedeğe mi düştü?
 *
 * Arayüz bunu söyleyebilmeli: "tarifler şimdilik yalnızca Türkçe" cümlesi ancak
 * gerçekten öyleyse gösterilmeli.
 */
export function kendiVerisiMi(kullaniciLocale: string | null | undefined): boolean {
  const dil = (kullaniciLocale ?? '').toLowerCase().split('-')[0];
  return veriYereli(kullaniciLocale).toLowerCase().split('-')[0] === dil;
}
