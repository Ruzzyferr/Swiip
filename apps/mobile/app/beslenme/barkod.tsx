import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { barkodGecerliMi } from '@swiip/core';
import { islemHatasiMetni } from '@swiip/shared';
import {
  Ayirac,
  Dugme,
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
import { ApiHatasi, istek } from '../../src/veri/api';
import { useDil, useMetinler, useSayilarGizli } from '../../src/durum/Oturum';

/**
 * Barkod ile ürün arama (F5.9).
 *
 * Kamera olmadan da tam çalışır: rakamları elle girmek her cihazda mümkün ve bazen
 * ambalaj kırışık olduğu için tek yol. Kamera kurulunca tarama düğmesi açılır.
 *
 * Kontrol hanesi istemcide doğrulanır. Yazım hatasını sunucuya taşımak, kullanıcıya
 * "bulunamadı" dedirtir; oysa sorun bizde değil, girdide.
 */

interface BesinCevabi {
  id: string;
  name_tr: string;
  brand: string | null;
  per_100g_jsonb: {
    kalori: number;
    protein_g: number;
    yag_g: number;
    karbonhidrat_g: number;
    lif_g: number;
  };
  verified: boolean;
  kaynak: 'yerel' | 'openfoodfacts';
}

export default function Barkod() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.barkod;
  const sayilarGizli = useSayilarGizli();
  const dil = useDil();

  const [izin, izinIste] = useCameraPermissions();
  const [tarariyor, setTarariyor] = useState(false);
  const [girdi, setGirdi] = useState('');
  const [besin, setBesin] = useState<BesinCevabi | null>(null);
  const [miktar, setMiktar] = useState('100');
  const [hata, setHata] = useState<string | null>(null);
  const [araniyor, setAraniyor] = useState(false);

  const girisStili = {
    minHeight: tema.dokunmaHedefi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.renk.kenar,
    borderRadius: tema.yaricap.md,
    paddingHorizontal: tema.bosluk.lg,
    fontSize: 18,
    // Barkod bir sayi dizisi: monospace hem okunur hem hatali haneyi belli eder.
    fontFamily: tema.tipografi.aileler.sayisal,
    color: tema.renk.metin,
    backgroundColor: tema.renk.yuzey,
  };

  const araBarkod = async (barkod: string) => {
    setHata(null);
    setBesin(null);

    if (!barkodGecerliMi(barkod)) {
      setHata(m.gecersiz);
      return;
    }

    setAraniyor(true);
    try {
      setBesin(await istek<BesinCevabi>(`/v1/beslenme/besin/barkod/${barkod.trim()}`));
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.bulunamadi);
    } finally {
      setAraniyor(false);
    }
  };

  /**
   * Tarama sonucu doğrudan aramaya gider — kullanıcı bir de "ara"ya basmasın.
   * Kamera aynı barkodu saniyede onlarca kez okur; ilk okumada tarayıcıyı kapatıyoruz.
   */
  const tarandi = (deger: string) => {
    if (!tarariyor) return;
    setTarariyor(false);
    setGirdi(deger);
    void araBarkod(deger);
  };

  const ara = () => araBarkod(girdi);

  const gunEkle = async () => {
    if (!besin) return;

    setHata(null);
    try {
      await istek('/v1/beslenme/kayit', {
        yontem: 'POST',
        govde: {
          food_id: besin.id,
          miktar: Number(miktar.replace(',', '.')) || 100,
          entry_method: 'barkod',
        },
      });
    } catch {
      // Sessiz başarısızlık, kullanıcının ürünü eklediğini sanmasına yol açar.
      setHata(islemHatasiMetni('barkod_ekle', dil));
      return;
    }

    router.replace('/(sekme)/beslenme');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        {izin?.granted === false ? (
          <View style={{ gap: tema.bosluk.sm }}>
            <Uyari tur="uyari" govde={m.izinYok} />
            {izin.canAskAgain ? (
              <Dugme baslik={m.izinVer} tur="ikincil" onPress={() => void izinIste()} />
            ) : null}
          </View>
        ) : (
          <Dugme
            baslik={tarariyor ? m.taramayiKapat : m.tara}
            tur="ikincil"
            onPress={() => {
              if (tarariyor) {
                setTarariyor(false);
                return;
              }
              if (izin?.granted) setTarariyor(true);
              else void izinIste().then((sonuc) => setTarariyor(sonuc.granted));
            }}
          />
        )}

        {tarariyor ? (
          <View
            style={{
              gap: tema.bosluk.xs,
              borderRadius: tema.yaricap.md,
              overflow: 'hidden',
            }}
          >
            <CameraView
              style={{ width: '100%', aspectRatio: 4 / 3 }}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
              onBarcodeScanned={(sonuc) => tarandi(sonuc.data)}
            />
            <Yazi tur="etiket" renk="metinSilik" hizala="center">
              {m.kadraja}
            </Yazi>
          </View>
        ) : null}

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.alanEtiketi}
          </Yazi>
          <TextInput
            value={girdi}
            onChangeText={(deger) => setGirdi(deger.replace(/\D/g, '').slice(0, 13))}
            keyboardType="number-pad"
            maxLength={13}
            accessibilityLabel={m.alanEtiketi}
            style={[girisStili, { letterSpacing: 2 }]}
          />
        </View>

        {hata ? <Uyari tur="uyari" govde={hata} /> : null}

        <Dugme
          baslik={m.ara}
          onPress={() => void ara()}
          pasif={girdi.length < 8}
          yukleniyor={araniyor}
        />

        {araniyor ? <Yukleniyor metin={m.araniyor} /> : null}

        {besin ? (
          <Kart vurgulu>
            <Satir dagit="space-between" hizala="flex-start">
              <View style={{ flex: 1, gap: 2 }}>
                <Yazi tur="baslik3">{besin.name_tr}</Yazi>
                {besin.brand ? (
                  <Yazi tur="kucuk" renk="metinSilik">
                    {besin.brand}
                  </Yazi>
                ) : null}
              </View>
              <Etiket
                metin={besin.kaynak === 'yerel' ? m.kaynakYerel : m.kaynakOff}
                tur={besin.kaynak === 'yerel' ? 'aksan' : 'notr'}
              />
            </Satir>

            {!sayilarGizli ? (
              <>
                <Ayirac />
                <Yazi tur="etiket" renk="metinSilik">
                  {m.yuzGramBasina}
                </Yazi>
                <Satir dagit="space-between">
                  <Yazi tur="kucuk" renk="metinYumusak">
                    {metinler.beslenme.kaloriHedefi}
                  </Yazi>
                  <Sayi tur="kucuk" renk="aksan">
                    {besin.per_100g_jsonb.kalori} kcal
                  </Sayi>
                </Satir>
                <Satir dagit="space-between">
                  <Yazi tur="kucuk" renk="metinYumusak">
                    {metinler.beslenme.protein}
                  </Yazi>
                  <Sayi tur="kucuk">{besin.per_100g_jsonb.protein_g} g</Sayi>
                </Satir>
                <Satir dagit="space-between">
                  <Yazi tur="kucuk" renk="metinYumusak">
                    {metinler.beslenme.karbonhidrat}
                  </Yazi>
                  <Sayi tur="kucuk">{besin.per_100g_jsonb.karbonhidrat_g} g</Sayi>
                </Satir>
                <Satir dagit="space-between">
                  <Yazi tur="kucuk" renk="metinYumusak">
                    {metinler.beslenme.yag}
                  </Yazi>
                  <Sayi tur="kucuk">{besin.per_100g_jsonb.yag_g} g</Sayi>
                </Satir>
              </>
            ) : null}

            {!besin.verified ? (
              <Yazi tur="kucuk" renk="metinSilik">
                {m.dogrulanmadiNotu}
              </Yazi>
            ) : null}
          </Kart>
        ) : null}

        {besin ? (
          <View style={{ gap: tema.bosluk.sm }}>
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.miktarGram}
            </Yazi>
            <TextInput
              value={miktar}
              onChangeText={setMiktar}
              keyboardType="decimal-pad"
              accessibilityLabel={m.miktarGram}
              style={girisStili}
            />
            <Dugme baslik={m.gune} onPress={() => void gunEkle()} />
          </View>
        ) : null}
      </Ekran>
    </>
  );
}
