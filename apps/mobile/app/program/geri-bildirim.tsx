import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { hareketBul, kgMetni } from '@swiip/core';
import { hareketAdi, type GeriBildirim } from '@swiip/shared';
import {
  Dugme,
  Ekran,
  Kart,
  Sayi,
  Satir,
  SecimDugmesi,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { VucutHaritasi } from '../../src/degerlendirme/VucutHaritasi';
import { ApiHatasi, istek } from '../../src/veri/api';
import { useDil, useMetinler } from '../../src/durum/Oturum';

/**
 * Seans sonrası üç dokunuş (F3.9).
 *
 * Salonda kayıt tutulmuyor — spec bölüm 7. Kullanıcı seansı bitirdikten sonra üç dokunuşla
 * ne olduğunu söylüyor, motor kararını anında gösteriyoruz.
 *
 * Motor kararının anında görünmesi kritik: kullanıcı geri bildirimin bir yere gittiğini
 * görmezse ikinci hafta vermez.
 */

interface Kalem {
  id: string;
  exercise_id: string;
  target_sets: number;
  target_weight: number | null;
  target_reps_low: number;
  target_reps_high: number;
}

interface SeansCevabi {
  gunler: Array<{ seans: { id: string }; hareketler: Kalem[] }>;
}

const SECENEK_KODLARI: GeriBildirim[] = ['tamamladim', 'zorlandim', 'yapamadim'];

export default function GeriBildirimEkrani() {
  const tema = useTema();
  const m = useMetinler().geriBildirim;
  const dil = useDil();
  const { seans } = useLocalSearchParams<{ seans: string }>();

  const [kalemler, setKalemler] = useState<Kalem[] | null>(null);
  const [secimler, setSecimler] = useState<Record<string, GeriBildirim>>({});
  const [agriBolgeleri, setAgriBolgeleri] = useState<string[]>([]);
  const [agriAcik, setAgriAcik] = useState(false);
  const [atlamaAcik, setAtlamaAcik] = useState(false);
  const [kararlar, setKararlar] = useState<string[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const program = await istek<SeansCevabi>('/v1/program/aktif');
        const gun = program.gunler.find((g) => g.seans.id === seans) ?? program.gunler[0];
        setKalemler(gun?.hareketler ?? []);
      } catch {
        setKalemler([]);
      }
    })();
  }, [seans]);

  const gonder = async () => {
    setGonderiliyor(true);
    setHata(null);
    try {
      const cevap = await istek<{ motor_kararlari: string[] }>('/v1/program/geri-bildirim', {
        yontem: 'POST',
        govde: {
          seans_id: seans,
          kalemler: (kalemler ?? []).map((k) => ({
            hareket_id: k.exercise_id,
            sonuc: secimler[k.exercise_id] ?? 'tamamladim',
            agri: agriBolgeleri.length > 0,
          })),
        },
      });
      setKararlar(cevap.motor_kararlari);
    } catch (h) {
      if (h instanceof ApiHatasi && h.durum === 402) {
        router.push('/odeme/paywall');
        return;
      }
      setHata(h instanceof ApiHatasi ? h.mesaj : m.gonderilemedi);
    } finally {
      setGonderiliyor(false);
    }
  };

  const atla = async (sebep: string) => {
    setGonderiliyor(true);
    try {
      const cevap = await istek<{ mesaj: string }>(`/v1/program/seans/${seans}/atla`, {
        yontem: 'POST',
        govde: { sebep },
      });
      setKararlar([cevap.mesaj]);
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.gonderilemedi);
    } finally {
      setGonderiliyor(false);
    }
  };

  if (kararlar) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: m.kararSayfaBasligi }} />
        <Ekran>
          <Yazi tur="baslik1">{m.kararBaslik}</Yazi>
          <Yazi renk="metinYumusak">{m.kararGiris}</Yazi>

          {kararlar.map((karar, i) => (
            <Kart key={i} vurgulu>
              <Yazi>{karar}</Yazi>
            </Kart>
          ))}

          {agriBolgeleri.length > 0 ? <Uyari tur="uyari" govde={m.agriUyarisi} /> : null}

          <Dugme baslik={m.programaDon} onPress={() => router.replace('/(sekme)/program')} />
        </Ekran>
      </>
    );
  }

  if (!kalemler) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <View style={{ gap: tema.bosluk.xs }}>
          <Yazi tur="baslik1">{m.baslik}</Yazi>
          <Yazi tur="kucuk" renk="metinSilik">
            {m.girisMetni}
          </Yazi>
        </View>

        {kalemler.map((kalem) => {
          const hareket = hareketBul(kalem.exercise_id);
          return (
            <Kart key={kalem.id}>
              <Yazi tur="baslik3">{hareketAdi(hareket, dil, kalem.exercise_id)}</Yazi>
              <Satir arasi="md" hizala="baseline">
                {kalem.target_weight !== null ? (
                  <Sayi renk="metinYumusak">{kgMetni(kalem.target_weight)} kg</Sayi>
                ) : null}
                <Sayi renk="metinYumusak">
                  {kalem.target_sets} × {kalem.target_reps_low}-{kalem.target_reps_high}
                </Sayi>
              </Satir>

              <Satir arasi="sm">
                {SECENEK_KODLARI.map((kod) => {
                  const secili = secimler[kalem.exercise_id] === kod;
                  const ad = m[kod];
                  return (
                    <Pressable
                      key={kod}
                      onPress={() =>
                        setSecimler((onceki) => ({ ...onceki, [kalem.exercise_id]: kod }))
                      }
                      accessibilityRole="radio"
                      accessibilityLabel={`${hareketAdi(hareket, dil, kalem.exercise_id)}: ${ad}`}
                      accessibilityState={{ checked: secili }}
                      style={{
                        flex: 1,
                        minHeight: tema.dokunmaHedefi,
                        borderRadius: tema.yaricap.md,
                        borderWidth: secili ? 2 : 1,
                        borderColor: secili ? tema.renk.aksan : tema.renk.cizgi,
                        backgroundColor: secili ? tema.renk.aksanZemin : tema.renk.yuzey,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                      }}
                    >
                      <Yazi tur="kucuk" renk={secili ? 'aksan' : 'metinYumusak'} hizala="center">
                        {ad}
                      </Yazi>
                    </Pressable>
                  );
                })}
              </Satir>
            </Kart>
          );
        })}

        <Kart>
          <SecimDugmesi
            baslik={m.agriSorusu}
            aciklama={m.agriOpsiyonel}
            secili={agriAcik}
            onPress={() => setAgriAcik(!agriAcik)}
            cokluSecim
          />
          {agriAcik ? (
            <VucutHaritasi
              soru={{
                id: 'agri',
                text: m.agriHaritasiBasligi,
                type: 'bodymap',
                drives: ['agri_bildirimi'],
                regions: [
                  'boyun',
                  'omuz_sag',
                  'omuz_sol',
                  'dirsek_sag',
                  'dirsek_sol',
                  'bilek_sag',
                  'bilek_sol',
                  'ust_sirt',
                  'bel',
                  'kalca_sag',
                  'kalca_sol',
                  'diz_sag',
                  'diz_sol',
                  'ayak_bilegi_sag',
                  'ayak_bilegi_sol',
                ],
              }}
              deger={agriBolgeleri}
              onDegisim={(d) => setAgriBolgeleri(Array.isArray(d) ? (d as string[]) : [])}
            />
          ) : null}
        </Kart>

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <Dugme
          baslik={m.gonder}
          onPress={() => void gonder()}
          yukleniyor={gonderiliyor}
          pasif={Object.keys(secimler).length === 0}
        />

        <Pressable
          onPress={() => setAtlamaAcik(!atlamaAcik)}
          accessibilityRole="button"
          style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
        >
          <Yazi renk="metinSilik" hizala="center">
            {m.seansiAtladim}
          </Yazi>
        </Pressable>

        {atlamaAcik ? (
          <Kart>
            <Yazi tur="baslik3">{m.atlamaSebebi}</Yazi>
            <Yazi tur="kucuk" renk="metinSilik">
              {m.yargilamiyoruz}
            </Yazi>
            {m.atlamaSebepleri.map((sebep: string) => (
              <SecimDugmesi
                key={sebep}
                baslik={sebep}
                secili={false}
                onPress={() => void atla(sebep)}
              />
            ))}
          </Kart>
        ) : null}
      </Ekran>
    </>
  );
}
