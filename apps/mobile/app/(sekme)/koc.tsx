import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  OKUMA_GENISLIGI,
  BosDurum,
  Dugme,
  Etiket,
  Kart,
  Satir,
  Sutun,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';
import { ApiHatasi, istek } from '../../src/veri/api';

/**
 * Koç sohbeti (F9).
 *
 * Serbest bir chatbot değil: koç kullanıcının kendi verisine bakar. Hangi araçların
 * çalıştığı cevabın altında görünür — "genel tavsiye" ile "senin verine bakarak"
 * arasındaki farkı kullanıcının görmesi ürünün tezinin bir parçası.
 */

interface Mesaj {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  araclar?: string[];
  kategori?: string;
}

interface CevapGovdesi {
  cevap: string;
  kaynak: 'model' | 'sinir' | 'yedek';
  kategori?: string;
  kullanilan_araclar?: string[];
  kalan?: number;
}

export default function Koc() {
  const tema = useTema();
  const m = useMetinler().koc;
  const kaydirma = useRef<ScrollView>(null);

  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [girdi, setGirdi] = useState('');
  const [hazir, setHazir] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [kilit, setKilit] = useState<string | null>(null);
  const [kalan, setKalan] = useState<number | null>(null);
  /** Planın toplam hakkı. 0 ise koç bu planda HİÇ açık değil. */
  const [toplamHak, setToplamHak] = useState<number | null>(null);

  const yukle = useCallback(async () => {
    try {
      const gecmis = await istek<{ mesajlar: Mesaj[] }>('/v1/koc/gecmis');
      setMesajlar(gecmis.mesajlar);
    } catch {
      setMesajlar([]);
    }

    /**
     * Kalan mesaj hakkı AÇILIŞTA okunuyor.
     *
     * Önce yalnızca gönderdikten sonraki cevaptan geliyordu: ödeme yapan kullanıcı
     * koçu açtığında kaç hakkı kaldığını göremiyordu. Ölçülen bir özellikte sayacın
     * yeri, ölçüm başlamadan önce.
     */
    try {
      const durum = await istek<{
        kota?: { koc_sohbeti?: { kalan?: number; toplam?: number } };
      }>('/v1/abonelik/durum');
      const hak = durum.kota?.koc_sohbeti?.kalan;
      if (typeof hak === 'number') setKalan(hak);
      const toplam = durum.kota?.koc_sohbeti?.toplam;
      if (typeof toplam === 'number') setToplamHak(toplam);
    } catch {
      // Kota okunamazsa sayacı hiç göstermiyoruz; yanlış sayı göstermekten iyidir.
    }

    setHazir(true);
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  /**
   * Koç şu an kullanılabilir mi?
   *
   * Kota 0 iken ekran hiçbir şey değiştirmiyordu: üç örnek soru teal renkte
   * (uygulamanın eylem rengi) tıklanabilir duruyor, metin kutusu yazılabiliyor ve
   * "Gönder" basılabiliyordu. Kullanıcı yazıyor, basıyor ve 402 duvarına çarpıyordu.
   *
   * Çalışmayan bir metin kutusu, olmayan bir metin kutusundan kötüdür.
   */
  const kocAcik = kalan === null || kalan > 0;

  const gonder = async () => {
    const metin = girdi.trim();
    if (metin === '') return;

    setGirdi('');
    setMesajlar((onceki) => [...onceki, { role: 'user', content: metin }]);
    setGonderiliyor(true);

    try {
      const cevap = await istek<CevapGovdesi>('/v1/koc/mesaj', {
        yontem: 'POST',
        govde: { mesaj: metin },
      });

      setMesajlar((onceki) => [
        ...onceki,
        {
          role: 'assistant',
          content: cevap.cevap,
          ...(cevap.kullanilan_araclar ? { araclar: cevap.kullanilan_araclar } : {}),
          ...(cevap.kategori ? { kategori: cevap.kategori } : {}),
        },
      ]);
      if (typeof cevap.kalan === 'number') setKalan(cevap.kalan);
    } catch (hata) {
      if (hata instanceof ApiHatasi && hata.durum === 402) {
        setKilit(hata.mesaj);
      } else if (hata instanceof ApiHatasi && hata.durum === 429) {
        setKilit(hata.mesaj);
      } else {
        setMesajlar((onceki) => [
          ...onceki,
          {
            role: 'assistant',
            content: m.cevapVeremiyorum,
          },
        ]);
      }
    } finally {
      setGonderiliyor(false);
      setTimeout(() => kaydirma.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  if (kilit) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
        <Sutun>
          <BosDurum baslik={m.kapaliBaslik} govde={kilit} />
          <Dugme baslik={m.planlaraBak} onPress={() => router.push('/odeme/paywall')} />
          <Dugme baslik={m.geri} tur="sessiz" onPress={() => setKilit(null)} />
        </Sutun>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tema.renk.zemin }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/*
        Sohbet de okuma sutununa giriyor. iPad'de tuval 820 pt; sutunsuz birakilirsa
        her mesaj balonu ekran boyunca uzuyor ve sohbet okunmaz hale geliyor.
      */}
      <ScrollView
        ref={kaydirma}
        style={{ width: '100%', maxWidth: OKUMA_GENISLIGI, alignSelf: 'center' }}
        contentContainerStyle={{ padding: tema.bosluk.lg, gap: tema.bosluk.md }}
      >
        {mesajlar.length === 0 ? (
          <View style={{ gap: tema.bosluk.md }}>
            <Yazi renk="metinYumusak">{m.tanitim}</Yazi>
            <Kart>
              <Yazi tur="etiket" renk="metinSilik">
                {m.ornekSorularBasligi}
              </Yazi>
              {m.ornekSorular.map((ornek: string) => (
                <Pressable
                  key={ornek}
                  onPress={kocAcik ? () => setGirdi(ornek) : undefined}
                  disabled={!kocAcik}
                  accessibilityRole={kocAcik ? 'button' : undefined}
                  accessibilityState={{ disabled: !kocAcik }}
                  style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
                >
                  {/*
                    Kota yokken örnek sorular EYLEM RENGİNDE durmuyor.
                    Teal bu üründe "buraya bas" demek; basılınca hiçbir şey olmayan
                    bir davet, hayal kırıklığını kendisi üretiyordu.
                  */}
                  <Yazi tur="kucuk" renk={kocAcik ? 'aksan' : 'metinSilik'}>
                    {ornek}
                  </Yazi>
                </Pressable>
              ))}
            </Kart>
            <Uyari tur="uyari" govde={m.sinirUyarisi} />
          </View>
        ) : null}

        {mesajlar.map((mesaj, i) => (
          <View
            key={mesaj.id ?? i}
            style={{
              alignSelf: mesaj.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              gap: 4,
            }}
          >
            <View
              style={{
                backgroundColor: mesaj.role === 'user' ? tema.renk.aksanZemin : tema.renk.yuzey,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: mesaj.role === 'user' ? tema.renk.aksan : tema.renk.cizgi,
                borderRadius: tema.yaricap.lg,
                padding: tema.bosluk.md,
              }}
            >
              <Yazi tur="kucuk" renk={mesaj.role === 'user' ? 'metin' : 'metinYumusak'}>
                {mesaj.content}
              </Yazi>
            </View>

            {mesaj.araclar && mesaj.araclar.length > 0 ? (
              <Satir arasi="xs">
                <Yazi tur="etiket" renk="metinSilik">
                  {m.baktigimVeri}
                </Yazi>
                {mesaj.araclar.map((arac) => (
                  <Etiket
                    key={arac}
                    metin={m.aracAdlari[arac as keyof typeof m.aracAdlari] ?? arac}
                    tur="aksan"
                  />
                ))}
              </Satir>
            ) : null}

            {mesaj.kategori === 'tani' ? (
              <Yazi tur="etiket" renk="uyari">
                {m.saglikYonlendirmesi}
              </Yazi>
            ) : null}
          </View>
        ))}

        {gonderiliyor ? <Yukleniyor metin={m.dusunuyor} /> : null}
      </ScrollView>

      {/*
        Ayirici cizgi TAM GENISLIKTE, icerik sutunda. Cizgiyi de daraltmak
        genis ekranda cubugu havada duran bir kutuya cevirirdi.
      */}
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tema.renk.cizgi,
          backgroundColor: tema.renk.yuzey,
        }}
      >
        <Sutun stil={{ padding: tema.bosluk.md, gap: tema.bosluk.sm }}>
          {kalan !== null ? (
            <Yazi tur="etiket" renk="metinSilik">
              {kalan > 0 ? m.kalanMesaj(kalan) : toplamHak === 0 ? m.kocKapali : m.kotaBitti}
            </Yazi>
          ) : null}
          <Satir arasi="sm">
            <TextInput
              value={girdi}
              onChangeText={setGirdi}
              placeholder={m.girisAlani}
              placeholderTextColor={tema.renk.metinSilik}
              multiline
              accessibilityLabel={m.girdiErisim}
              style={{
                flex: 1,
                minHeight: tema.dokunmaHedefi,
                maxHeight: 120,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: tema.renk.kenar,
                borderRadius: tema.yaricap.md,
                paddingHorizontal: tema.bosluk.md,
                paddingTop: tema.bosluk.sm,
                fontSize: 16,
                fontFamily: tema.tipografi.aileler.govde,
                color: tema.renk.metin,
                backgroundColor: tema.renk.zemin,
              }}
            />
            <Dugme
              baslik={m.gonder}
              onPress={() => void gonder()}
              tamGenislik={false}
              pasif={girdi.trim() === '' || !kocAcik}
              yukleniyor={gonderiliyor}
            />
          </Satir>
        </Sutun>
      </View>
    </KeyboardAvoidingView>
  );
}
