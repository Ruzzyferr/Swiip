import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { hareketBul, kgMetni } from '@made2fit/core';
import type { Metinler } from '@made2fit/shared';
import {
  Ayirac,
  BosDurum,
  Dugme,
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
import { ANAHTARLAR, oku, yaz } from '../../src/veri/onbellek';
import { useMetinler, useSayilarGizli } from '../../src/durum/Oturum';

/**
 * 1. GÜN AÇILIŞI — ürünün tamamının kazanıldığı veya kaybedildiği ekran.
 *
 * Kullanıcı 134 soruya cevap verdi, fotoğrafını yükledi, 12 dakikasını harcadı.
 * Bu ekran ona "emeğin karşılığını aldın" demek zorunda — programı göstererek değil,
 * CEVAPLARINI PROGRAMDA GÖSTEREREK.
 *
 * Bu yüzden her hareket kartında gerekçe hareketin kendisiyle aynı görsel ağırlıkta durur.
 * Gerekçeyi ikincil bir ekrana saklamak, ürünün tezini saklamak olurdu.
 *
 * Çevrimdışı: son program cihazda önbelleklenir, uçak modunda açılır.
 */

interface SeansKalemi {
  id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_weight: number | null;
  target_reps_low: number;
  target_reps_high: number;
  rest_seconds: number;
  progression_rule_text: string;
  alternatifler: string[];
  feedback: string | null;
}

interface Gun {
  seans: {
    id: string;
    gun_indeksi: number;
    gun_tipi: string;
    tahmini_dakika: number | null;
    status: string;
  };
  hareketler: SeansKalemi[];
}

interface ProgramCevabi {
  program_id: string;
  hafta: number;
  split: { tip: string; gerekce: string; gunler: string[] };
  uyarilar: string[];
  plan: string;
  kilitli_gun_sayisi: number;
  gunler: Gun[];
}

export default function ProgramEkrani() {
  const tema = useTema();
  const m = useMetinler().program;
  const sayilarGizli = useSayilarGizli();

  const [program, setProgram] = useState<ProgramCevabi | null>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'yok' | 'cevrimdisi'>('yukleniyor');
  const [yenileniyor, setYenileniyor] = useState(false);
  const [gerekceler, setGerekceler] = useState<Record<string, string>>({});

  const yukle = useCallback(async () => {
    try {
      const cevap = await istek<ProgramCevabi>('/v1/program/aktif');
      setProgram(cevap);
      await yaz(ANAHTARLAR.program, cevap);
      setDurum('hazir');

      // Gerekçeler ayrı çekilir: program yavaşlamasın, gerekçe eksik kalmasın.
      const ilkGun = cevap.gunler[0];
      if (ilkGun) {
        const sonuclar = await Promise.all(
          ilkGun.hareketler.map(async (h) => {
            try {
              const g = await istek<{ aciklama: string }>(`/v1/program/gerekce/${h.exercise_id}`);
              return [h.exercise_id, g.aciklama] as const;
            } catch {
              return [h.exercise_id, ''] as const;
            }
          }),
        );
        setGerekceler(Object.fromEntries(sonuclar.filter(([, a]) => a !== '')));
      }
    } catch (hata) {
      const onbellek = await oku<ProgramCevabi>(ANAHTARLAR.program);
      if (onbellek) {
        setProgram(onbellek);
        setDurum('cevrimdisi');
        return;
      }
      setDurum(hata instanceof ApiHatasi && hata.durum === 404 ? 'yok' : 'cevrimdisi');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const uret = async () => {
    setDurum('yukleniyor');
    try {
      await istek('/v1/program/uret', { yontem: 'POST', govde: { hafta: 1 } });
      await yukle();
    } catch (hata) {
      setDurum('yok');
      if (hata instanceof ApiHatasi && hata.durum === 403) {
        router.push({ pathname: '/degerlendirme/kapi', params: { tip: 'kardiyak' } });
      }
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.yukleniyor} />
      </View>
    );
  }

  if (durum === 'yok' || !program) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
        <View style={{ padding: tema.bosluk.lg, gap: tema.bosluk.lg }}>
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
          <Dugme baslik={m.programimiHesapla} onPress={() => void uret()} />
          <Dugme
            baslik={m.degerlendirmeyeDon}
            tur="sessiz"
            onPress={() => router.push('/degerlendirme')}
          />
        </View>
      </ScrollView>
    );
  }

  const bugun = program.gunler[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.renk.zemin }}
      refreshControl={
        <RefreshControl
          refreshing={yenileniyor}
          onRefresh={() => {
            setYenileniyor(true);
            void yukle().finally(() => setYenileniyor(false));
          }}
          tintColor={tema.renk.aksan}
        />
      }
    >
      <View style={{ padding: tema.bosluk.lg, gap: tema.bosluk.lg }}>
        {durum === 'cevrimdisi' ? <Uyari tur="uyari" govde={m.cevrimdisiNotu} /> : null}

        <View style={{ gap: tema.bosluk.xs }}>
          <Yazi tur="etiket" renk="aksan">
            {program.hafta}. {m.haftaEki}
          </Yazi>
          <Yazi tur="dev">{m.hazir}</Yazi>
        </View>

        {/* NEDEN BU PROGRAM — cevapların programa dönüştüğü yer. */}
        <Kart vurgulu>
          <Yazi tur="etiket" renk="aksan">
            {m.nedenBuProgram}
          </Yazi>
          <Yazi renk="metinYumusak">{program.split.gerekce}</Yazi>
          <Satir dagit="space-between">
            <Pressable
              onPress={() => router.push('/program/neden')}
              accessibilityRole="button"
              style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
            >
              <Yazi renk="aksan">{m.kararlarinTamami}</Yazi>
            </Pressable>
            <Pressable
              onPress={() => router.push('/program/hafta')}
              accessibilityRole="button"
              style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
            >
              <Yazi renk="aksan">{m.haftalikYapi}</Yazi>
            </Pressable>
          </Satir>
        </Kart>

        {program.uyarilar.map((uyari, i) => (
          <Uyari key={i} tur="uyari" govde={uyari} />
        ))}

        {bugun ? (
          <View style={{ gap: tema.bosluk.md }}>
            <Satir dagit="space-between">
              <Yazi tur="baslik2">{m.gunBasligi(1, gunTipi(m, bugun.seans.gun_tipi))}</Yazi>
              {bugun.seans.tahmini_dakika ? (
                <Etiket metin={m.dakikaEtiketi(bugun.seans.tahmini_dakika)} />
              ) : null}
            </Satir>

            {bugun.hareketler.map((kalem) => (
              <HareketKarti
                key={kalem.id}
                kalem={kalem}
                gerekce={gerekceler[kalem.exercise_id]}
                sayilarGizli={sayilarGizli}
                onPress={() =>
                  router.push({
                    pathname: '/program/hareket',
                    params: { id: kalem.exercise_id, seans: bugun.seans.id },
                  })
                }
              />
            ))}

            <Dugme
              baslik={m.seansiBitirdim}
              onPress={() =>
                router.push({
                  pathname: '/program/geri-bildirim',
                  params: { seans: bugun.seans.id },
                })
              }
              erisimIpucu={m.seansErisimIpucu}
            />
          </View>
        ) : null}

        {program.kilitli_gun_sayisi > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.kilitliGun(program.kilitli_gun_sayisi)}</Yazi>
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.kilitliGovde}
            </Yazi>
            <Dugme
              baslik={m.planlaraBak}
              tur="ikincil"
              onPress={() => router.push('/odeme/paywall')}
            />
          </Kart>
        ) : (
          program.gunler.slice(1).map((gun) => (
            <Kart key={gun.seans.id}>
              <Satir dagit="space-between">
                <Yazi tur="baslik3">
                  {m.gunBasligi(gun.seans.gun_indeksi + 1, gunTipi(m, gun.seans.gun_tipi))}
                </Yazi>
                <Etiket
                  metin={
                    gun.seans.status === 'tamamlandi'
                      ? m.tamamEtiketi
                      : m.hareketEtiketi(gun.hareketler.length)
                  }
                />
              </Satir>
              <Yazi tur="kucuk" renk="metinSilik">
                {gun.hareketler
                  .map((h) => hareketBul(h.exercise_id)?.ad_tr ?? h.exercise_id)
                  .join(' · ')}
              </Yazi>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/program/gun', params: { seans: gun.seans.id } })
                }
                accessibilityRole="button"
                style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
              >
                <Yazi renk="aksan">{m.bugunuAc}</Yazi>
              </Pressable>
            </Kart>
          ))
        )}

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.duzenlemeUcretsiz}
        </Yazi>
      </View>
    </ScrollView>
  );
}

