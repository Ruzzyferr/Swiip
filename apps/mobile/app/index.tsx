import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Dugme, Yazi, Yukleniyor } from '../src/tasarim/bilesenler';
import { useTema } from '../src/tasarim/tema';
import { useMetinler, useOturum } from '../src/durum/Oturum';
import { Isaret } from '../src/marka/Isaret';

/**
 * Karşılama ekranı.
 *
 * Vaat tek cümlede: programı değil, programın gerekçesini satıyoruz.
 * "Kişiselleştirilmiş" kelimesi burada da hiçbir yerde de geçmez.
 */
export default function Karsilama() {
  const tema = useTema();
  const metinler = useMetinler();
  const { kullanici, hazir } = useOturum();

  useEffect(() => {
    if (hazir && kullanici) router.replace('/(sekme)/program');
  }, [hazir, kullanici]);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={metinler.giris.aciliyor} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tema.renk.zemin,
        padding: tema.bosluk.xl,
        justifyContent: 'space-between',
        paddingTop: tema.bosluk.xxxl * 2,
        paddingBottom: tema.bosluk.xxl,
      }}
    >
      <View style={{ gap: tema.bosluk.xl }}>
        <Isaret renk={tema.renk.aksan} />

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="dev">{metinler.giris.slogan}</Yazi>
          <Yazi tur="baslik3" renk="metinYumusak">
            {metinler.giris.altSlogan}
          </Yazi>
        </View>

        <View style={{ gap: tema.bosluk.md, marginTop: tema.bosluk.lg }}>
          {metinler.giris.maddeler.map((madde) => (
            <Madde key={madde} metin={madde} />
          ))}
        </View>
      </View>

      <View style={{ gap: tema.bosluk.md }}>
        <Dugme
          baslik={metinler.giris.basla}
          onPress={() => router.push('/(giris)/nasil-calisir')}
        />
        <Dugme
          baslik={metinler.giris.hesabimVar}
          tur="sessiz"
          onPress={() => router.push('/(giris)/giris')}
        />
      </View>
    </View>
  );
}

function Madde({ metin }: { metin: string }) {
  const tema = useTema();
  return (
    <View style={{ flexDirection: 'row', gap: tema.bosluk.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: tema.renk.aksan,
          marginTop: 9,
        }}
      />
      <Yazi renk="metinYumusak" stil={{ flex: 1 }}>
        {metin}
      </Yazi>
    </View>
  );
}
