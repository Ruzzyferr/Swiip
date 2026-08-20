import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Dugme, Ekran, Kart, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

/**
 * Güvenlik kapısı ekranı (F2.7).
 *
 * Tasarım ilkesi: kullanıcıyı suçlamaz ve kapıyı çarpmaz.
 * Ne olduğu, neden olduğu ve ne yapabileceği söylenir. Verisi silinmez.
 */

type KapiTipi = 'yas' | 'gebelik' | 'kardiyak' | 'yeme_bozuklugu';

export default function Kapi() {
  const tema = useTema();
  const metinler = useMetinler();
  const k = metinler.kapiEkrani;
  const { tip } = useLocalSearchParams<{ tip: KapiTipi }>();

  const icerik = {
    yas: {
      ...metinler.kapilar.yas,
      eylem: null,
      geriDon: k.anladim,
      devamEdilebilir: false,
    },
    gebelik: {
      ...metinler.kapilar.gebelik,
      eylem: null,
      geriDon: k.anladim,
      devamEdilebilir: false,
    },
    kardiyak: {
      ...metinler.kapilar.kardiyak,
      eylem: metinler.kapilar.kardiyak.eylem,
      geriDon: k.simdilikDevam,
      devamEdilebilir: true,
    },
    yeme_bozuklugu: {
      ...metinler.kapilar.yemeBozuklugu,
      eylem: null,
      geriDon: k.devamEt,
      devamEdilebilir: true,
    },
  }[tip ?? 'kardiyak'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Ekran kaydirilabilir={false} ustGuvenliAlan>
          <Yazi tur="baslik1">{icerik.baslik}</Yazi>
          <Yazi renk="metinYumusak">{icerik.govde}</Yazi>

          <Kart>
            <Yazi tur="kucuk" renk="metinSilik">
              {k.duraklama}
            </Yazi>
          </Kart>

          {icerik.eylem ? (
            <Dugme baslik={icerik.eylem} onPress={() => router.push('/(sekme)/ayarlar')} />
          ) : null}

          <Dugme
            baslik={icerik.geriDon}
            tur={icerik.eylem ? 'sessiz' : 'birincil'}
            onPress={() => {
              if (icerik.devamEdilebilir) router.back();
              else router.replace('/');
            }}
          />
        </Ekran>
      </View>
    </>
  );
}
