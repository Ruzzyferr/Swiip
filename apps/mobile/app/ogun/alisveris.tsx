import { useCallback, useEffect, useState } from 'react';
import { ANAHTARLAR, oku, yaz } from '../../src/veri/onbellek';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  BosDurum,
  Dugme,
  Ekran,
  Kart,
  Sayi,
  Satir,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { buyukHarf, islemHatasiMetni, yerelHaftaBasi } from '@swiip/shared';

/**
 * Alışveriş listesi (F8.8).
 *
 * Haftalık plandan otomatik üretilir ve markette dolaşma sırasına göre gruplanır:
 * manav → kasap → balıkçı → şarküteri → fırın → kuru gıda. Aynı malzeme tek satırda
 * toplanır, dolapta olan hiç listeye girmez.
 *
 * İşaretleme cihazda tutulur; sunucuya "süt aldı mı" bilgisi göndermenin bir değeri yok.
 */

interface Kalem {
  ad: string;
  gram: number;
  reyon: string;
}

interface ListeCevabi {
  alisveris: {
    items_jsonb: Kalem[];
    grouped_by_aisle: Record<string, Kalem[]>;
  } | null;
}

const REYON_SIRASI = [
  'manav',
  'kasap',
  'balikci',
  'sarkuteri',
  'firin',
  'kuru_gida',
  'dondurulmus',
  'diger',
];

function haftaBasi(): string {
  // Ayni hesap iki ekranda kopyaliydi ve ikisi de UTC gunu donduruyordu; gece
  // penceresinde hafta anahtari bir onceki haftaya kayiyor, kullanici kendi planini
  // bulamiyordu. Tek yerde, yerel gune gore.
  return yerelHaftaBasi();
}

export default function AlisverisListesi() {
  const tema = useTema();
  const ogunMetinleri = useMetinler().ogun;
  const m = ogunMetinleri.alisveris;
  const dil = useDil();
  const reyonAdlari = ogunMetinleri.reyonAdlari;

  const [reyonlar, setReyonlar] = useState<Record<string, Kalem[]>>({});
  const [alinanlar, setAlinanlar] = useState<Set<string>>(new Set());
  const [hazir, setHazir] = useState(false);
  const [dolapHatasi, setDolapHatasi] = useState<string | null>(null);

  /**
   * İşaretler CİHAZDA saklanıyor.
   *
   * Yalnızca React state'teydi: ekrandan çıkıp geri gelmek — markette gayet olağan —
   * bütün işaretleri siliyordu. Ekranın kendi notu "işaretleme cihazda tutulur" diyordu
   * ama tutulmuyordu. Hafta anahtarıyla saklanıyor; yeni haftanın listesi eski
   * işaretlerle açılmasın.
   */
  const isaretAnahtari = haftaBasi();

  const isaretleriYaz = useCallback(
    (yeni: Set<string>) => {
      setAlinanlar(yeni);
      void yaz(ANAHTARLAR.alisverisIsaretleri, { hafta: isaretAnahtari, kalemler: [...yeni] });
    },
    [isaretAnahtari],
  );

  const yukle = useCallback(async () => {
    const cevap = await istek<ListeCevabi>(`/v1/ogun/plan/${haftaBasi()}`).catch(() => null);
    setReyonlar(cevap?.alisveris?.grouped_by_aisle ?? {});

    const kayitli = await oku<{ hafta: string; kalemler: string[] }>(
      ANAHTARLAR.alisverisIsaretleri,
    );
    if (kayitli && kayitli.hafta === isaretAnahtari) setAlinanlar(new Set(kayitli.kalemler));
    setHazir(true);
  }, [isaretAnahtari]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  const tumKalemler = Object.values(reyonlar).flat();

  if (tumKalemler.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
        <Ekran>
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
          <Dugme baslik={m.planiCikar} onPress={() => router.push('/ogun/plan')} />
        </Ekran>
      </>
    );
  }

  const degistir = (ad: string) => {
    const yeni = new Set(alinanlar);
    if (yeni.has(ad)) yeni.delete(ad);
    else yeni.add(ad);
    isaretleriYaz(yeni);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Satir dagit="space-between" hizala="baseline">
          <Yazi tur="baslik1">{m.baslik}</Yazi>
          <Sayi tur="kucuk" renk="metinSilik">
            {alinanlar.size} / {tumKalemler.length}
          </Sayi>
        </Satir>

        <Yazi tur="kucuk" renk="metinSilik">
          {m.girisMetni}
        </Yazi>

        {REYON_SIRASI.filter((reyon) => (reyonlar[reyon]?.length ?? 0) > 0).map((reyon) => (
          <Kart key={reyon}>
            <Yazi tur="etiket" renk="aksan">
              {buyukHarf(reyonAdlari[reyon as keyof typeof reyonAdlari] ?? reyon, dil)}
            </Yazi>

            {reyonlar[reyon]!.map((kalem) => {
              const alindi = alinanlar.has(kalem.ad);
              return (
                <Pressable
                  key={kalem.ad}
                  onPress={() => degistir(kalem.ad)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={kalem.ad}
                  accessibilityState={{ checked: alindi }}
                  style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
                >
                  <Satir arasi="md">
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        borderWidth: 2,
                        borderColor: alindi ? tema.renk.aksan : tema.renk.cizgi,
                        backgroundColor: alindi ? tema.renk.aksan : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {alindi ? (
                        <Yazi tur="etiket" stil={{ color: tema.renk.aksanUstu }}>
                          ✓
                        </Yazi>
                      ) : null}
                    </View>
                    <Yazi
                      tur="kucuk"
                      renk={alindi ? 'metinSilik' : 'metin'}
                      stil={{ flex: 1, textDecorationLine: alindi ? 'line-through' : 'none' }}
                    >
                      {kalem.ad}
                    </Yazi>
                    <Sayi tur="kucuk" renk="metinSilik">
                      {kalem.gram} g
                    </Sayi>
                  </Satir>
                </Pressable>
              );
            })}
          </Kart>
        ))}

        {dolapHatasi ? <Uyari tur="tehlike" govde={dolapHatasi} /> : null}

        <Dugme
          baslik={m.dolabaEkle}
          onPress={() => {
            /**
             * Yakalanmayan bir reddi vardi.
             *
             * `void istek(...).then(...)` yaziliyordu: istek patlarsa yakalanmamis bir
             * promise reddi kaliyor, kullaniciya hicbir sey soylenmiyor ve ekran da
             * degismiyordu. Kullanici dokunuyor, hicbir sey olmuyor.
             */
            setDolapHatasi(null);
            void istek('/v1/ogun/dolap', {
              yontem: 'POST',
              govde: { malzemeler: [...alinanlar] },
            })
              .then(() => router.push('/ogun/dolap'))
              .catch(() => setDolapHatasi(islemHatasiMetni('dolap_kaydet', dil)));
          }}
          pasif={alinanlar.size === 0}
        />
        <Dugme baslik={m.planiGor} tur="sessiz" onPress={() => router.push('/ogun/plan')} />
      </Ekran>
    </>
  );
}
