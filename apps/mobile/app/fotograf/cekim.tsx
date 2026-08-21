import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { egimDerecesi, telefonDikMi } from '@swiip/core';
import { Dugme, Ekran, Kart, Satir, Uyari, Yazi, Yukleniyor } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';
import { istek } from '../../src/veri/api';

/**
 * Çekim yönlendirmesi (F4.1, F4.2, F4.10).
 *
 * Üç poz, sabit protokol. Açı doğrulaması ivmeölçerden gelir: telefon eğikse çekim
 * düğmesi açılmaz. Standart olmadan karşılaştırma anlamsız, karşılaştırma olmadan analiz
 * bir kerelik gösteriden ibaret kalır.
 *
 * Fotoğraf **hiçbir zaman diske yazılmaz**: `takePictureAsync` base64 ile bellekte tutulur,
 * analiz isteğiyle gönderilir ve ekrandan çıkılınca bellekten düşer. Bu, gizlilik
 * ekranında verdiğimiz sözün somut karşılığı.
 *
 * Sonraki ölçümlerde "hayalet çerçeve": önceki fotoğrafın silueti yarı saydam gösterilir —
 * bu görüntü yalnızca cihazda tutulur, sunucudan gelmez.
 */

type Poz = 'on' | 'yan' | 'arka';

const POZ_KODLARI = ['on', 'yan', 'arka'] as const;

export default function Cekim() {
  const tema = useTema();
  const m = useMetinler().fotograf;
  const kamera = useRef<CameraView>(null);

  const [izin, izinIste] = useCameraPermissions();
  const [egim, setEgim] = useState<number | null>(null);
  const [aciDogrulandi, setAciDogrulandi] = useState(false);
  const [kareler, setKareler] = useState<Array<{ poz: Poz; veri: string }>>([]);
  const [cekiliyor, setCekiliyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Saniyede beş okuma yeterli: daha sıkı örnekleme pili yer, gösterge titrer.
  useEffect(() => {
    Accelerometer.setUpdateInterval(200);
    const abone = Accelerometer.addListener((okuma) => {
      setEgim(Math.round(egimDerecesi(okuma)));
      setAciDogrulandi(telefonDikMi(okuma));
    });
    return () => abone.remove();
  }, []);

  const tamamlanan = kareler.map((k) => k.poz);
  const sirada = POZ_KODLARI.find((kod) => !tamamlanan.includes(kod));

  const cek = async (poz: Poz) => {
    if (!kamera.current) return;
    setCekiliyor(true);
    try {
      const kare = await kamera.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (kare?.base64) setKareler((onceki) => [...onceki, { poz, veri: kare.base64! }]);
    } finally {
      setCekiliyor(false);
    }
  };

  const analizeGonder = async () => {
    if (kareler.length < 3) {
      router.replace('/rapor');
      return;
    }

    setHata(null);
    setGonderiliyor(true);
    try {
      await istek('/v1/vucut/analiz', {
        yontem: 'POST',
        govde: { fotograflar: kareler },
      });
      // Bellekteki kareleri hemen bırakıyoruz; ekran açık kalsa bile tutmuyoruz.
      setKareler([]);
      router.replace('/rapor');
    } catch {
      setHata(m.analizHatasi);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        <Kart>
          {m.kurallar.map((kural) => (
            <Kural key={kural} metin={kural} />
          ))}
        </Kart>

        <View style={{ alignItems: 'center', paddingVertical: tema.bosluk.lg }}>
          <CekimCercevesi
            aksan={tema.renk.aksan}
            cizgi={tema.renk.cizgi}
            hayalet={tema.renk.metinSilik}
          />
          <Yazi tur="etiket" renk="metinSilik">
            {m.hayaletNotu}
          </Yazi>
        </View>

        {izin?.granted === false ? (
          <View style={{ gap: tema.bosluk.sm }}>
            <Uyari tur="uyari" govde={m.izinYok} />
            {izin.canAskAgain ? (
              <Dugme baslik={m.izinVer} tur="ikincil" onPress={() => void izinIste()} />
            ) : null}
          </View>
        ) : null}

        {izin?.granted && sirada ? (
          <CameraView
            ref={kamera}
            style={{
              width: '100%',
              aspectRatio: 3 / 4,
              borderRadius: tema.yaricap.md,
              overflow: 'hidden',
            }}
          />
        ) : null}

        <Satir dagit="space-between">
          {aciDogrulandi ? <Uyari govde={m.aciUygun} /> : <Uyari tur="uyari" govde={m.aciBozuk} />}
        </Satir>

        {egim !== null ? (
          <Yazi tur="etiket" renk={aciDogrulandi ? 'aksan' : 'uyari'} hizala="center">
            {m.egimDerecesi(egim)}
          </Yazi>
        ) : null}

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <View style={{ gap: tema.bosluk.sm }}>
          {POZ_KODLARI.map((kod) => {
            const poz = m.pozlar[kod];
            const bitti = tamamlanan.includes(kod);
            return (
              <Kart key={kod} vurgulu={sirada === kod}>
                <Satir dagit="space-between">
                  <Yazi tur="baslik3">{poz.ad}</Yazi>
                  <Yazi tur="etiket" renk={bitti ? 'aksan' : 'metinSilik'}>
                    {bitti ? m.cekildi : m.bekliyor}
                  </Yazi>
                </Satir>
                <Yazi tur="kucuk" renk="metinYumusak">
                  {poz.yonerge}
                </Yazi>
                {sirada === kod ? (
                  <Dugme
                    baslik={m.pozCek(poz.ad)}
                    pasif={!aciDogrulandi || !izin?.granted}
                    yukleniyor={cekiliyor}
                    onPress={() => void cek(kod)}
                  />
                ) : null}
                {bitti ? (
                  <Dugme
                    baslik={m.yenidenCek}
                    tur="sessiz"
                    onPress={() => setKareler((onceki) => onceki.filter((k) => k.poz !== kod))}
                  />
                ) : null}
              </Kart>
            );
          })}
        </View>

        <Dugme
          baslik={kareler.length === 3 ? m.analiziBaslat : m.fotografsizDevam}
          yukleniyor={gonderiliyor}
          onPress={() => void analizeGonder()}
        />

        {gonderiliyor ? <Yukleniyor metin={m.analizEdiliyor} /> : null}

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.silmeNotu}
        </Yazi>
      </Ekran>
    </>
  );
}

function Kural({ metin }: { metin: string }) {
  const tema = useTema();
  return (
    <Satir arasi="sm" hizala="flex-start">
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: tema.renk.aksan,
          marginTop: 8,
        }}
      />
      <Yazi tur="kucuk" renk="metinYumusak" stil={{ flex: 1 }}>
        {metin}
      </Yazi>
    </Satir>
  );
}

