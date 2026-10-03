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
import { ApiHatasi, istek } from '../../src/veri/api';
import { sunucuMetni } from '../../src/veri/sunucuMetni';
import { GIZLILIK_URL, KULLANIM_KOSULLARI_URL } from '../../src/baglantilar';

/**
 * Kayıt + KVKK açık rıza (F0.5, F4.9).
 *
 * Rıza kullanım koşullarının içine gömülmez: ayrı adım, ayrı kutu, her kategori ayrı.
 * Fotoğraf rızası burada istenmez — fotoğraf adımında istenir, çünkü kullanıcı fotoğrafsız
 * da devam edebilir.
 *
 * İki adım: bilgiler → e-postaya gelen kod. Sunucu, adresin kayıtlı olup olmadığını
 * söylemiyor (kayıtlıysa koda bedel "zaten hesabın var" postası gidiyor); ekran da
 * söylemiyor. Kod adımının metni iki durumda aynı.
 */

type Adim = 'bilgi' | 'kod';

interface KodYaniti {
  kod?: string;
  mesaj: string;
  degerler?: Record<string, string | number>;
}
export default function Kayit() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.giris.kayit;
  const { kayitOl } = useOturum();

  const [adim, setAdim] = useState<Adim>('bilgi');
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [kod, setKod] = useState('');
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [saglikOnayi, setSaglikOnayi] = useState(false);
  const [olcumOnayi, setOlcumOnayi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const kodIste = async () => {
    if (yukleniyor) return;
    setHata(null);
    setYukleniyor(true);
    try {
      const yanit = await istek<KodYaniti>('/v1/kimlik/kayit-kod', {
        yontem: 'POST',
        govde: { email: email.trim() },
        yetkisiz: true,
      });
      setBilgi(sunucuMetni(yanit, metinler) ?? yanit.mesaj);
      setKod('');
      setAdim('kod');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : metinler.genel.hata);
    } finally {
      setYukleniyor(false);
    }
  };

  const gonder = async () => {
    if (yukleniyor) return;
    setHata(null);
    setYukleniyor(true);
    try {
      await kayitOl({
        email: email.trim(),
        parola,
        kod: kod.trim(),
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
        {adim === 'kod' ? (
          <>
            <Yazi tur="baslik1">{m.kodBasligi}</Yazi>
            {bilgi ? (
              <Kart>
                <Yazi renk="metinYumusak">{bilgi}</Yazi>
                <Yazi tur="kucuk">{email.trim()}</Yazi>
              </Kart>
            ) : null}

            <View style={{ gap: tema.bosluk.sm }}>
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.kodEtiketi}
              </Yazi>
              <MetinAlani
                value={kod}
                onChangeText={(deger) => setKod(deger.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="go"
                onSubmitEditing={() => {
                  if (kod.length === 6) void gonder();
                }}
                accessibilityLabel={m.kodErisim}
                style={{
                  letterSpacing: 6,
                  fontVariant: ['tabular-nums'] as const,
                  fontFamily: tema.tipografi.aileler.sayisal,
                }}
              />
            </View>

            {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

            <Dugme
              baslik={m.gonder}
              onPress={() => void gonder()}
              pasif={kod.length !== 6}
              yukleniyor={yukleniyor}
            />
            <Dugme
              baslik={m.tekrarGonder}
              tur="sessiz"
              onPress={() => void kodIste()}
              yukleniyor={yukleniyor}
            />
            <Dugme
              baslik={m.epostayiDegistir}
              tur="sessiz"
              onPress={() => {
                setHata(null);
                setAdim('bilgi');
              }}
            />
          </>
        ) : (
          <>
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
              baslik={m.devam}
              onPress={() => void kodIste()}
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
          </>
        )}
      </Ekran>
    </>
  );
}
