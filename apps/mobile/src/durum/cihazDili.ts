import { BCP47, DILLER, type Dil } from '@swiip/shared';

/**
 * Cihazın dili — yalnızca kullanıcının açık bir tercihi YOKKEN.
 *
 * Uzun süre böyle bir şey yoktu ve gerekçesi `Oturum.tsx`'te yazılıydı: "Türkiye'de
 * İngilizce telefon kullanan çok kişi var ve uygulamanın Türkçe içeriğini görmek
 * istiyorlar." Türkiye'ye satılan bir ürün için doğruydu.
 *
 * Global açılımda aynı karar tersine dönüyor. Ölçüldü (2026-08-31): oturum açılmamış
 * arayüz HER cihazda Türkçe çiziliyordu ve kayıt ucu `locale` alanını `tr-TR`
 * varsayılanıyla dolduruyordu — yani Almanya'da açılan bir hesap da Türkçe
 * kaydediliyordu. 175 ülkeye açılan bir uygulamada karşılama ekranının herkese Türkçe
 * çıkması, mağaza sayfası Almanca olsa bile ilk saniyede kaybetmek demek.
 *
 * Kural şimdi şu:
 *  - Kullanıcının `locale` alanı varsa o kazanır. Açık tercih hâlâ en üstte.
 *  - Yoksa cihazın dili okunur.
 *  - Cihazın dili desteklenmiyorsa **İngilizce** — Türkçe değil. Romanyalı bir
 *    kullanıcı için İngilizce, Türkçeden her koşulda daha yakın.
 *
 * `Intl` kullanılıyor, `expo-localization` değil: ikincisi natif bir modül ve yalnızca
 * bunun için yeni bir derleme bağımlılığı eklemeye değmez. Hermes `Intl`i iki platformda
 * da açık getiriyor; yine de bir `try` içinde, çünkü bu değer yoksa uygulama
 * açılmamalı değil, sadece İngilizceye düşmeli.
 */
export function cihazDili(): Dil {
  try {
    const etiket = Intl.DateTimeFormat().resolvedOptions().locale;
    const taban = etiket.split('-')[0]?.toLowerCase();
    const bulunan = DILLER.find((d) => d === taban);
    if (bulunan) return bulunan;
  } catch {
    // Intl yoksa aşağıdaki yedek geçerli.
  }
  return 'en';
}

/**
 * Kayıt sırasında sunucuya gönderilen etiket.
 *
 * Sunucu `locale` alanını BCP47 bekliyor (`tr-TR`, `en-US`) ve gövdede gelmezse
 * `tr-TR` varsayıyor. Gönderilmediği sürece dünyanın her yerinde açılan her hesap
 * Türkçe doğuyordu.
 */
export function kayitDili(): string {
  return BCP47[cihazDili()];
}
