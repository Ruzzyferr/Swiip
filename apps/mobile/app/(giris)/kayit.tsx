import { useRef, useState } from 'react';
import { Linking, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  BaglantiSatiri,
  Dugme,
  Ekran,
  Kart,
  MetinAlani,
  ParolaAlani,
  SecimDugmesi,
  Uyari,
  Yazi,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler, useOturum } from '../../src/durum/Oturum';
import { sozlukKaresiniBekle } from '../../src/gezinme/oturumSonrasi';
import { ApiHatasi } from '../../src/veri/api';
import { GIZLILIK_URL, KULLANIM_KOSULLARI_URL } from '../../src/baglantilar';

/**
 * Kayıt + KVKK açık rıza (F0.5, F4.9).
 *
 * Rıza kullanım koşullarının içine gömülmez: ayrı adım, ayrı kutu, her kategori ayrı.
 * Fotoğraf rızası burada istenmez — fotoğraf adımında istenir, çünkü kullanıcı fotoğrafsız
 * da devam edebilir.
 */
export default function Kayit() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.giris.kayit;
  const { kayitOl } = useOturum();

  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [saglikOnayi, setSaglikOnayi] = useState(false);
  const [olcumOnayi, setOlcumOnayi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async () => {
    if (yukleniyor) return;
    setHata(null);
    setYukleniyor(true);
    try {
      await kayitOl({
        email: email.trim(),
        parola,
        saglik_onayi: saglikOnayi,
        olcum_onayi: olcumOnayi,
      });
      await sozlukKaresiniBekle();
      router.replace('/degerlendirme');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : metinler.genel.hata);
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
            {m.eposta}
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
            accessibilityLabel={m.epostaEtiketi}
          />
        </View>

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.parola}
          </Yazi>
          {/* Rıza kutusu hâlâ işaretlenecek: "gönder" değil "bitti" — klavyeyi kapatır. */}
          <ParolaAlani
            ref={parolaAlani}
            value={parola}
            onChangeText={setParola}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            accessibilityLabel={m.parola}
          />
          <Yazi tur="etiket" renk="metinSilik">
            {m.parolaIpucu}
          </Yazi>
        </View>

        <Kart>
          <Yazi tur="baslik3">{m.rizaBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.rizaGovde}
          </Yazi>
          <SecimDugmesi
            baslik={m.saglikRizasi}
            secili={saglikOnayi}
            onPress={() => setSaglikOnayi(!saglikOnayi)}
            cokluSecim
          />
          <SecimDugmesi
            baslik={m.olcumRizasi}
            aciklama={m.olcumRizasiAciklama}
            secili={olcumOnayi}
            onPress={() => setOlcumOnayi(!olcumOnayi)}
            cokluSecim
          />
        </Kart>

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <Dugme
          baslik={m.gonder}
          onPress={() => void gonder()}
          pasif={!email || !parola || !saglikOnayi}
          yukleniyor={yukleniyor}
        />

        {/*
          Kullanım koşulları ve gizlilik politikası BURADA da duruyor.

          İki bağlantı yalnızca paywall'da vardı. Yani hesap açan ama hiç ödeme
          ekranına girmeyen kullanıcı — yani kullanıcıların çoğu — sözleşmeyi ve
          gizlilik metnini uygulama içinde hiç göremiyordu. Hem KVKK aydınlatma
          yükümlülüğü hem de iki mağazanın hesap açma gerekliliği burayı işaret ediyor:
          rızanın istendiği ekran, metnin okunabildiği ekran olmalı.
        */}
        <View>
          <BaglantiSatiri
            ilk
            baslik={m.kullanimKosullari}
            onPress={() => void Linking.openURL(KULLANIM_KOSULLARI_URL)}
          />
          <BaglantiSatiri
            baslik={m.gizlilikPolitikasi}
            onPress={() => void Linking.openURL(GIZLILIK_URL)}
          />
        </View>

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.yasNotu}
        </Yazi>
      </Ekran>
    </>
  );
}
