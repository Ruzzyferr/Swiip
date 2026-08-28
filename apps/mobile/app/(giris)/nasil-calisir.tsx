import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { Dugme, Ekran, Kart, Sayi, Satir, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

/**
 * "Nasıl çalışır" — değerlendirmeden önceki tek ekran.
 *
 * Amacı dönüşüm değil, beklenti yönetimi: kullanıcı dört-altı dakika harcayacağını ve karşılığında
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
          {m.uyariMaddeler.map((madde) => (
            <Yazi key={madde} tur="kucuk" renk="metinYumusak">
              {'•  '}
              {madde}
            </Yazi>
          ))}
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
        {/*
          `esnek` — yani `flex: 1`. Olmadan bu iç satır kendi doğal genişliğini
          alıyor ve sağdaki süre etiketini kartın dışına itiyordu: 320 dp'de
          %130 yazı tipiyle "15 saniye" ekranda "15 saniy" diye kesiliyordu.
          Daralınca başlık METİN olarak sarıyor — satırın kendisi sarmıyor,
          yani numara dairesi başlığın yanında kalıyor.
        */}
        <Satir arasi="md" hizala="flex-start" esnek>
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
