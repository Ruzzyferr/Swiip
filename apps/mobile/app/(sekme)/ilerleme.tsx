import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { hareketBul, kgMetni } from '@swiip/core';
import {
  Ayirac,
  BosDurum,
  Dugme,
  Kart,
  Sayi,
  Satir,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { hareketAdi, islemHatasiMetni } from '@swiip/shared';
import { useDil, useMetinler, useSayilarGizli } from '../../src/durum/Oturum';
import { kisaTarihMetni } from '@swiip/shared';

/**
 * İlerleme (F: kilo/ölçü, hareket bazlı gelişim).
 *
 * ED modunda kilo grafiği kapalıdır. Yerine hareket bazlı gelişim gösterilir:
 * "daha ağır kaldırıyorsun" mesajı kiloya bakmadan da verilebilir.
 */

interface DisaAktarma {
  kilo_kayitlari: Array<{ gun: string; kilo_kg: number }>;
  ilerleme_durumu: Array<{
    exercise_id: string;
    current_weight: number;
    current_reps: number;
    e1rm: number;
  }>;
  vucut_analizleri: Array<{
    taken_at: string;
    bodyfat_low: number | null;
    bodyfat_high: number | null;
  }>;
}

export default function Ilerleme() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.ilerleme;
  const genel = metinler.genel;
  const sayilarGizli = useSayilarGizli();

  const [veri, setVeri] = useState<DisaAktarma | null>(null);
  const [hazir, setHazir] = useState(false);
  const [kilo, setKilo] = useState('');
  const [tdeeMesaji, setTdeeMesaji] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const dil = useDil();

  const yukle = useCallback(async () => {
    setVeri(await istek<DisaAktarma>('/v1/hesap/disa-aktar').catch(() => null));
    setHazir(true);
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const kiloKaydet = async () => {
    const sayi = Number(kilo.replace(',', '.'));
    if (!Number.isFinite(sayi)) return;

    setHata(null);
    try {
      await istek('/v1/beslenme/kilo', { yontem: 'POST', govde: { kilo_kg: sayi } });
    } catch {
      // Sessizce yutmak, kullanıcının kaydettiğini sanmasına yol açar.
      setHata(islemHatasiMetni('kilo_kaydet', dil));
      return;
    }
    setKilo('');

    const uyum = await istek<{ duzeltildi: boolean; mesaj: string }>('/v1/beslenme/tdee-uyumla', {
      yontem: 'POST',
      govde: {},
    }).catch(() => null);

    if (uyum) setTdeeMesaji(uyum.mesaj);
    void yukle();
  };

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  const kilolar = veri?.kilo_kayitlari ?? [];
  const hareketler = (veri?.ilerleme_durumu ?? []).filter((h) => h.current_weight > 0);
  const analizler = veri?.vucut_analizleri ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
      <View style={{ padding: tema.bosluk.lg, gap: tema.bosluk.lg }}>
        <Satir arasi="sm">
          <View style={{ flex: 1 }}>
            <Dugme
              baslik={m.fotografKarsilastir}
              tur="ikincil"
              onPress={() => router.push('/ilerleme/karsilastirma')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Dugme
              baslik={m.haftalikYapi}
              tur="ikincil"
              onPress={() => router.push('/program/hafta')}
            />
          </View>
        </Satir>

        {!sayilarGizli ? (
          <Kart>
            <Yazi tur="baslik3">{m.bugunkuKilon}</Yazi>
            <Satir arasi="sm">
              <TextInput
                value={kilo}
                onChangeText={setKilo}
                keyboardType="decimal-pad"
                placeholder="82,4"
                placeholderTextColor={tema.renk.metinSilik}
                accessibilityLabel={m.kiloErisim}
                style={{
                  flex: 1,
                  minHeight: tema.dokunmaHedefi,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: tema.renk.cizgi,
                  borderRadius: tema.yaricap.md,
                  paddingHorizontal: tema.bosluk.lg,
                  fontSize: 20,
                  fontVariant: ['tabular-nums'],
                  color: tema.renk.metin,
                  backgroundColor: tema.renk.zemin,
                }}
              />
              <Dugme baslik={genel.kaydet} onPress={() => void kiloKaydet()} tamGenislik={false} />
            </Satir>
            <Yazi tur="etiket" renk="metinSilik">
              {m.tartimNotu}
            </Yazi>
          </Kart>
        ) : (
          <Uyari baslik={m.edBaslik} govde={m.edGovde} />
        )}

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}
        {tdeeMesaji ? <Uyari govde={tdeeMesaji} /> : null}

        {!sayilarGizli && kilolar.length > 1 ? (
          <Kart>
            <Yazi tur="baslik3">{m.kiloSeyri}</Yazi>
            <KiloGrafigi kayitlar={kilolar} />
          </Kart>
        ) : null}

        {analizler.length > 0 && !sayilarGizli ? (
          <Kart>
            <Yazi tur="baslik3">{m.analizGecmisi}</Yazi>
            {analizler.slice(0, 6).map((analiz, i) => (
              <Satir key={i} dagit="space-between">
                <Yazi tur="kucuk" renk="metinYumusak">
                  {kisaTarihMetni(new Date(analiz.taken_at), dil)}
                </Yazi>
                <Sayi tur="kucuk" renk="aksan">
                  {/* Aralığın iki ucu da olmalı: tek uçlu bir "%22-0" yanlış bilgidir. */}
                  {analiz.bodyfat_low !== null && analiz.bodyfat_high !== null
                    ? m.yagOraniAraligi(analiz.bodyfat_low, analiz.bodyfat_high)
                    : '—'}
                </Sayi>
              </Satir>
            ))}
          </Kart>
        ) : null}

        {hareketler.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.hareketGelisimi}</Yazi>
            <Yazi tur="kucuk" renk="metinSilik">
              {m.hareketGelisimiNotu}
            </Yazi>
            <View style={{ gap: tema.bosluk.sm, marginTop: tema.bosluk.sm }}>
              {hareketler.slice(0, 12).map((h, i) => (
                <View key={h.exercise_id} style={{ gap: tema.bosluk.xs }}>
                  {i > 0 ? <Ayirac /> : null}
                  <Satir dagit="space-between">
                    <Yazi tur="kucuk" stil={{ flex: 1 }}>
                      {hareketAdi(hareketBul(h.exercise_id), dil, h.exercise_id)}
                    </Yazi>
                    <Sayi tur="kucuk" renk="aksan">
                      {kgMetni(h.current_weight)} kg × {h.current_reps}
                    </Sayi>
                  </Satir>
                </View>
              ))}
            </View>
          </Kart>
        ) : (
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
        )}
      </View>
    </ScrollView>
  );
}

