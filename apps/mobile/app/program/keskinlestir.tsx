import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import type { Soru } from '@swiip/shared';
import {
  BosDurum,
  Dugme,
  Ekran,
  Sayi,
  Satir,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useMetinler } from '../../src/durum/Oturum';
import { SoruAlani } from '../../src/degerlendirme/SoruAlani';

/**
 * Programı keskinleştir — değerlendirmeyi kısaltmanın karşılığı.
 *
 * Değerlendirme 136 sorudan sekiz karta indi. Çıkan soruların bir kısmı gerçekten
 * gereksizdi; bir kısmı programı iyileştiriyor ama **ilk gün sorulması gerekmiyordu**.
 * İkincisi bu ekranda.
 *
 * Kritik fark: burası "istersen daha çok soru cevapla" listesi değil. Her satır
 * programın kendi karar izinden geliyor — hangi kuralın hangi soru yüzünden ateşlendiği
 * `decisions.inputs_jsonb` içinde zaten yazıyor. Yani teklifin görünür bir bedeli var:
 *
 *   "Karmaşık serbest ağırlık hareketlerini çıkardım — tekniğine ne kadar güvendiğini
 *    bilmiyorum."  · 10 hareket geri gelir · [Cevapla]
 *
 * Bu, "gerekçesi görünür program" vaadinin doğrudan devamı: zaten gösterdiğimiz karar
 * izinin üstüne bir düğme.
 */

interface Teklif {
  soru: Soru;
  kural: string;
  etkilenen: number;
}

export default function Keskinlestir() {
  const tema = useTema();
  const m = useMetinler().program.keskinlestirme;
  const [teklifler, setTeklifler] = useState<Teklif[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<string, unknown>>({});
  const [hazir, setHazir] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const sonuc = await istek<{ teklifler: Teklif[] }>('/v1/degerlendirme/keskinlestirme').catch(
        () => null,
      );
      setTeklifler(sonuc?.teklifler ?? []);
      setHazir(true);
    })();
  }, []);

  /**
   * Cevaplar değerlendirmeye yazılır, sonra program yeniden hesaplanır.
   *
   * İki adım ayrı ve sıralı: program üretimi profili okuyor, profil de cevapları.
   * Tersine çevrilirse kullanıcı cevabını verir ve program eskisi gibi kalır.
   */
  const kaydet = useCallback(async () => {
    if (Object.keys(cevaplar).length === 0) {
      router.back();
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      await istek('/v1/degerlendirme/cevap', { yontem: 'POST', govde: { cevaplar } });
      await istek('/v1/program/uret', { yontem: 'POST', govde: {} });
      router.replace('/(sekme)/program');
    } catch (h) {
      setHata(h instanceof Error ? h.message : String(h));
      setKaydediliyor(false);
    }
  }, [cevaplar]);

  if (!hazir) {
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
        {teklifler.length === 0 ? (
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
        ) : (
          <>
            <Yazi tur="baslik1">{m.baslik}</Yazi>
            <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

            {teklifler.map((teklif, sira) => (
              <View
                key={teklif.soru.id}
                style={{
                  gap: tema.bosluk.sm,
                  paddingTop: sira === 0 ? tema.bosluk.md : tema.bosluk.lg,
                  borderTopWidth: sira === 0 ? 0 : 1,
                  borderTopColor: tema.renk.cizgi,
                }}
              >
                {/*
                  Önce SEBEP, sonra soru.
                  Ters sırada olsaydı bu ekran "cevaplanmamış sorular listesi" olurdu ve
                  kullanıcı neden umursaması gerektiğini bilemezdi.
                */}
                <Yazi tur="kucuk" renk="metinYumusak">
                  {m.sebepler[teklif.kural as keyof typeof m.sebepler] ?? ''}
                </Yazi>
                {teklif.etkilenen > 0 ? (
                  <Satir arasi="xs">
                    <Sayi tur="kucuk" renk="aksan">
                      {m.etkilenen(teklif.etkilenen)}
                    </Sayi>
                  </Satir>
                ) : null}

                <SoruAlani
                  soru={teklif.soru}
                  cevaplar={cevaplar}
                  deger={cevaplar[teklif.soru.id] ?? null}
                  onDegisim={(deger) =>
                    setCevaplar((mevcut) => ({ ...mevcut, [teklif.soru.id]: deger }))
                  }
                />
              </View>
            ))}

            {hata ? (
              <Yazi tur="kucuk" renk="tehlike">
                {hata}
              </Yazi>
            ) : null}

            <View style={{ gap: tema.bosluk.sm, marginTop: tema.bosluk.lg }}>
              <Dugme baslik={m.kaydet} onPress={() => void kaydet()} yukleniyor={kaydediliyor} />
              <Dugme baslik={m.simdiDegil} tur="sessiz" onPress={() => router.back()} />
            </View>
          </>
        )}
      </Ekran>
    </>
  );
}
