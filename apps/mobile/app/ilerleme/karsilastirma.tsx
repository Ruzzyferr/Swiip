import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import Svg, { Circle, Rect } from 'react-native-svg';
import {
  BosDurum,
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
import { istek } from '../../src/veri/api';
import { ANAHTARLAR, oku, yaz } from '../../src/veri/onbellek';
import { useDil, useMetinler, useSayilarGizli } from '../../src/durum/Oturum';
import { gunAyMetni } from '@swiip/shared';

/**
 * Fotoğraf karşılaştırma (F4.4).
 *
 * TAMAMEN CİHAZ ÜZERİNDE çalışır. Sunucuda fotoğraf yok, dolayısıyla karşılaştırma da
 * sunucuda yapılamaz — bu bir kısıtlama değil mimarinin sonucu.
 *
 * Kullanıcı telefon değiştirirse bu fotoğraflar gider. Bunu gizlemiyoruz; ekranda yazıyor.
 */

interface Analiz {
  id: string;
  taken_at: string;
  bodyfat_low: number | null;
  bodyfat_high: number | null;
  measurements_jsonb: Record<string, number>;
}

interface CihazFotografi {
  analiz_id: string;
  poz: 'on' | 'yan' | 'arka';
  tarih: string;
}

export default function Karsilastirma() {
  const tema = useTema();
  const m = useMetinler().karsilastirma;
  const dil = useDil();
  const sayilarGizli = useSayilarGizli();

  const [analizler, setAnalizler] = useState<Analiz[]>([]);
  const [cihazFotograflari, setCihazFotograflari] = useState<CihazFotografi[]>([]);
  const [sol, setSol] = useState(0);
  const [sag, setSag] = useState(0);
  const [hazir, setHazir] = useState(false);

  const yukle = useCallback(async () => {
    const cevap = await istek<{ analizler: Analiz[] }>('/v1/vucut/analizler').catch(() => null);
    const liste = cevap?.analizler ?? [];
    setAnalizler(liste);
    setSol(liste.length - 1);
    setSag(0);

    // Fotoğraf listesi yalnızca cihazda; sunucudan gelmez.
    setCihazFotograflari((await oku<CihazFotografi[]>(ANAHTARLAR.profilOzeti)) ?? []);
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

  if (analizler.length < 2) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
        <Ekran>
          <BosDurum baslik={m.azBaslik} govde={m.azGovde} />
          <Uyari govde={m.cihazNotu} />
        </Ekran>
      </>
    );
  }

  const solAnaliz = analizler[sol];
  const sagAnaliz = analizler[sag];

  const yagFarki =
    solAnaliz?.bodyfat_low !== null &&
    solAnaliz?.bodyfat_low !== undefined &&
    sagAnaliz?.bodyfat_low !== null &&
    sagAnaliz?.bodyfat_low !== undefined
      ? Math.round((sagAnaliz.bodyfat_low - solAnaliz.bodyfat_low) * 10) / 10
      : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>

        <Satir arasi="md" hizala="flex-start">
          <View style={{ flex: 1, gap: tema.bosluk.sm }}>
            <Yazi tur="etiket" renk="metinSilik">
              {m.once}
            </Yazi>
            <FotografYeri
              tarih={solAnaliz ? gunAyMetni(new Date(solAnaliz.taken_at), dil) : ''}
              varMi={cihazFotograflari.some((f) => f.analiz_id === solAnaliz?.id)}
              tema={tema}
            />
          </View>
          <View style={{ flex: 1, gap: tema.bosluk.sm }}>
            <Yazi tur="etiket" renk="aksan">
              {m.sonra}
            </Yazi>
            <FotografYeri
              tarih={sagAnaliz ? gunAyMetni(new Date(sagAnaliz.taken_at), dil) : ''}
              varMi={cihazFotograflari.some((f) => f.analiz_id === sagAnaliz?.id)}
              tema={tema}
            />
          </View>
        </Satir>

        <Kart>
          <Yazi tur="baslik3">{m.hangiOlcumler}</Yazi>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.sm }}>
            {analizler.map((analiz, i) => (
              <Pressable
                key={analiz.id}
                onPress={() => (i > sag ? setSol(i) : setSag(i))}
                accessibilityRole="button"
                accessibilityLabel={gunAyMetni(new Date(analiz.taken_at), dil)}
                style={{
                  minHeight: tema.dokunmaHedefi,
                  justifyContent: 'center',
                  paddingHorizontal: tema.bosluk.md,
                  borderRadius: tema.yaricap.tam,
                  borderWidth: i === sol || i === sag ? 2 : 1,
                  borderColor: i === sol || i === sag ? tema.renk.aksan : tema.renk.cizgi,
                  backgroundColor: i === sol || i === sag ? tema.renk.aksanZemin : 'transparent',
                }}
              >
                <Yazi tur="etiket" renk={i === sol || i === sag ? 'aksan' : 'metinSilik'}>
                  {gunAyMetni(new Date(analiz.taken_at), dil)}
                </Yazi>
              </Pressable>
            ))}
          </View>
        </Kart>

        {!sayilarGizli && yagFarki !== null ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.yagOraniAraligi}
            </Yazi>
            <Satir arasi="lg" hizala="baseline">
              <Sayi tur="baslik3" renk="metinSilik">
                %{solAnaliz!.bodyfat_low}-{solAnaliz!.bodyfat_high}
              </Sayi>
              <Yazi renk="metinSilik">→</Yazi>
              <Sayi tur="baslik2" renk="aksan">
                %{sagAnaliz!.bodyfat_low}-{sagAnaliz!.bodyfat_high}
              </Sayi>
            </Satir>
            <Yazi tur="kucuk" renk="metinYumusak">
              {yagFarki < 0 ? m.aralikAsagi : yagFarki > 0 ? m.aralikYukari : m.aralikAyni}
            </Yazi>
          </Kart>
        ) : null}

        {!sayilarGizli ? (
          <OlcuKarsilastirma
            once={solAnaliz?.measurements_jsonb ?? {}}
            sonra={sagAnaliz?.measurements_jsonb ?? {}}
          />
        ) : null}

        <Uyari tur="uyari" govde={m.fotografNotu} />

        <Dugme
          baslik={m.yeniOlcum}
          onPress={() => {
            void yaz(ANAHTARLAR.profilOzeti, cihazFotograflari);
          }}
        />
      </Ekran>
    </>
  );
}

