import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Dugme, Ekran, MetinAlani, ParolaAlani, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler, useOturum } from '../../src/durum/Oturum';
import { sozlukKaresiniBekle } from '../../src/gezinme/oturumSonrasi';
import { ApiHatasi } from '../../src/veri/api';

export default function Giris() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.giris.girisYap;
  const { girisYap } = useOturum();

  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async () => {
    if (yukleniyor) return;
    setHata(null);
    setYukleniyor(true);
    try {
      await girisYap(email.trim(), parola);
      await sozlukKaresiniBekle();
      router.replace('/(sekme)/program');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.hata);
    } finally {
      setYukleniyor(false);
    }
  };

  const parolaAlani = useRef<TextInput>(null);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran ortala>
        <Yazi tur="baslik1">{m.baslik}</Yazi>

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.giris.kayit.eposta}
          </Yazi>
          <MetinAlani
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => parolaAlani.current?.focus()}
            accessibilityLabel={metinler.giris.kayit.epostaEtiketi}
          />
        </View>

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.giris.kayit.parola}
          </Yazi>
          <ParolaAlani
            ref={parolaAlani}
            value={parola}
            onChangeText={setParola}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => {
              if (email && parola && !yukleniyor) void gonder();
            }}
            accessibilityLabel={metinler.giris.kayit.parola}
          />
        </View>

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <Dugme
          baslik={m.gonder}
          onPress={() => void gonder()}
          pasif={!email || !parola}
          yukleniyor={yukleniyor}
        />
        <Dugme
          baslik={m.parolamiUnuttum}
          tur="sessiz"
          onPress={() => router.push('/(giris)/parola-unuttum')}
        />
        <Dugme
          baslik={m.hesabimYok}
          tur="sessiz"
          onPress={() => router.replace('/(giris)/nasil-calisir')}
        />
      </Ekran>
    </>
  );
}
