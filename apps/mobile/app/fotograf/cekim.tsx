import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { egimDerecesi, telefonDikMi } from '@swiip/core';
import {
  Dugme,
  Ekran,
  Kart,
  Satir,
  Sayi,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { uygunKareBoyutu } from '../../src/veri/kameraBoyutu';
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
  /*
    İzin henüz SORULMAMIŞSA ekran açılır açılmaz soruluyor. Kütüphane sorulmamış izni de
    `granted: false` diye bildiriyor ve ekran, kullanıcıya hiçbir şey sorulmadan
    "Kamera izni verilmedi" yazıyordu. Kullanıcı bu ekrana fotoğraf çekmek için geldi;
    niyet belli. "Verilmedi" yalnızca gerçekten reddedildiğinde (`denied`) çıkıyor.
  */
  useEffect(() => {
    if (izin?.status === 'undetermined' && izin.canAskAgain) void izinIste();
  }, [izin?.status, izin?.canAskAgain, izinIste]);
  const [egim, setEgim] = useState<number | null>(null);
  const [aciDogrulandi, setAciDogrulandi] = useState(false);
  const aciRef = useRef(false);
  const [kareler, setKareler] = useState<Array<{ poz: Poz; veri: string }>>([]);
  const [cekiliyor, setCekiliyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kareBoyutu, setKareBoyutu] = useState<string | undefined>(undefined);
  /** Geri sayımda kalan saniye; `null` iken sayım yok. */
  const [sayim, setSayim] = useState<number | null>(null);
  const sayimZamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);

  // Saniyede beş okuma yeterli: daha sıkı örnekleme pili yer, gösterge titrer.
  useEffect(() => {
    Accelerometer.setUpdateInterval(200);
    const abone = Accelerometer.addListener((okuma) => {
      setEgim(Math.round(egimDerecesi(okuma)));
      const dik = telefonDikMi(okuma);
      aciRef.current = dik;
      setAciDogrulandi(dik);
    });
    return () => abone.remove();
  }, []);

  useEffect(
    () => () => {
      if (sayimZamanlayici.current) clearInterval(sayimZamanlayici.current);
    },
    [],
  );

  const tamamlanan = kareler.map((k) => k.poz);
  const sirada = POZ_KODLARI.find((kod) => !tamamlanan.includes(kod));

  const kareAl = async (poz: Poz) => {
    if (!kamera.current) return;
    setCekiliyor(true);
    try {
      const kare = await kamera.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (kare?.base64) setKareler((onceki) => [...onceki, { poz, veri: kare.base64! }]);
      else setHata(m.kareAlinamadi);
    } catch {
      // `catch` yoktu: çekim hatası yakalanmamış bir red olarak kalıyor, ekran susuyordu.
      setHata(m.kareAlinamadi);
    } finally {
      setCekiliyor(false);
    }
  };

  const sayimiDurdur = () => {
    if (sayimZamanlayici.current) clearInterval(sayimZamanlayici.current);
    sayimZamanlayici.current = null;
    setSayim(null);
  };

  /*
    Çekim ZAMANLAYICIYLA.

    Protokol "telefonu 2 metre uzağa, göğüs hizasına koy" diyor; tek başına olan
    kullanıcının 2 metreden düğmeye basma yolu yoktu. On saniye: telefonu yerleştir,
    yerine geç. Sayım sırasında telefon eğilirse çekim İPTAL — bozuk açılı kare,
    hiç olmayan kareden kötü.
  */
  const cek = (poz: Poz) => {
    if (sayim !== null || cekiliyor) return;
    setHata(null);
    let kalan = SAYIM_SANIYE;
    setSayim(kalan);
    sayimZamanlayici.current = setInterval(() => {
      kalan -= 1;
      if (!aciRef.current) {
        sayimiDurdur();
        setHata(m.aciBozulduIptal);
        return;
      }
      if (kalan <= 0) {
        sayimiDurdur();
        void kareAl(poz);
        return;
      }
      setSayim(kalan);
    }, 1000);
  };

  const analizeGonder = async () => {
    if (kareler.length < 3) {
      // Fotoğrafsız yol ölçü ekranına gidiyor: boş bir rapor analiz hakkını harcardı.
      router.replace('/fotograf/olculer');
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

  const siradakiPoz = sirada ? m.pozlar[sirada] : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        {/*
          Kamera EN ÜSTTE, çekim düğmesi HEMEN ALTINDA.

          Eskiden kamera kurallar kartının ve 260 px'lik çerçeve çiziminin altındaydı,
          çekim düğmesi de kameranın altındaki poz kartlarının içindeydi: kadraj
          ayarlanırken düğme ekranın dışında kalıyordu.

          Kutu HER ZAMAN aynı boyutta. Üçüncü fotoğraf çekilince kamera kayboluyor ve
          altındaki her şey ~500 px yukarı zıplıyordu; "Yeniden çek" ile geri gelince
          aşağı. İzin yokken, izin istenirken ve üç poz bitince de kutu yerinde duruyor.
        */}
        <View
          style={{
            width: '100%',
            aspectRatio: 3 / 4,
            borderRadius: tema.yaricap.md,
            overflow: 'hidden',
            backgroundColor: tema.renk.yuzey,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tema.renk.cizgi,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {izin?.granted && sirada ? (
            <CameraView
              ref={kamera}
              style={StyleSheet.absoluteFill}
              pictureSize={kareBoyutu}
              onCameraReady={() => {
                void kamera.current
                  ?.getAvailablePictureSizesAsync()
                  .then((boyutlar) => setKareBoyutu(uygunKareBoyutu(boyutlar)))
                  .catch(() => null);
              }}
            />
          ) : !sirada ? (
            <Yazi tur="baslik3" renk="aksan">
              {m.ucFotografHazir}
            </Yazi>
          ) : izin?.status === 'denied' ? (
            <View style={{ gap: tema.bosluk.sm, padding: tema.bosluk.lg, width: '100%' }}>
              <Yazi tur="kucuk" renk="metinYumusak" hizala="center">
                {m.izinYok}
              </Yazi>
              {izin.canAskAgain ? (
                <Dugme baslik={m.izinVer} tur="ikincil" onPress={() => void izinIste()} />
              ) : null}
            </View>
          ) : (
            <CekimCercevesi
              aksan={tema.renk.aksan}
              cizgi={tema.renk.cizgi}
              hayalet={tema.renk.metinSilik}
            />
          )}

          {sayim !== null ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tema.bosluk.sm,
                  backgroundColor: tema.renk.zemin + 'B3',
                },
              ]}
            >
              <Sayi tur="dev" renk="aksan">
                {m.geriSayim(sayim)}
              </Sayi>
              <Yazi tur="kucuk" hizala="center">
                {m.geriSayimNotu}
              </Yazi>
            </View>
          ) : null}
        </View>

        {/*
          Açı satırı TEK SATIR ve sabit yükseklikte. İki farklı uzunlukta uyarı kutusu
          arasında saniyede beş kez gidip geliyordu; hemen altındaki çekim düğmesi
          kullanıcı nişan alırken yukarı aşağı oynuyordu.
        */}
        <View style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}>
          <Yazi
            tur="kucuk"
            renk={egim === null ? 'metinSilik' : aciDogrulandi ? 'aksan' : 'uyari'}
            hizala="center"
          >
            {egim === null
              ? m.aciOkunuyor
              : aciDogrulandi
                ? m.aciKisaUygun(egim)
                : m.aciKisaBozuk(egim)}
          </Yazi>
        </View>

        {siradakiPoz && sirada ? (
          sayim !== null ? (
            <Dugme baslik={m.vazgec} tur="ikincil" onPress={sayimiDurdur} />
          ) : (
            <Dugme
              baslik={m.pozCek(siradakiPoz.ad)}
              pasif={!aciDogrulandi || !izin?.granted}
              yukleniyor={cekiliyor}
              onPress={() => cek(sirada)}
            />
          )
        ) : (
          <Dugme
            baslik={m.analiziBaslat}
            yukleniyor={gonderiliyor}
            onPress={() => void analizeGonder()}
          />
        )}

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.zamanlayiciNotu}
        </Yazi>

        <View style={{ gap: tema.bosluk.sm }}>
          {POZ_KODLARI.map((kod) => {
            const poz = m.pozlar[kod];
            const bitti = tamamlanan.includes(kod);
            return (
              <Kart key={kod} vurgulu={sirada === kod}>
                {/*
                  Durum ve "Yeniden çek" AYNI satırda: kart hiçbir durumda boy
                  değiştirmiyor, altındaki kart da kaymıyor.
                */}
                <Satir dagit="space-between">
                  <Yazi tur="baslik3">{poz.ad}</Yazi>
                  {bitti ? (
                    <Pressable
                      onPress={() => setKareler((onceki) => onceki.filter((k) => k.poz !== kod))}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.yenidenCek}: ${poz.ad}`}
                      hitSlop={12}
                      style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
                    >
                      <Yazi tur="kucuk" renk="aksan">
                        {m.yenidenCek}
                      </Yazi>
                    </Pressable>
                  ) : (
                    <View style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}>
                      <Yazi tur="etiket" renk="metinSilik">
                        {m.bekliyor}
                      </Yazi>
                    </View>
                  )}
                </Satir>
                <Yazi tur="kucuk" renk="metinYumusak">
                  {poz.yonerge}
                </Yazi>
              </Kart>
            );
          })}
        </View>

        <Kart>
          {m.kurallar.map((kural) => (
            <Kural key={kural} metin={kural} />
          ))}
        </Kart>

        {kareler.length < 3 ? (
          <Dugme baslik={m.fotografsizDevam} tur="sessiz" onPress={() => void analizeGonder()} />
        ) : null}

        {gonderiliyor ? <Yukleniyor metin={m.analizEdiliyor} /> : null}

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.silmeNotu}
        </Yazi>
      </Ekran>
    </>
  );
}

/** Geri sayım süresi (saniye). */
const SAYIM_SANIYE = 10;

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
