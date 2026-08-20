import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { Dugme, Ekran, Kart, Sayi, Satir, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

/**
 * "Nasıl çalışır" — 134 sorudan önceki tek ekran.
 *
 * Amacı dönüşüm değil, beklenti yönetimi: kullanıcı 12 dakika harcayacağını ve karşılığında
 * ne alacağını buradan bilerek girsin. Sürprizle terk, bilgiyle terkten pahalıdır.
 */
export default function NasilCalisir() {
  const tema = useTema();
  const m = useMetinler().giris.nasilCalisir;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.baslik }} />
      <Ekran>
        <Yazi tur="baslik1">{m.ustBaslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        {m.adimlar.map((adim, sira) => (
          <Adim
            key={adim.baslik}
            numara={sira + 1}
            baslik={adim.baslik}
            sure={adim.sure}
            govde={adim.govde}
          />
        ))}

        <Kart vurgulu>
          <Yazi tur="baslik3">{m.uyariBaslik}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.uyariGovde}
          </Yazi>
        </Kart>

        <Dugme baslik={m.devamEt} onPress={() => router.push('/(giris)/kayit')} />
        <View style={{ height: tema.bosluk.xl }} />
      </Ekran>
    </>
  );
}

function Adim({
  numara,
  baslik,
  sure,
  govde,
}: {
  numara: number;
  baslik: string;
  sure: string;
  govde: string;
}) {
  const tema = useTema();

  return (
    <Kart>
      <Satir dagit="space-between" hizala="flex-start">
        <Satir arasi="md">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: tema.renk.aksanZemin,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sayi tur="kucuk" renk="aksan">
              {numara}
            </Sayi>
          </View>
          <Yazi tur="baslik3">{baslik}</Yazi>
        </Satir>
        <Yazi tur="etiket" renk="metinSilik">
          {sure}
        </Yazi>
      </Satir>
      <Yazi tur="kucuk" renk="metinYumusak">
        {govde}
      </Yazi>
    </Kart>
  );
}