function HareketKarti({
  kalem,
  gerekce,
  sayilarGizli,
  onPress,
}: {
  kalem: SeansKalemi;
  gerekce?: string;
  sayilarGizli: boolean;
  onPress: () => void;
}) {
  const tema = useTema();
  const m = useMetinler().program;
  const hareket = hareketBul(kalem.exercise_id);

  return (
    <Kart>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={hareket?.ad_tr}>
        <Satir dagit="space-between" hizala="flex-start">
          <Yazi tur="baslik3" stil={{ flex: 1 }}>
            {hareket?.ad_tr ?? kalem.exercise_id}
          </Yazi>
        </Satir>

        <Satir arasi="lg" hizala="baseline">
          <Sayi tur="baslik2">
            {kalem.target_sets} × {kalem.target_reps_low}-{kalem.target_reps_high}
          </Sayi>
          {kalem.target_weight !== null && !sayilarGizli ? (
            <Sayi tur="baslik3" renk="aksan">
              {kgMetni(kalem.target_weight)} kg
            </Sayi>
          ) : (
            <Yazi tur="kucuk" renk="metinSilik">
              {kalem.target_weight === null ? m.vucutAgirligi : ''}
            </Yazi>
          )}
        </Satir>

        <Yazi tur="etiket" renk="metinSilik">
          {m.dinlenmeEtiketi(kalem.rest_seconds)}
        </Yazi>
      </Pressable>

      <Ayirac />

      <View style={{ gap: tema.bosluk.xs }}>
        <Yazi tur="etiket" renk="metinSilik">
          {m.ilerlemeKurali}
        </Yazi>
        <Yazi tur="kucuk" renk="metinYumusak">
          {kalem.progression_rule_text}
        </Yazi>
      </View>

      {gerekce ? (
        <View
          style={{
            gap: tema.bosluk.xs,
            backgroundColor: tema.renk.aksanZemin,
            padding: tema.bosluk.md,
            borderRadius: tema.yaricap.sm,
          }}
        >
          <Yazi tur="etiket" renk="aksan">
            {m.nedenBuHareket}
          </Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {gerekce}
          </Yazi>
        </View>
      ) : null}

      {kalem.alternatifler.length > 0 ? (
        <View style={{ gap: tema.bosluk.xs }}>
          <Yazi tur="etiket" renk="metinSilik">
            {m.makineDoluysa}
          </Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {kalem.alternatifler
              .slice(0, 3)
              .map((id) => hareketBul(id)?.ad_tr ?? id)
              .join(' · ')}
          </Yazi>
        </View>
      ) : null}
    </Kart>
  );
}

/** Gün tipi kodunu görünen ada çevirir; bilinmeyen kod olduğu gibi gösterilir. */
function gunTipi(m: Metinler['program'], kod: string): string {
  return m.gunTipleri[kod as keyof typeof m.gunTipleri] ?? kod;
}
