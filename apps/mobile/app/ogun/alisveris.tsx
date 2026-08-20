import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  BosDurum,
  Dugme,
  Ekran,
  Kart,
  Sayi,
  Satir,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useMetinler } from '../../src/durum/Oturum';

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
  const bugun = new Date();
  const gun = bugun.getDay();
  const fark = gun === 0 ? -6 : 1 - gun;
  const pazartesi = new Date(bugun);
  pazartesi.setDate(bugun.getDate() + fark);
  return pazartesi.toISOString().slice(0, 10);
}

export default function AlisverisListesi() {
  const tema = useTema();
  const ogunMetinleri = useMetinler().ogun;
  const m = ogunMetinleri.alisveris;
  const reyonAdlari = ogunMetinleri.reyonAdlari;

  const [reyonlar, setReyonlar] = useState<Record<string, Kalem[]>>({});
  const [alinanlar, setAlinanlar] = useState<Set<string>>(new Set());
  const [hazir, setHazir] = useState(false);

  const yukle = useCallback(async () => {
    const cevap = await istek<ListeCevabi>(`/v1/ogun/plan/${haftaBasi()}`).catch(() => null);
    setReyonlar(cevap?.alisveris?.grouped_by_aisle ?? {});
    setHazir(true);
  }, []);

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
    setAlinanlar((mevcut) => {
      const yeni = new Set(mevcut);
      if (yeni.has(ad)) yeni.delete(ad);
      else yeni.add(ad);
      return yeni;
    });
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
              {(reyonAdlari[reyon as keyof typeof reyonAdlari] ?? reyon).toLocaleUpperCase('tr-TR')}
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
                        <Yazi tur="etiket" stil={{ color: '#FFFFFF' }}>
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

        <Dugme
          baslik={m.dolabaEkle}
          onPress={() => {
            void istek('/v1/ogun/dolap', {
              yontem: 'POST',
              govde: { malzemeler: [...alinanlar] },
            }).then(() => router.push('/ogun/dolap'));
          }}
          pasif={alinanlar.size === 0}
        />
        <Dugme baslik={m.planiGor} tur="sessiz" onPress={() => router.push('/ogun/plan')} />
      </Ekran>
    </>
  );
}
