import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { hareketBul } from '@swiip/core';
import { hareketAdi, type Hareket } from '@swiip/shared';
import {
  Ayirac,
  Dugme,
  Ekran,
  Etiket,
  Kart,
  Sayi,
  Satir,
  SecimDugmesi,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { hareketGorseli } from '../../src/veri/hareketMedyasi.uretilmis';
import { useDil, useMetinler } from '../../src/durum/Oturum';

/**
 * Hareket detayı ve değiştirme (F1.7, F1.8).
 *
 * Türkçe talimat burada: Fitify'ın 144 beğenili tek talebi buydu.
 * Değiştirme ücretsiz ve sınırsız — buraya duvar koymak ürünü öldürürdü.
 */

interface GerekceCevabi {
  kurallar: string[];
  girdiler: Array<{ soru_id: string; deger: string }>;
  aciklama: string;
}

export default function HareketDetayi() {
  const tema = useTema();
  const m = useMetinler().program;
  const dil = useDil();
  const kasAdi = (kod: string) => m.kasAdlari[kod as keyof typeof m.kasAdlari] ?? kod;
  const { id, seans } = useLocalSearchParams<{ id: string; seans?: string }>();

  const [hareket, setHareket] = useState<Hareket | null>(null);
  const [gerekce, setGerekce] = useState<GerekceCevabi | null>(null);
  const [muadiller, setMuadiller] = useState<Array<{ id: string; ad_tr: string; ad_en?: string }>>(
    [],
  );
  const [degistirmeAcik, setDegistirmeAcik] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);

  useEffect(() => {
    setHareket(hareketBul(id ?? '') ?? null);
    void istek<GerekceCevabi>(`/v1/program/gerekce/${id}`)
      .then(setGerekce)
      .catch(() => null);
  }, [id]);

  const muadilleriGetir = async () => {
    if (!seans) return;
    const cevap = await istek<{ muadiller: Array<{ id: string; ad_tr: string; ad_en?: string }> }>(
      '/v1/program/hareket-degistir',
      { yontem: 'POST', govde: { seans_id: seans, eski_hareket_id: id } },
    ).catch(() => null);

    setMuadiller(cevap?.muadiller ?? []);
    setDegistirmeAcik(true);
  };

  const degistir = async (yeniId: string) => {
    const cevap = await istek<{ mesaj: string }>('/v1/program/hareket-degistir', {
      yontem: 'POST',
      govde: { seans_id: seans, eski_hareket_id: id, yeni_hareket_id: yeniId },
    }).catch(() => null);

    if (cevap) {
      setMesaj(cevap.mesaj);
      setDegistirmeAcik(false);
      setTimeout(() => router.back(), 1200);
    }
  };

  if (!hareket) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  const gorsel = hareketGorseli(hareket.id);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: hareketAdi(hareket, dil) }} />
      <Ekran>
        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="baslik1">{hareketAdi(hareket, dil)}</Yazi>
          <Satir arasi="xs">
            <Etiket
              metin={
                m.paternAdlari[hareket.patern as keyof typeof m.paternAdlari] ?? hareket.patern
              }
              tur="aksan"
            />
            <Etiket metin={m.zorlukEtiketi(hareket.teknik_zorluk)} />
            <Etiket metin={m.verimEtiketi(hareket.sfr)} />
          </Satir>
        </View>

        {gerekce ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.nedenBuHareket}
            </Yazi>
            <Yazi renk="metinYumusak">{gerekce.aciklama}</Yazi>
            <Ayirac />
            <Yazi tur="etiket" renk="metinSilik">
              {m.hangiCevaplardan}
            </Yazi>
            {gerekce.girdiler.map((girdi, i) => (
              <Satir key={i} arasi="sm">
                <Sayi tur="etiket" renk="aksan">
                  {girdi.soru_id}
                </Sayi>
                <Yazi tur="kucuk" renk="metinYumusak" stil={{ flex: 1 }}>
                  {girdi.deger}
                </Yazi>
              </Satir>
            ))}
          </Kart>
        ) : null}

        {gorsel !== undefined ? (
          <View style={{ gap: tema.bosluk.xs }}>
            <Image
              source={gorsel}
              accessibilityLabel={m.gorselErisim(hareketAdi(hareket, dil))}
              resizeMode="cover"
              style={{
                width: '100%',
                aspectRatio: 4 / 3,
                borderRadius: tema.yaricap.md,
                backgroundColor: tema.renk.yuzeyIkincil,
              }}
            />
            <Yazi tur="etiket" renk="metinSilik">
              {m.gorselKaynagi}
            </Yazi>
          </View>
        ) : null}

        <Kart>
          <Yazi tur="baslik3">{m.nasilYapilir}</Yazi>
          {hareket.talimat_tr.map((adim, i) => (
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

        <Kart>
          <Yazi tur="baslik3">{m.calisanKaslar}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.birincil}: {hareket.birincil_kas.map(kasAdi).join(', ')}
          </Yazi>
          {hareket.ikincil_kas.length > 0 ? (
            <Yazi tur="kucuk" renk="metinSilik">
              {m.ikincil}: {hareket.ikincil_kas.map(kasAdi).join(', ')}
            </Yazi>
          ) : null}
        </Kart>

        {hareket.kontrendikasyon.length > 0 ? (
          <Uyari
            tur="uyari"
            baslik={m.kimlerdeDikkat}
            govde={m.kontrendikasyonNotu(hareket.kontrendikasyon.join(', '))}
          />
        ) : null}

        {mesaj ? <Uyari govde={mesaj} /> : null}

        {seans ? (
          <View style={{ gap: tema.bosluk.sm }}>
            {!degistirmeAcik ? (
              <>
                <Dugme
                  baslik={m.hareketDegistir}
                  tur="ikincil"
                  onPress={() => void muadilleriGetir()}
                />
                <Yazi tur="etiket" renk="metinSilik" hizala="center">
                  {m.ucretsizSinirsiz}
                </Yazi>
              </>
            ) : (
              <Kart>
                <Yazi tur="baslik3">{m.muadillerBasligi}</Yazi>
                <Yazi tur="kucuk" renk="metinSilik">
                  {m.muadillerNotu}
                </Yazi>
                {muadiller.length === 0 ? (
                  <Yazi tur="kucuk" renk="metinSilik">
                    {m.muadilYok}
                  </Yazi>
                ) : (
                  muadiller.map((muadil) => (
                    <SecimDugmesi
                      key={muadil.id}
                      baslik={hareketAdi(muadil, dil, muadil.id)}
                      secili={false}
                      onPress={() => void degistir(muadil.id)}
                    />
                  ))
                )}
                <Dugme baslik={m.vazgec} tur="sessiz" onPress={() => setDegistirmeAcik(false)} />
              </Kart>
            )}
          </View>
        ) : null}
      </Ekran>
    </>
  );
}
