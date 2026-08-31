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
 * ATT (izleme izni) KURULU DEĞİL — ve bu bir eksiklik değil, gereklilik.
 *
 * `expo-tracking-transparency` bir süre "ileride lazım olur" diye kuruluydu. Hiçbir
 * dosyadan çağrılmıyordu ama eklenti yapılandırması Info.plist'e
 * `NSUserTrackingUsageDescription` yazıyordu ve App Store gönderimi tam bu yüzden
 * reddedildi:
 *
 *   "Your app contains NSUserTrackingUsageDescription, indicating that it may request
 *    permission to track users. To submit for review, update your App Privacy response
 *    to indicate that data collected from this app will be used for tracking purposes,
 *    or update your app binary and upload a new build."
 *
 * İki yol vardı ve biri yalan olurdu: beyanı "izliyoruz" yapmak. İzlemiyoruz —
 * reklamlar kişiselleştirilmemiş, IDFA hiç istenmiyor. Doğru olan, kullanılmayan
 * anahtarı ikiliden çıkarmaktı.
 *
 * DERS: kullanılmayan bir izin metni zararsız değil. Apple ikiliyi okuyor ve beyanla
 * çelişkiyi gönderim anında yakalıyor — üstelik API'nin verdiği hata
 * ("not in valid state") sebebi söylemiyor, yalnızca konsol söylüyor.
 *
 * Kişiselleştirme bir gün açılırsa sıra şu: önce App Privacy'de izleme beyan edilir,
 * sonra paket kurulur, sonra izin istenir. Tersi her seferinde bir tur yakar.
 */
