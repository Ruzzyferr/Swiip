import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Dugme, Ekran, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler, useOturum } from '../../src/durum/Oturum';
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
    setHata(null);
    setYukleniyor(true);
    try {
      await girisYap(email.trim(), parola);
      router.replace('/(sekme)/program');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.hata);
    } finally {
      setYukleniyor(false);
    }
  };

  const girisStili = {
    minHeight: tema.dokunmaHedefi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.renk.cizgi,
    borderRadius: tema.yaricap.md,
    paddingHorizontal: tema.bosluk.lg,
    fontSize: 16,
    color: tema.renk.metin,
    backgroundColor: tema.renk.yuzey,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.giris.kayit.eposta}
          </Yazi>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel={metinler.giris.kayit.epostaEtiketi}
            style={girisStili}
          />
        </View>

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.giris.kayit.parola}
          </Yazi>
          <TextInput
            value={parola}
            onChangeText={setParola}
            secureTextEntry
            autoComplete="current-password"
            accessibilityLabel={metinler.giris.kayit.parola}
            style={girisStili}
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
