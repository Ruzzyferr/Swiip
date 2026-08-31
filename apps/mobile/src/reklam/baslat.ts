import { Platform } from 'react-native';
import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';

/**
 * Reklam SDK'sının başlatılması, onay ve içerik sınırları.
 *
 * Sıra önemli ve bir kez kurulur: **önce onay, sonra başlatma.** Ters sırada SDK
 * onay alınmadan istek atabiliyor; bu AB'de GDPR, İngiltere'de UK GDPR ihlali.
 *
 * ## Kişiselleştirilmiş reklam istemiyoruz — bilinçli
 *
 * Kişiselleştirme daha yüksek eCPM getirir ama bedeli bir SAĞLIK uygulaması için
 * ağır: Apple'ın App Privacy beyanında "Data Used to Track You" açmak gerekir.
 * Şu anki beyanımız 8 veri türü, hepsi "App Functionality", **hiçbiri izleme için**
 * ve bu beyan sağlık verisi tutan bir uygulama için doğru olan. İzleme açmak hem
 * inceleme riskini yükseltir hem de "fotoğrafı sunucuya bile yazmıyoruz" diyen bir
 * ürünle çelişir.
 *
 * Onay formu yine de gösteriliyor: kullanıcı kendi isterse kişiselleştirmeyi
 * açabilir. Varsayılan, açık rızası olmadan **genel reklam**.
 */

/** Onay ve başlatma yalnızca bir kez. */
let baslatildi = false;

export async function reklamlariBaslat(): Promise<void> {
  if (baslatildi) return;
  baslatildi = true;

  try {
    /*
     * 1) Onay bilgisi tazelenir. Bölgeye göre form gerekip gerekmediğini Google
     *    kendi belirliyor; AEA/İngiltere dışında genelde form çıkmıyor.
     */
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch {
    /*
     * Onay akışı çökerse reklam YİNE gösterilir ama kişiselleştirilmemiş olarak —
     * `requestNonPersonalizedAdsOnly` bileşen tarafında zaten sabit. Buradaki hata
     * kullanıcıya yansımamalı: reklamın başarısızlığı uygulamayı bozmaz.
     */
  }

  try {
    await mobileAds().setRequestConfiguration({
      /*
       * İçerik sınırı `PG`. Uygulamanın App Store yaş derecelendirmesi 9+ ve
       * kategorisi Health & Fitness; bu bağlamda kilo verme hapı, mucize diyet ve
       * estetik cerrahi reklamları hem Apple 1.4.1 riski hem marka zararı.
       *
       * Kategori bazlı engelleme AdMob konsolundan ayrıca yapılıyor; bu satır
       * SDK'nın kendi tavanı.
       */
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      /*
       * 18 yaş kapısı olan bir uygulamayız (`K7`), yani kullanıcı reşit.
       * Yine de `false` yazmak "bilinmiyor" demek değil; açıkça beyan.
       */
      tagForUnderAgeOfConsent: false,
    });

    await mobileAds().initialize();
  } catch {
    // SDK başlatılamazsa reklam çizilmez; uygulama etkilenmez.
  }
}

/**
 * iOS izleme izni (ATT).
 *
 * ÇAĞRILMIYOR ve bu bilinçli: izin istemek yalnızca IDFA ile izleme yapacaksak
 * anlamlı. Kişiselleştirme kapalıyken ATT sormak, kullanıcıya hiçbir karşılığı
 * olmayan bir izin penceresi göstermek olurdu — Apple da bunu "gereksiz istem"
 * sayıyor.
 *
 * Eklenti yine de kurulu: kişiselleştirme açılmak istenirse tek çağrı yeter ve
 * `NSUserTrackingUsageDescription` metni `app.json`'da hazır.
 */
export const IZLEME_IZNI_ISTENMIYOR = Platform.OS === 'ios';
