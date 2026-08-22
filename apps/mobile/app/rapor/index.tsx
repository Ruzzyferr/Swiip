import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import type { VucutRaporu } from '@swiip/core';
import {
  Ayirac,
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
import { Skala } from '../../src/tasarim/Skala';
import { ApiHatasi, istek } from '../../src/veri/api';
import { useMetinler, useSayilarGizli } from '../../src/durum/Oturum';

/**
 * Vücut analizi raporu (F4.7) — ücretsiz katmanın en somut çıktısı.
 *
 * İki kural her satırda geçerli:
 *  - Yağ oranı aralık olarak sunulur. "%18,4" değil, "%16-21".
 *  - Duruş bulguları eğilim dilinde yazılır. Tanı adı geçmez.
 */

interface AnalizCevabi {
  analiz_id: string;
  rapor: VucutRaporu;
  sayilar_gizli: boolean;
  gizlilik_notu: string;
}

export default function Rapor() {
  const tema = useTema();
  const m = useMetinler().rapor;
  const sayilarGizli = useSayilarGizli();

  const [analiz, setAnaliz] = useState<AnalizCevabi | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        /**
         * ÖNCE OKU, gerekirse üret.
         *
         * Bu ekran raporu görmek için `POST /vucut/analiz` çağırıyordu ve o uç her
         * çağrıda yeni analiz üretiyor. Çekim ekranı da aynı ucu çağırdığı için tek
         * dokunuşta iki istek gidiyordu: ilki başarılı (hak harcanır), ikincisi 403.
         * Kullanıcı kendi analizini hiç göremiyordu — ücretsiz katmanda ömür boyu tek
         * hak olduğu için kalıcı olarak.
         *
         * Okuma ve yazma ayrıldı: rapor varsa okunur, yoksa (ölçülerle devam eden
         * kullanıcı) bir kez üretilir.
         */
        try {
          setAnaliz(await istek<AnalizCevabi>('/v1/vucut/analiz/son'));
          return;
        } catch (okumaHatasi) {
          // 404 dışında bir şeyse üretmeyi denemek yanlış olur; sebebi kullanıcıya söylenir.
          if (!(okumaHatasi instanceof ApiHatasi) || okumaHatasi.durum !== 404) throw okumaHatasi;
        }

        setAnaliz(await istek<AnalizCevabi>('/v1/vucut/analiz', { yontem: 'POST', govde: {} }));
      } catch (h) {
        /**
         * Sunucunun söylediği sebebi gösteriyoruz.
         *
         * Her hata "Analiz şu an yapılamadı. Ölçülerini girip tekrar deneyebilirsin."
         * oluyordu. Analiz hakkı bittiğinde bu cümle yanlış yönlendirme: kullanıcı
         * ölçülerini giriyor, yine olmuyor ve nedenini öğrenemiyor.
         */
        setHata(h instanceof ApiHatasi ? h.mesaj : m.hataMesaji);
      }
    })();
  }, [m.hataMesaji]);

  if (hata) {
    return (
      <Ekran>
        <BosDurum baslik={m.hataBaslik} govde={hata} />
        <Dugme baslik={m.programaGec} onPress={() => router.replace('/(sekme)/program')} />
      </Ekran>
    );
  }

  if (!analiz) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.yukleniyor} />
      </View>
    );
  }

  const rapor = analiz.rapor;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.analizRaporun}</Yazi>
        <Yazi renk="metinYumusak">{rapor.ozet}</Yazi>

        {rapor.yag_orani && !sayilarGizli ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.yagOraniAraligi}
            </Yazi>
            {/*
              Yağ oranı bir kumpas okuması.

              Düz metin olarak "%20-28" yazıyordu: ürünün en çok "ölçüm" olan çıktısı,
              bir dizeye sıkışmıştı. Bu bir ARALIK — nerede başladığı, nerede bittiği ve
              ölçeğin neresinde durduğu bilgi taşıyor. Taksimat motifinin ikinci ve son
              yeri burası; ekranda başka ölçek yok.
            */}
            <Skala
              alt={5}
              ust={45}
              isaretAlt={rapor.yag_orani.alt}
              isaretUst={rapor.yag_orani.ust}
              birim="%"
            />
            <Yazi tur="kucuk" renk="metinYumusak">
              {rapor.yag_orani.kaynak === 'capraz'
                ? m.kaynakIkisi
                : rapor.yag_orani.kaynak === 'olcu'
                  ? m.kaynakOlcu
                  : m.kaynakFotograf}
            </Yazi>
            <Etiket metin={m.tahminEtiketi} />
          </Kart>
        ) : null}

        {sayilarGizli ? <Uyari baslik={m.edBaslik} govde={m.edGovde} /> : null}

        {rapor.bel_boy && !sayilarGizli ? (
          <Kart>
            <Satir dagit="space-between">
              <Yazi tur="baslik3">{m.belBoyBasligi}</Yazi>
              <Sayi tur="baslik3" renk={rapor.bel_boy.uyari ? 'uyari' : 'aksan'}>
                {rapor.bel_boy.oran.toFixed(2).replace('.', ',')}
              </Sayi>
            </Satir>
            <Yazi tur="kucuk" renk="metinYumusak">
              {rapor.bel_boy.mesaj}
            </Yazi>
          </Kart>
        ) : null}

        {rapor.kas_dagilimi.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.kasDagilimiBasligi}</Yazi>
            <Yazi tur="kucuk" renk="metinSilik">
              {m.kasDagilimiNotu}
            </Yazi>
            <View style={{ gap: tema.bosluk.sm, marginTop: tema.bosluk.sm }}>
              {rapor.kas_dagilimi.map((kalem) => (
                <View key={kalem.bolge} style={{ gap: 4 }}>
                  <Satir dagit="space-between">
                    <Yazi tur="kucuk">{kalem.bolge}</Yazi>
                    <Yazi tur="etiket" renk="metinSilik">
                      {m.kasSkorAdlari[kalem.skor as keyof typeof m.kasSkorAdlari] ?? ''}
                    </Yazi>
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
                        width: `${(kalem.skor / 5) * 100}%`,
                        height: '100%',
                        backgroundColor: tema.renk.aksan,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Kart>
        ) : null}

        {rapor.durus.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.durusBasligi}</Yazi>
            {rapor.durus.map((satir, i) => (
              <View key={i} style={{ gap: tema.bosluk.xs }}>
                {i > 0 ? <Ayirac /> : null}
                <Yazi tur="kucuk" renk="metinYumusak">
                  {satir}
                </Yazi>
              </View>
            ))}
          </Kart>
        ) : null}

        {rapor.sinirlamalar.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.sinirlarBasligi}</Yazi>
            {rapor.sinirlamalar.map((satir, i) => (
              <Yazi key={i} tur="kucuk" renk="metinSilik">
                {satir}
              </Yazi>
            ))}
          </Kart>
        ) : null}

        <Uyari tur="uyari" govde={rapor.feragat} />
        <Uyari govde={analiz.gizlilik_notu} />

        <Dugme
          baslik={m.hedefGercekciMi}
          tur="ikincil"
          onPress={() => router.push('/rapor/gerceklik')}
        />
        <Dugme
          baslik={m.programimiGor}
          onPress={() => router.replace('/(sekme)/program')}
          erisimIpucu={m.programErisimIpucu}
        />
      </Ekran>
    </>
  );
}
