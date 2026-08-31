import { useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { birimKimligi } from './kimlikler';
import { useReklamHakki } from './ReklamHakki';
import { useTema } from '../tasarim/tema';

/**
 * Alt banner.
 *
 * **Üç koşulun üçü de sağlanmadan hiçbir şey çizilmiyor:**
 *
 *  1. Sunucu bu kullanıcıya reklam gösterilebileceğini söylemiş olmalı (`goster`).
 *  2. Cevap gerçekten gelmiş olmalı (`bilindi`) — yükleme sırasında ödeyen bir
 *     kullanıcıya reklam göstermek, `rakip-analizi.md`'deki 1★/8 beğenili yorumun
 *     ta kendisi.
 *  3. Reklam yüklenmiş olmalı (`yuklendi`) — yüklenmeden yer ayırmak, dolmayan bir
 *     boşluk bırakıyor ve listenin altında sebepsiz bir delik gibi duruyor.
 *
 * **Yükseklik SABİT — reklam gelse de gelmese de.**
 *
 * Banner artık sayfanın ortasında duruyor (kalori kartının altında, "Neden bu
 * program"ın altında, "Bugünkü kilon"un altında). Orada yüksekliğin değişmesi,
 * altındaki kartların reklam yüklendiği anda aşağı zıplaması demek — kullanıcı tam
 * o sırada okuyor ya da bir düğmeye uzanıyor olabilir.
 *
 * Bu depoda 2. kusur tam olarak buydu: bir bloğun belirip kaybolması listeyi 310 px
 * kaydırıyor ve kullanıcı yanlış şıkka dokunuyordu. Kural oradan doğdu ve reklam
 * onu bozmuyor: yer BAŞTAN ayrılıyor.
 *
 * Bedeli dürüstçe söylenmeli: reklam dolmazsa orada boş bir şerit kalıyor. Doluluk
 * oranı düşükken bu görünür bir maliyet — ama alternatifi, içeriğin parmağın
 * altından kaymasıydı.
 */
/**
 * Ayrılan yükseklik.
 *
 * `ANCHORED_ADAPTIVE_BANNER` telefon genişliklerinde 50-60 dp arasında geliyor;
 * 60 hepsini kapsıyor ve reklam kabın içinde ortalanıyor. Sabit bir sayı, çünkü
 * ölçüp sonra büyümek zıplamanın ta kendisi.
 */
const BANNER_YUKSEKLIGI = 60;

export function ReklamBanner() {
  const { goster, bilindi } = useReklamHakki();
  const [yuklendi, setYuklendi] = useState(false);
  const tema = useTema();

  if (!bilindi || !goster) return null;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: tema.bosluk.md,
        height: BANNER_YUKSEKLIGI,
        overflow: 'hidden',
        opacity: yuklendi ? 1 : 0,
      }}
    >
      <BannerAd
        unitId={birimKimligi('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          /*
           * Kişiselleştirme kapalı — gerekçesi `baslat.ts`'te: bir sağlık
           * uygulamasında Apple'ın "Data Used to Track You" beyanını açmanın
           * bedeli, kişiselleştirmenin getirdiği eCPM farkından ağır.
           */
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => setYuklendi(true)}
        onAdFailedToLoad={() => setYuklendi(false)}
      />
    </View>
  );
}