/** Basit çizgi grafik — kütüphane yok, bağımlılık yok, hızlı. */
/**
 * Kilo seyri.
 *
 * Eskiden cubuk grafikti ve kodlamasi dogru degildi: cubuk yuksekligi
 * `%20 + araliktaki goreli konum` idi, yani sifirdan baslamayan bir cubuk. Cubuk
 * "sifirdan su kadar" demek; buradaki sayi bunu demiyordu. Iki kullanici ayni
 * grafikten farkli sey okuyabilirdi.
 *
 * Kilo surekli bir olcum; dogru bicimi cizgi. Eksen olcu aletinin govdesi (celik),
 * aksan yalnizca son okumayi gosteriyor.
 */
function KiloGrafigi({ kayitlar }: { kayitlar: Array<{ gun: string; kilo_kg: number }> }) {
  const tema = useTema();
  const son = kayitlar.slice(-30);
  const degerler = son.map((k) => k.kilo_kg);
  const enAz = Math.min(...degerler);
  const enCok = Math.max(...degerler);
  // Duz bir seride sifira bolunmesin; aralik yoksa yapay bir aralik aciyoruz.
  const aralik = Math.max(0.5, enCok - enAz);

  const YUKSEK = 120;
  const PAY = 12;
  const y = (kilo: number) => PAY + (1 - (kilo - enAz) / aralik) * (YUKSEK - PAY * 2);
  const x = (i: number) => (son.length === 1 ? 50 : (i / (son.length - 1)) * 100);

  const yol = son.map((k, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(k.kilo_kg)}`).join(' ');
  const ilk = son[0]?.kilo_kg ?? 0;
  const sonuncu = son[son.length - 1]?.kilo_kg ?? 0;
  const fark = Math.round((sonuncu - ilk) * 10) / 10;

  return (
    <View style={{ gap: tema.bosluk.sm }}>
      <View style={{ height: YUKSEK }}>
        <Svg width="100%" height={YUKSEK} viewBox={`0 0 100 ${YUKSEK}`} preserveAspectRatio="none">
          {/* En dusuk ve en yuksek okuma: olcegin iki ucu. */}
          {[enAz, enCok].map((deger) => (
            <Line
              key={deger}
              x1={0}
              y1={y(deger)}
              x2={100}
              y2={y(deger)}
              stroke={tema.renk.celikSilik}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <Path
            d={yol}
            stroke={tema.renk.aksan}
            strokeWidth={2}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          <Circle cx={x(son.length - 1)} cy={y(sonuncu)} r={2.5} fill={tema.renk.aksan} />
        </Svg>
      </View>
      <Satir dagit="space-between">
        <Sayi tur="etiket" renk="metinSilik">
          {kgMetni(ilk)} kg
        </Sayi>
        <Sayi tur="etiket" renk={fark === 0 ? 'metinSilik' : 'aksan'}>
          {fark > 0 ? '+' : ''}
          {kgMetni(fark)} kg
        </Sayi>
        <Sayi tur="etiket" renk="metin">
          {kgMetni(sonuncu)} kg
        </Sayi>
      </Satir>
    </View>
  );
}
