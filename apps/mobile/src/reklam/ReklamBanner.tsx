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
 * **Yer kaplamıyor.** Bileşen yüklenene kadar `height: 0`; yani reklam gelmezse
 * sayfa düzeni hiç değişmiyor. Önceden yer ayırıp sonra doldurmak, kullanıcı
 * kaydırırken içeriğin zıplamasına yol açardı — bu depoda 2. kusur tam olarak
 * buydu ve "bir listenin üstündeki hiçbir şey belirip kaybolmaz" kuralı oradan
 * doğdu. Banner listenin ALTINDA olduğu için oradaki kuralı bozmuyor, ama aynı
 * disiplin burada da geçerli.
 */
export function ReklamBanner() {
  const { goster, bilindi } = useReklamHakki();
  const [yuklendi, setYuklendi] = useState(false);
  const tema = useTema();

  if (!bilindi || !goster) return null;

  return (
    <View
      style={{
        alignItems: 'center',
        marginTop: yuklendi ? tema.bosluk.md : 0,
        height: yuklendi ? undefined : 0,
        overflow: 'hidden',
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