/** Hizalama çerçevesi + hayalet siluet göstergesi. */
function CekimCercevesi({
  aksan,
  cizgi,
  hayalet,
}: {
  aksan: string;
  cizgi: string;
  hayalet: string;
}) {
  return (
    <Svg width={180} height={260} viewBox="0 0 90 130">
      <Rect x={2} y={2} width={86} height={126} rx={6} stroke={cizgi} strokeWidth={1} fill="none" />
      {/* Köşe kılavuzları */}
      {[
        [2, 2, 14, 2],
        [2, 2, 2, 14],
        [88, 2, 76, 2],
        [88, 2, 88, 14],
        [2, 128, 14, 128],
        [2, 128, 2, 116],
        [88, 128, 76, 128],
        [88, 128, 88, 116],
      ].map(([x1, y1, x2, y2], i) => (
        <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={aksan} strokeWidth={2} />
      ))}
      {/* Hayalet siluet */}
      <G_hayalet renk={hayalet} />
    </Svg>
  );
}

function G_hayalet({ renk }: { renk: string }) {
  return (
    <>
      <Circle cx={45} cy={26} r={8} fill={renk} opacity={0.25} />
      <Rect x={35} y={36} width={20} height={40} rx={7} fill={renk} opacity={0.25} />
      <Rect x={38} y={76} width={6} height={38} rx={3} fill={renk} opacity={0.25} />
      <Rect x={46} y={76} width={6} height={38} rx={3} fill={renk} opacity={0.25} />
      <Rect x={27} y={40} width={5} height={32} rx={2.5} fill={renk} opacity={0.25} />
      <Rect x={58} y={40} width={5} height={32} rx={2.5} fill={renk} opacity={0.25} />
    </>
  );
}
