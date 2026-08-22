import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  BosDurum,
  Dugme,
  Ekran,
  Kart,
  Satir,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { aramaAnahtari, islemHatasiMetni, kucukHarf } from '@swiip/shared';

/**
 * Buzdolabı envanteri (F8.9).
 *
 * Üç giriş yolu planlandı: fotoğraf, ses, liste. Liste girişi burada çalışıyor;
 * fotoğraf ve ses aynı uca yazacak şekilde tasarlandı — envanter tek yerde tutulur.
 */

const SIK_KULLANILANLAR = [
  'yumurta',
  'süt',
  'yoğurt',
  'beyaz peynir',
  'tavuk göğsü',
  'kıyma',
  'domates',
  'soğan',
  'patates',
  'bulgur',
  'pirinç',
  'makarna',
  'mercimek',
  'nohut',
  'zeytinyağı',
  'tereyağı',
  'ekmek',
  'yulaf ezmesi',
];

export default function Dolap() {
  const tema = useTema();
  const m = useMetinler().ogun.dolap;
  const genel = useMetinler().genel;
  const dil = useDil();

  const [malzemeler, setMalzemeler] = useState<string[]>([]);
  const [girdi, setGirdi] = useState('');
  const [hazir, setHazir] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [kaydetmeHatasi, setKaydetmeHatasi] = useState<string | null>(null);

  useEffect(() => {
    void istek<{ malzemeler: string[] }>('/v1/ogun/dolap')
      .then((c) => setMalzemeler(c.malzemeler))
      .catch(() => setMalzemeler([]))
      .finally(() => setHazir(true));
  }, []);

  const ekle = (ad: string) => {
    // Küçültme kullanıcının dilinde: 'tr-TR' sabiti İngilizce yazan kişinin "Ice"ını
    // "ıce" yapıyor ve hiçbir tarifle eşleşmiyordu.
    const temiz = kucukHarf(ad.trim(), dil);
    if (temiz === '') return;

    // Tekrar kontrolü şapkasız katlamayla: "Yoğurt" ve "yogurt" aynı malzeme.
    // Küçük harfe bakmak ikisini ayrı sanır ve dolapta iki satır oluşurdu.
    const anahtar = aramaAnahtari(temiz);
    if (malzemeler.some((x) => aramaAnahtari(x) === anahtar)) return;

    setMalzemeler((m) => [...m, temiz]);
    setGirdi('');
    setKaydedildi(false);
  };

  const cikar = (ad: string) => {
    setMalzemeler((m) => m.filter((x) => x !== ad));
    setKaydedildi(false);
  };

  /**
   * Kaydetme basarisiz olursa "kaydedildi" YAZILMAZ.
   *
   * Eskiden hata yutuluyor ve ardindan kosulsuz `setKaydedildi(true)` calisiyordu:
   * kullanici dolabini giriyor, yesil "kaydedildi" notunu goruyor ve listeyi
   * kaybediyordu. `islem.ts` bu durum icin `dolap_kaydet` cumlesini tasiyordu ama
   * hicbir yerden cagrilmiyordu.
   *
   * Geri deger, cagiranin (tarifleri gor) basarisiz kayittan sonra ilerlememesi icin.
   */
  const kaydet = async (): Promise<boolean> => {
    setKaydetmeHatasi(null);
    try {
      await istek('/v1/ogun/dolap', { yontem: 'POST', govde: { malzemeler } });
    } catch {
      setKaydedildi(false);
      setKaydetmeHatasi(islemHatasiMetni('dolap_kaydet', dil));
      return false;
    }
    setKaydedildi(true);
    return true;
  };

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        <Satir arasi="sm">
          <TextInput
            value={girdi}
            onChangeText={setGirdi}
            onSubmitEditing={() => ekle(girdi)}
            placeholder={m.malzemeIpucu}
            placeholderTextColor={tema.renk.metinSilik}
            accessibilityLabel={m.malzemeEkle}
            style={{
              flex: 1,
              minHeight: tema.dokunmaHedefi,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tema.renk.cizgi,
              borderRadius: tema.yaricap.md,
              paddingHorizontal: tema.bosluk.lg,
              fontSize: 16,
              fontFamily: tema.tipografi.aileler.govde,
              color: tema.renk.metin,
              backgroundColor: tema.renk.yuzey,
            }}
          />
          <Dugme baslik={genel.ekle} onPress={() => ekle(girdi)} tamGenislik={false} />
        </Satir>

        {malzemeler.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.malzemeSayisi(malzemeler.length)}</Yazi>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.sm }}>
              {malzemeler.map((malzeme) => (
                <Pressable
                  key={malzeme}
                  onPress={() => cikar(malzeme)}
                  accessibilityRole="button"
                  accessibilityLabel={m.cikarErisim(malzeme)}
                  style={{
                    minHeight: tema.dokunmaHedefi,
                    justifyContent: 'center',
                    paddingHorizontal: tema.bosluk.lg,
                    borderRadius: tema.yaricap.tam,
                    borderWidth: 1,
                    borderColor: tema.renk.aksan,
                    backgroundColor: tema.renk.aksanZemin,
                  }}
                >
                  <Yazi tur="kucuk" renk="aksan">
                    {malzeme} ✕
                  </Yazi>
                </Pressable>
              ))}
            </View>
          </Kart>
        ) : (
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
        )}

        <Kart>
          <Yazi tur="etiket" renk="metinSilik">
            {m.sikKullanilanlar}
          </Yazi>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.sm }}>
            {SIK_KULLANILANLAR.filter((s) => !malzemeler.includes(s)).map((ad) => (
              <Pressable
                key={ad}
                onPress={() => ekle(ad)}
                accessibilityRole="button"
                style={{
                  minHeight: tema.dokunmaHedefi,
                  justifyContent: 'center',
                  paddingHorizontal: tema.bosluk.lg,
                  borderRadius: tema.yaricap.tam,
                  borderWidth: 1,
                  borderColor: tema.renk.cizgi,
                }}
              >
                <Yazi tur="kucuk" renk="metinYumusak">
                  + {ad}
                </Yazi>
              </Pressable>
            ))}
          </View>
        </Kart>

        {kaydetmeHatasi ? <Uyari tur="tehlike" govde={kaydetmeHatasi} /> : null}
        {kaydedildi ? <Uyari govde={m.kaydedildi} /> : null}

        <Dugme baslik={genel.kaydet} onPress={() => void kaydet()} />
        <Dugme
          baslik={m.tarifleriGor}
          tur="ikincil"
          onPress={() => {
            // Kaydedilemediyse ilerlemiyoruz: deste kaydedilmemis dolaba gore acilirdi.
            void kaydet().then((oldu) => {
              if (oldu) router.push('/ogun/deste');
            });
          }}
        />
      </Ekran>
    </>
  );
}
