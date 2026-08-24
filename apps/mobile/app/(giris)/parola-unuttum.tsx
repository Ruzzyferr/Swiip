import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Dugme, Ekran, Kart, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { ApiHatasi, istek } from '../../src/veri/api';
import { useMetinler } from '../../src/durum/Oturum';

/**
 * Parola sıfırlama — tek ekran, iki adım.
 *
 * Sunucu, hesabın var olup olmadığını söylemez; ekran da söylemez. "Kod gönderildi"
 * mesajı her iki durumda da aynı. Kullanıcı numaralandırma saldırısı böyle engellenir.
 */

type Adim = 'eposta' | 'kod';

interface IstekYaniti {
  mesaj: string;
  gecerlilik_dakika: number;
}

export default function ParolaUnuttum() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.giris.parolaSifirlama;

  const [adim, setAdim] = useState<Adim>('eposta');
  const [email, setEmail] = useState('');
  const [kod, setKod] = useState('');
  const [yeniParola, setYeniParola] = useState('');
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const girisStili = {
    minHeight: tema.dokunmaHedefi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.renk.kenar,
    borderRadius: tema.yaricap.md,
    paddingHorizontal: tema.bosluk.lg,
    fontSize: 16,
    fontFamily: tema.tipografi.aileler.govde,
    color: tema.renk.metin,
    backgroundColor: tema.renk.yuzey,
  };

  const kodIste = async () => {
    setHata(null);
    setYukleniyor(true);
    try {
      const yanit = await istek<IstekYaniti>('/v1/kimlik/parola-sifirla-istek', {
        yontem: 'POST',
        govde: { email: email.trim() },
        yetkisiz: true,
      });
      setBilgi(yanit.mesaj);
      setAdim('kod');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.istekHatasi);
    } finally {
      setYukleniyor(false);
    }
  };

  const sifirla = async () => {
    setHata(null);
    setYukleniyor(true);
    try {
      await istek('/v1/kimlik/parola-sifirla', {
        yontem: 'POST',
        govde: { email: email.trim(), kod: kod.trim(), yeni_parola: yeniParola },
        yetkisiz: true,
      });
      router.replace('/(giris)/giris');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.degistirHatasi);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        {adim === 'eposta' ? (
          <>
            <Yazi tur="baslik1">{m.baslik}</Yazi>
            <Yazi renk="metinYumusak">{m.aciklama}</Yazi>

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

            {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

            <Dugme
              baslik={m.kodGonder}
              onPress={() => void kodIste()}
              pasif={!email}
              yukleniyor={yukleniyor}
            />
          </>
        ) : (
          <>
            <Yazi tur="baslik1">{m.kodBasligi}</Yazi>
            {bilgi ? (
              <Kart>
                <Yazi renk="metinYumusak">{bilgi}</Yazi>
              </Kart>
            ) : null}

            <View style={{ gap: tema.bosluk.sm }}>
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.kodEtiketi}
              </Yazi>
              <TextInput
                value={kod}
                onChangeText={(deger) => setKod(deger.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                accessibilityLabel={m.kodErisim}
                style={[girisStili, { letterSpacing: 6, fontVariant: ['tabular-nums'] as const }]}
              />
            </View>

            <View style={{ gap: tema.bosluk.sm }}>
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.yeniParola}
              </Yazi>
              <TextInput
                value={yeniParola}
                onChangeText={setYeniParola}
                secureTextEntry
                autoComplete="new-password"
                accessibilityLabel={m.yeniParola}
                style={girisStili}
              />
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.yeniParolaIpucu}
              </Yazi>
            </View>

            {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

            <Dugme
              baslik={m.degistir}
              onPress={() => void sifirla()}
              pasif={kod.length !== 6 || !yeniParola}
              yukleniyor={yukleniyor}
            />
            <Dugme
              baslik={m.tekrarGonder}
              tur="sessiz"
              onPress={() => void kodIste()}
              yukleniyor={yukleniyor}
            />
          </>
        )}
      </Ekran>
    </>
  );
}
