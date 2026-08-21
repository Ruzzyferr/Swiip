import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { grupAdi } from '@swiip/core';
import type { HacimGrubu, Metinler } from '@swiip/shared';
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
import { useMetinler } from '../../src/durum/Oturum';

/**
 * Haftalık yapı ve hacim görünümü.
 *
 * Kullanıcı "bu hafta ne yapıyorum" sorusunu tek ekranda görsün diye var. Hacim bütçesi
 * çubuklu gösterilir; hangi bölgeye neden fazladan set ayrıldığı görünür.
 *
 * Motorun 12 haftalık tablo üretmediğini burada da açıkça söylüyoruz — haftanın yapısı
 * ve hedefleri belli, ama gelecek haftanın ağırlıkları bu haftanın geri bildirimi
 * gelmeden var olmuyor.
 */

interface Gun {
  seans: {
    id: string;
    gun_indeksi: number;
    gun_tipi: string;
    tahmini_dakika: number | null;
    planned_for: string | null;
    status: string;
  };
  hareketler: Array<{ exercise_id: string; target_sets: number }>;
}

interface ProgramCevabi {
  hafta: number;
  split: { tip: string; gerekce: string; gunler: string[] };
  butce: Record<string, number>;
  gunler: Gun[];
  takvim?: { gunler: number[] };
  kilitli_gun_sayisi: number;
}

const SPLIT_ADLARI: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper/Lower',
  upper_lower_full: 'Upper/Lower/Full',
  ppl: 'Push/Pull/Legs',
  upper_lower_ppl: 'Upper/Lower/Push/Pull/Legs',
  ppl_x2: 'Push/Pull/Legs ×2',
};

export default function HaftalikYapi() {
  const tema = useTema();
  const p = useMetinler().program;
  const m = p.hafta;

  const [program, setProgram] = useState<ProgramCevabi | null>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    void istek<ProgramCevabi>('/v1/program/aktif')
      .then(setProgram)
      .catch(() => setProgram(null))
      .finally(() => setHazir(true));
  }, []);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  if (!program) {
    return (
      <Ekran>
        <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
      </Ekran>
    );
  }

  const butceler = Object.entries(program.butce).sort(([, a], [, b]) => b - a);
  const enYuksek = butceler[0]?.[1] ?? 1;
  const toplamSet = butceler.reduce((t, [, set]) => t + set, 0);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <View style={{ gap: tema.bosluk.xs }}>
          <Yazi tur="etiket" renk="aksan">
            {program.hafta}. HAFTA
          </Yazi>
          <Yazi tur="baslik1">{SPLIT_ADLARI[program.split.tip] ?? program.split.tip}</Yazi>
        </View>

        <Kart vurgulu>
          <Yazi tur="etiket" renk="aksan">
            {m.yapiNedenSecildi}
          </Yazi>
          <Yazi renk="metinYumusak">{program.split.gerekce}</Yazi>
        </Kart>

        {program.takvim && program.takvim.gunler.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.yerlesimBasligi}</Yazi>
            <Satir dagit="space-between">
              {m.gunKisaltmalari.map((ad: string, gun: number) => {
                const seansVar = program.takvim!.gunler.includes(gun);
                return (
                  <View
                    key={ad}
                    accessibilityLabel={`${ad} ${seansVar ? m.antrenmanGunu : m.dinlenmeGunu}`}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: tema.bosluk.xs,
                      paddingVertical: tema.bosluk.sm,
                      borderRadius: tema.yaricap.sm,
                      backgroundColor: seansVar ? tema.renk.aksanZemin : 'transparent',
                    }}
                  >
                    <Yazi tur="etiket" renk={seansVar ? 'aksan' : 'metinSilik'}>
                      {ad}
                    </Yazi>
                  </View>
                );
              })}
            </Satir>
            <Yazi tur="kucuk" renk="metinSilik">
              {m.yerlesimNotu}
            </Yazi>
          </Kart>
        ) : null}

        <Kart>
          <Satir dagit="space-between">
            <Yazi tur="baslik3">{m.hacimButcesi}</Yazi>
            <Sayi tur="kucuk" renk="aksan">
              {toplamSet} set
            </Sayi>
          </Satir>
          <Yazi tur="kucuk" renk="metinSilik">
            {m.hacimButcesiNotu}
          </Yazi>

          <View style={{ gap: tema.bosluk.sm, marginTop: tema.bosluk.sm }}>
            {butceler.map(([grup, set]) => (
              <View key={grup} style={{ gap: 4 }}>
                <Satir dagit="space-between">
                  <Yazi tur="kucuk">{grupAdi(grup as HacimGrubu)}</Yazi>
                  <Sayi tur="kucuk" renk="aksan">
                    {set} set
                  </Sayi>
                </Satir>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: tema.renk.yuzeyIkincil,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${(set / enYuksek) * 100}%`,
                      height: '100%',
                      backgroundColor: tema.renk.aksan,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Kart>

        <Yazi tur="baslik2">{m.haftaninGunleri}</Yazi>

        {program.gunler.map((gun) => {
          const setToplami = gun.hareketler.reduce((t, h) => t + h.target_sets, 0);
          return (
            <Kart key={gun.seans.id}>
              <Satir dagit="space-between" hizala="flex-start">
                <Yazi tur="baslik3">
                  {p.gunBasligi(gun.seans.gun_indeksi + 1, gunTipi(p, gun.seans.gun_tipi))}
                </Yazi>
                <Etiket
                  metin={gun.seans.status === 'tamamlandi' ? 'TAMAM' : 'PLANLANDI'}
                  tur={gun.seans.status === 'tamamlandi' ? 'aksan' : 'notr'}
                />
              </Satir>
              <Satir arasi="lg">
                <Yazi tur="kucuk" renk="metinSilik">
                  {gun.hareketler.length} hareket
                </Yazi>
                <Yazi tur="kucuk" renk="metinSilik">
                  {setToplami} set
                </Yazi>
                {gun.seans.tahmini_dakika ? (
                  <Yazi tur="kucuk" renk="metinSilik">
                    ~{gun.seans.tahmini_dakika} dk
                  </Yazi>
                ) : null}
              </Satir>
            </Kart>
          );
        })}

        {program.kilitli_gun_sayisi > 0 ? (
          <Uyari tur="uyari" govde={m.kilitliNotu(program.kilitli_gun_sayisi)} />
        ) : null}

        <Ayirac />

        <Kart>
          <Yazi tur="baslik3">{m.gelecekHaftaBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.gelecekHaftaGovde}
          </Yazi>
        </Kart>
      </Ekran>
    </>
  );
}

/** Gün tipi kodunu görünen ada çevirir; bilinmeyen kod olduğu gibi gösterilir. */
function gunTipi(m: Metinler['program'], kod: string): string {
  return m.gunTipleri[kod as keyof typeof m.gunTipleri] ?? kod;
}
