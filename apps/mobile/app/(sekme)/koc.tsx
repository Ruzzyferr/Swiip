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
  BosDurum,
  Dugme,
  Etiket,
  Kart,
  Satir,
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

  const yukle = useCallback(async () => {
    try {
      const gecmis = await istek<{ mesajlar: Mesaj[] }>('/v1/koc/gecmis');
      setMesajlar(gecmis.mesajlar);
    } catch {
      setMesajlar([]);
    }
    setHazir(true);
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

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
        <View style={{ padding: tema.bosluk.lg, gap: tema.bosluk.lg }}>
          <BosDurum baslik={m.kapaliBaslik} govde={kilit} />
          <Dugme baslik={m.planlaraBak} onPress={() => router.push('/odeme/paywall')} />
          <Dugme baslik={m.geri} tur="sessiz" onPress={() => setKilit(null)} />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tema.renk.zemin }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={kaydirma}
        contentContainerStyle={{ padding: tema.bosluk.lg, gap: tema.bosluk.md }}
      >
        {mesajlar.length === 0 ? (
          <View style={{ gap: tema.bosluk.md }}>
            <Yazi tur="baslik2">{m.baslik}</Yazi>
            <Yazi renk="metinYumusak">{m.tanitim}</Yazi>
            <Kart>
              <Yazi tur="etiket" renk="metinSilik">
                {m.ornekSorularBasligi}
              </Yazi>
              {m.ornekSorular.map((ornek: string) => (
                <Pressable
                  key={ornek}
                  onPress={() => setGirdi(ornek)}
                  accessibilityRole="button"
                  style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
                >
                  <Yazi tur="kucuk" renk="aksan">
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

      <View
        style={{
          padding: tema.bosluk.md,
          gap: tema.bosluk.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tema.renk.cizgi,
          backgroundColor: tema.renk.yuzey,
        }}
      >
        {kalan !== null ? (
          <Yazi tur="etiket" renk="metinSilik">
            {m.kalanMesaj(kalan)}
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
              borderColor: tema.renk.cizgi,
              borderRadius: tema.yaricap.md,
              paddingHorizontal: tema.bosluk.md,
              paddingTop: tema.bosluk.sm,
              fontSize: 16,
              color: tema.renk.metin,
              backgroundColor: tema.renk.zemin,
            }}
          />
          <Dugme
            baslik={m.gonder}
            onPress={() => void gonder()}
            tamGenislik={false}
            pasif={girdi.trim() === ''}
            yukleniyor={gonderiliyor}
          />
        </Satir>
      </View>
    </KeyboardAvoidingView>
  );
}
