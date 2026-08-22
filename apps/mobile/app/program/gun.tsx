import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { hareketBul, kgMetni } from '@swiip/core';
import { hareketAdi, type Metinler } from '@swiip/shared';
import {
  Ayirac,
  Dugme,
  Ekran,
  Etiket,
  Kart,
  Sayi,
  Satir,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useDil, useMetinler, useSayilarGizli } from '../../src/durum/Oturum';

/** Günün programı — 1. gün dışındaki günler için okuma ekranı. */

interface Kalem {
  id: string;
  exercise_id: string;
  target_sets: number;
  target_weight: number | null;
  target_reps_low: number;
  target_reps_high: number;
  rest_seconds: number;
  progression_rule_text: string;
  alternatifler: string[];
}

interface Gun {
  seans: { id: string; gun_indeksi: number; gun_tipi: string; tahmini_dakika: number | null };
  hareketler: Kalem[];
}

export default function GunDetayi() {
  const tema = useTema();
  const m = useMetinler().program;
  const sayilarGizli = useSayilarGizli();
  const dil = useDil();
  const { seans } = useLocalSearchParams<{ seans: string }>();

  const [gun, setGun] = useState<Gun | null>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    void (async () => {
      const program = await istek<{ gunler: Gun[] }>('/v1/program/aktif').catch(() => null);
      setGun(program?.gunler.find((g) => g.seans.id === seans) ?? null);
      setHazir(true);
    })();
  }, [seans]);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  if (!gun) {
    return (
      <Ekran>
        <Yazi tur="baslik2">{m.gunBulunamadi}</Yazi>
        <Dugme baslik={m.programaDon} onPress={() => router.back()} />
      </Ekran>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: m.gunEki(gun.seans.gun_indeksi + 1),
        }}
      />
      <Ekran>
        <Satir dagit="space-between">
          <Yazi tur="baslik1">{gunTipi(m, gun.seans.gun_tipi)}</Yazi>
          {gun.seans.tahmini_dakika ? (
            <Etiket metin={m.dakikaEtiketi(gun.seans.tahmini_dakika)} />
          ) : null}
        </Satir>

        {gun.hareketler.map((kalem) => {
          const hareket = hareketBul(kalem.exercise_id);
          return (
            <Kart key={kalem.id}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/program/hareket',
                    params: { id: kalem.exercise_id, seans: gun.seans.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={hareketAdi(hareket, dil, kalem.exercise_id)}

                style={{ minHeight: tema.dokunmaHedefi }}
              >
                <Yazi tur="baslik3">{hareketAdi(hareket, dil, kalem.exercise_id)}</Yazi>
                <Satir arasi="lg" hizala="baseline">
                  <Sayi tur="baslik3">
                    {kalem.target_sets} × {kalem.target_reps_low}-{kalem.target_reps_high}
                  </Sayi>
                  {kalem.target_weight !== null && !sayilarGizli ? (
                    <Sayi renk="aksan">{kgMetni(kalem.target_weight)} kg</Sayi>
                  ) : null}
                </Satir>
                <Yazi tur="etiket" renk="metinSilik">
                  {m.dinlenmeEtiketi(kalem.rest_seconds)}
                </Yazi>
              </Pressable>

              <Ayirac />
              <Yazi tur="etiket" renk="metinSilik">
                {m.ilerlemeKurali}
              </Yazi>
              <Yazi tur="kucuk" renk="metinYumusak">
                {kalem.progression_rule_text}
              </Yazi>
            </Kart>
          );
        })}

        <Dugme
          baslik={m.seansiBitirdim}
          onPress={() =>
            router.push({ pathname: '/program/geri-bildirim', params: { seans: gun.seans.id } })
          }
        />
      </Ekran>
    </>
  );
}

/** Gün tipi kodunu görünen ada çevirir; bilinmeyen kod olduğu gibi gösterilir. */
function gunTipi(m: Metinler['program'], kod: string): string {
  return m.gunTipleri[kod as keyof typeof m.gunTipleri] ?? kod;
}
