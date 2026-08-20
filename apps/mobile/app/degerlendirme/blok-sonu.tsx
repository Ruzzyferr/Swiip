import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Dugme, Ekran, Kart, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

/**
 * Blok sonu geri bildirimi (F2.8).
 *
 * Terk oranına karşı en güçlü kozumuz. Kural: buradaki her cümle gerçek bir hesaptan gelir.
 * Kutlama yok, konfeti yok, "harikasın" yok — sadece o ana kadar ne öğrendiğimiz.
 */

export default function BlokSonu() {
  const tema = useTema();
  const degerlendirme = useMetinler().degerlendirme;
  const m = degerlendirme.blokSonu;
  const { blok, metin } = useLocalSearchParams<{ blok: string; metin: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flex: 1,
          backgroundColor: tema.renk.zemin,
          justifyContent: 'center',
          paddingHorizontal: tema.bosluk.lg,
        }}
      >
        <Ekran kaydirilabilir={false}>
          <Yazi tur="etiket" renk="aksan">
            {m.bolum} {blok}
          </Yazi>
          <Yazi tur="baslik1">
            {m.basliklar[(blok ?? '') as keyof typeof m.basliklar] ?? m.varsayilanBaslik}
          </Yazi>

          <Kart vurgulu>
            <Yazi tur="baslik3">{metin}</Yazi>
          </Kart>

          <Yazi tur="kucuk" renk="metinSilik">
            {m.dipnot}
          </Yazi>

          <Dugme baslik={degerlendirme.devamEtDugmesi} onPress={() => router.back()} />
        </Ekran>
      </View>
    </>
  );
}