function OlcuKarsilastirma({
  once,
  sonra,
}: {
  once: Record<string, number>;
  sonra: Record<string, number>;
}) {
  const metinler = useMetinler();
  const m = metinler.karsilastirma;
  const d = metinler.degerlendirme;
  const anahtarlar = [...new Set([...Object.keys(once), ...Object.keys(sonra)])];

  if (anahtarlar.length === 0) return null;

  return (
    <Kart>
      <Yazi tur="baslik3">{m.cevreOlculeri}</Yazi>
      {anahtarlar.map((anahtar) => {
        const a = once[anahtar];
        const b = sonra[anahtar];
        const fark = a !== undefined && b !== undefined ? Math.round((b - a) * 10) / 10 : null;

        return (
          <Satir key={anahtar} dagit="space-between">
            <Yazi tur="kucuk">
              {d.alanEtiketleri[anahtar as keyof typeof d.alanEtiketleri] ?? anahtar}
            </Yazi>
            <Satir arasi="sm">
              <Sayi tur="kucuk" renk="metinSilik">
                {a ?? '—'} → {b ?? '—'} cm
              </Sayi>
              {fark !== null ? (
                <Etiket
                  metin={`${fark > 0 ? '+' : ''}${String(fark).replace('.', ',')}`}
                  tur={fark === 0 ? 'notr' : 'aksan'}
                />
              ) : null}
            </Satir>
          </Satir>
        );
      })}
      <Yazi tur="etiket" renk="metinSilik">
        {m.belNotu}
      </Yazi>
    </Kart>
  );
}

function FotografYeri({
  tarih,
  varMi,
  tema,
}: {
  tarih: string;
  varMi: boolean;
  tema: ReturnType<typeof useTema>;
}) {
  const m = useMetinler().karsilastirma;

  return (
    <View
      style={{
        aspectRatio: 3 / 4,
        borderRadius: tema.yaricap.md,
        borderWidth: 1,
        borderColor: tema.renk.cizgi,
        backgroundColor: tema.renk.yuzeyIkincil,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tema.bosluk.sm,
      }}
    >
      {varMi ? (
        <Svg width={60} height={90} viewBox="0 0 60 90">
          <Circle cx={30} cy={16} r={9} fill={tema.renk.metinSilik} opacity={0.3} />
          <Rect
            x={20}
            y={28}
            width={20}
            height={34}
            rx={6}
            fill={tema.renk.metinSilik}
            opacity={0.3}
          />
          <Rect
            x={23}
            y={62}
            width={6}
            height={24}
            rx={3}
            fill={tema.renk.metinSilik}
            opacity={0.3}
          />
          <Rect
            x={31}
            y={62}
            width={6}
            height={24}
            rx={3}
            fill={tema.renk.metinSilik}
            opacity={0.3}
          />
        </Svg>
      ) : (
        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.fotografYok}
        </Yazi>
      )}
      <Yazi tur="etiket" renk="metinSilik">
        {tarih}
      </Yazi>
    </View>
  );
}
