import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Ayirac,
  BosDurum,
  Ekran,
  Etiket,
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
import { buyukHarf } from '@swiip/shared';
import { useSayilarGizli } from '../../src/durum/Oturum';

/**
 * Tarif detayı.
 *
 * Anlatım metni bize ait (telif notu: malzeme listesi korunmuyor, anlatım korunuyor).
 * Et, tavuk, balık ve yumurta içeren tariflerin tamamı gıda güvenliği için elle
 * kontrol edilmiştir; kontrolden geçmemiş tarif bu ekrana hiç ulaşmaz.
 */

interface TarifCevabi {
  id: string;
  name_tr: string;
  ingredients_jsonb: Array<{ ad: string; gram: number; reyon: string }>;
  steps_tr: string[];
  macros_jsonb: {
    kalori: number;
    protein_g: number;
    yag_g: number;
    karbonhidrat_g: number;
    lif_g: number;
  };
  cost_tier: number;
  prep_minutes: number;
  tags: string[];
  verified_by_human: boolean;
}

export default function TarifDetayi() {
  const tema = useTema();
  const ogunMetinleri = useMetinler().ogun;
  const genel = useMetinler().genel;
  const m = ogunMetinleri.tarif;
  const dil = useDil();
  const reyonlar = ogunMetinleri.reyonAdlari;
  const sayilarGizli = useSayilarGizli();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tarif, setTarif] = useState<TarifCevabi | null>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    void istek<TarifCevabi>(`/v1/ogun/tarif/${id}`)
      .then(setTarif)
      .catch(() => setTarif(null))
      .finally(() => setHazir(true));
  }, [id]);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  if (!tarif) {
    return (
      <Ekran>
        <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
      </Ekran>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: tarif.name_tr }} />
      <Ekran>
        <Yazi tur="baslik1">{tarif.name_tr}</Yazi>

        <Satir arasi="xs">
          <Etiket metin={genel.dakikaKisa(tarif.prep_minutes)} />
          <Etiket metin={genel.butceKademesi(tarif.cost_tier)} />
          {tarif.tags.slice(0, 3).map((etiket) => (
            <Etiket key={etiket} metin={buyukHarf(etiket, dil)} />
          ))}
        </Satir>

        {!sayilarGizli ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.birPorsiyon}
            </Yazi>
            <Satir arasi="xs" hizala="baseline">
              <Sayi tur="baslik1" renk="aksan">
                {tarif.macros_jsonb.kalori}
              </Sayi>
              <Yazi tur="kucuk" renk="metinSilik">
                kcal
              </Yazi>
            </Satir>
            <Satir arasi="lg">
              <Yazi tur="kucuk" renk="metinYumusak">
                P {tarif.macros_jsonb.protein_g} g
              </Yazi>
              <Yazi tur="kucuk" renk="metinYumusak">
                K {tarif.macros_jsonb.karbonhidrat_g} g
              </Yazi>
              <Yazi tur="kucuk" renk="metinYumusak">
                Y {tarif.macros_jsonb.yag_g} g
              </Yazi>
              <Yazi tur="kucuk" renk="metinYumusak">
                Lif {tarif.macros_jsonb.lif_g} g
              </Yazi>
            </Satir>
            <Yazi tur="etiket" renk="metinSilik">
              {m.makroKaynagi}
            </Yazi>
          </Kart>
        ) : (
          <Uyari baslik={m.edBaslik} govde={m.edGovde} />
        )}

        <Kart>
          <Yazi tur="baslik3">{genel.malzemeler}</Yazi>
          {tarif.ingredients_jsonb.map((malzeme, i) => (
            <View key={malzeme.ad} style={{ gap: tema.bosluk.xs }}>
              {i > 0 ? <Ayirac /> : null}
              <Satir dagit="space-between">
                <Yazi tur="kucuk">{malzeme.ad}</Yazi>
                <Satir arasi="sm">
                  <Sayi tur="kucuk" renk="aksan">
                    {malzeme.gram} g
                  </Sayi>
                  <Yazi tur="etiket" renk="metinSilik">
                    {reyonlar[malzeme.reyon as keyof typeof reyonlar] ?? malzeme.reyon}
                  </Yazi>
                </Satir>
              </Satir>
            </View>
          ))}
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{m.nasilYapilir}</Yazi>
          {tarif.steps_tr.map((adim, i) => (
            <Satir key={i} arasi="md" hizala="flex-start">
              <Sayi tur="kucuk" renk="aksan">
                {i + 1}
              </Sayi>
              <Yazi tur="kucuk" renk="metinYumusak" stil={{ flex: 1 }}>
                {adim}
              </Yazi>
            </Satir>
          ))}
        </Kart>

        {tarif.verified_by_human ? <Uyari govde={m.kontrolNotu} /> : null}
      </Ekran>
    </>
  );
}
