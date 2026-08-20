import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  ATLANDI,
  blokIlerlemesi,
  cevabiDogrula,
  gorunurSorular,
  sonrakiSoru,
  type Cevaplar,
  type GorunurSoru,
} from '@made2fit/core';
import { SORU_BANKASI } from '@made2fit/shared';
import {
  Dugme,
  Ekran,
  IlerlemeCubugu,
  Satir,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { SoruAlani } from '../../src/degerlendirme/SoruAlani';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { istek } from '../../src/veri/api';
import { baglantiSorunuMu, yeniCevaplar } from '@made2fit/shared';
import { islemHatasiMetni } from '@made2fit/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { buyukHarf } from '@made2fit/shared';
import { ANAHTARLAR, oku, yaz } from '../../src/veri/onbellek';

/**
 * Değerlendirme koşucusu (F2.1, F2.6, F2.9).
 *
 * Görünürlük ve sıradaki soru tamamen çekirdek motordan gelir — arayüz kendi dallanma
 * mantığını kurmaz. Bu, sunucu ile istemcinin farklı soru göstermesi hatasını yapısal
 * olarak imkânsız kılar.
 *
 * Kayıt blok bazlı: her blok bittiğinde sunucuya yazılır. Ağ yoksa cihazda tutulur,
 * bağlantı gelince gönderilir. 12 dakikalık emek internet kesintisiyle kaybolmaz.
 */

interface DurumCevabi {
  ilerleme: ReturnType<typeof blokIlerlemesi>;
  sonraki_soru: GorunurSoru | null;
}

interface CevapSonucu {
  ilerleme: ReturnType<typeof blokIlerlemesi>;
  kapi_durumu: {
    kayit_engelli: boolean;
    program_engelli: boolean;
    kapilar: Array<{ tip: string; mesaj: string; eylem: string }>;
  };
  blok_geri_bildirimi: { blok_id: string; metin: string } | null;
}

export default function Degerlendirme() {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const dil = useDil();
  const kenar = useSafeAreaInsets();

  const [cevaplar, setCevaplar] = useState<Cevaplar>({});
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [cevrimdisi, setCevrimdisi] = useState(false);
  /**
   * Sunucuya gerçekten kaydettiğimiz cevaplar.
   *
   * Her kayıtta tüm küme gönderiliyordu. Sunucu gelen her cevabı doğruluyor; küme içinde
   * bir kez geçersiz cevap oluşursa sonraki her kayıt da reddedilir ve değerlendirme
   * kalıcı olarak zehirlenir — kullanıcı 123 soruyu bitirir, hiçbiri kaydedilmemiştir.
   * Artık yalnızca fark gidiyor.
   */
  const gonderilmis = useRef<Cevaplar>({});

  // Açılışta: önce cihazdaki taslak, sonra sunucudaki kayıt.
  useEffect(() => {
    void (async () => {
      const taslak = await oku<Cevaplar>(ANAHTARLAR.degerlendirmeTaslagi);
      if (taslak) setCevaplar(taslak);

      try {
        const durum = await istek<DurumCevabi & { degerlendirme_id: string; cevaplar?: Cevaplar }>(
          '/v1/degerlendirme/durum',
        );
        // Sunucudaki cevaplar temel; cihazdaki taslak üstüne biner. Taslak daha yeni
        // olabilir (çevrimdışı cevaplanan sorular), sunucudaki ise cihaz değişse de durur.
        const sunucuCevaplari = durum.cevaplar ?? {};
        gonderilmis.current = sunucuCevaplari;
        setCevaplar((mevcut) => ({ ...sunucuCevaplari, ...taslak, ...mevcut }));
      } catch (h) {
        setCevrimdisi(baglantiSorunuMu(h));
      }
      setHazir(true);
    })();
  }, []);

  const soru = useMemo(() => sonrakiSoru(cevaplar), [cevaplar]);
  const ilerleme = useMemo(() => blokIlerlemesi(cevaplar), [cevaplar]);
  const toplam = useMemo(() => gorunurSorular(cevaplar).length, [cevaplar]);
  const cevaplanan = useMemo(
    () => gorunurSorular(cevaplar).filter((s) => doluMu(cevaplar[s.id])).length,
    [cevaplar],
  );

  const blok = SORU_BANKASI.blocks.find((b) => b.id === ilerleme.blok_id);

  const kaydet = useCallback(
    async (hepsi: Cevaplar, blokId?: string) => {
      await yaz(ANAHTARLAR.degerlendirmeTaslagi, hepsi);

      const fark = yeniCevaplar(hepsi, gonderilmis.current);
      // Blok sonu geri bildirimi fark boş olsa da istenir; o yüzden blokId varsa yine gider.
      if (Object.keys(fark).length === 0 && !blokId) return null;

      try {
        const sonuc = await istek<CevapSonucu>('/v1/degerlendirme/cevap', {
          yontem: 'POST',
          govde: { cevaplar: fark, blok_id: blokId },
        });
        gonderilmis.current = { ...gonderilmis.current, ...fark };
        setCevrimdisi(false);
        return sonuc;
      } catch (h) {
        /**
         * Bağlantı yoksa akış durmaz; cevaplar cihazda bekler ve bunu söylemek doğru.
         *
         * Ama sunucu cevabı REDDETTİYSE aynı cümleyi kurmak yalan olur: o cevap hiçbir
         * zaman gitmeyecek. Daha önce her hata çevrimdışı sayılıyordu ve kullanıcı
         * "cevapların gönderilecek" yazısını okurken hiçbir şey kaydedilmiyordu.
         */
        if (baglantiSorunuMu(h)) {
          setCevrimdisi(true);
          return null;
        }

        setCevrimdisi(false);
        setHata(h instanceof Error ? h.message : m.gecersizCevap);
        return null;
      }
    },
    [m.gecersizCevap],
  );

  const ilerle = useCallback(async () => {
    if (!soru) return;

    const deger = cevaplar[soru.id];
    const dogrulama = cevabiDogrula(soru, deger as never);
    if (!dogrulama.gecerli) {
      setHata(dogrulama.mesaj ?? m.gecersizCevap);
      return;
    }

    setHata(null);
    setKaydediliyor(true);

    const oncekiBlok = soru.blok_id;
    const sonrasi = sonrakiSoru(cevaplar);
    const blokBitti = !sonrasi || sonrasi.blok_id !== oncekiBlok;

    const sonuc = await kaydet(cevaplar, blokBitti ? oncekiBlok : undefined);
    setKaydediliyor(false);

    // Güvenlik kapıları her kayıtta yeniden değerlendirilir; atlanamaz.
    const kapi = sonuc?.kapi_durumu.kapilar[0];
    if (kapi && (kapi.eylem === 'kayit_reddet' || kapi.eylem === 'program_uretme')) {
      router.push({ pathname: '/degerlendirme/kapi', params: { tip: kapi.tip } });
      return;
    }

    if (blokBitti && sonuc?.blok_geri_bildirimi) {
      router.push({
        pathname: '/degerlendirme/blok-sonu',
        params: { blok: sonuc.blok_geri_bildirimi.blok_id, metin: sonuc.blok_geri_bildirimi.metin },
      });
      return;
    }

    if (!sonrasi) {
      try {
        await istek('/v1/degerlendirme/tamamla', { yontem: 'POST', govde: {} });
      } catch {
        // Tamamlanmadan ilerlemek, profilsiz bir kullanıcı yaratır: program üretilemez.
        setHata(islemHatasiMetni('degerlendirme_tamamla', dil));
        return;
      }
      router.replace('/fotograf/gizlilik');
    }
  }, [cevaplar, dil, kaydet, m.gecersizCevap, soru]);

  const atla = useCallback(() => {
    if (!soru || soru.required) return;
    setCevaplar((mevcut) => ({ ...mevcut, [soru.id]: ATLANDI }));
    setHata(null);
  }, [soru]);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.kaldiginYer} />
      </View>
    );
  }

  if (!soru) {
    return (
      <Ekran>
        <Yazi tur="baslik1">{m.tamamBaslik}</Yazi>
        <Yazi renk="metinYumusak">{m.tamamGovde}</Yazi>
        <Dugme baslik={m.devamEtDugmesi} onPress={() => router.replace('/fotograf/gizlilik')} />
      </Ekran>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
        <View
          style={{
            // Başlık gizli; durum çubuğunun altına girmemek için kenar boşluğu burada.
            paddingTop: tema.bosluk.lg + kenar.top,
            paddingHorizontal: tema.bosluk.lg,
            paddingBottom: tema.bosluk.md,
            gap: tema.bosluk.sm,
            backgroundColor: tema.renk.zemin,
          }}
        >
          <Satir dagit="space-between">
            <Yazi tur="etiket" renk="aksan">
              {blok ? buyukHarf(blok.title, dil) : ''}
            </Yazi>
            <Yazi tur="etiket" renk="metinSilik">
              {cevaplanan} / {toplam}
            </Yazi>
          </Satir>
          <IlerlemeCubugu yuzde={ilerleme.yuzde} />
          {cevrimdisi ? (
            <Yazi tur="etiket" renk="uyari">
              {m.cevrimdisiNotu}
            </Yazi>
          ) : null}
        </View>

        <Ekran>
          <SoruAlani
            soru={soru}
            deger={cevaplar[soru.id] === ATLANDI ? null : cevaplar[soru.id]}
            onDegisim={(deger) => {
              setHata(null);
              setCevaplar((mevcut) => ({ ...mevcut, [soru.id]: deger as never }));
            }}
            {...(hata ? { hata } : {})}
          />

          <View style={{ gap: tema.bosluk.sm, marginTop: tema.bosluk.lg }}>
            <Dugme
              baslik={m.devamEtDugmesi}
              onPress={() => void ilerle()}
              yukleniyor={kaydediliyor}
              pasif={soru.required === true && !doluMu(cevaplar[soru.id])}
            />
            {soru.required ? null : (
              <Pressable
                onPress={atla}
                accessibilityRole="button"
                style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
              >
                <Yazi renk="metinSilik" hizala="center">
                  {m.soruyuAtla}
                </Yazi>
              </Pressable>
            )}
          </View>
        </Ekran>
      </View>
    </>
  );
}

function doluMu(deger: unknown): boolean {
  if (deger === undefined || deger === null || deger === '') return false;
  if (Array.isArray(deger)) return deger.length > 0;
  if (typeof deger === 'object') return Object.keys(deger).length > 0;
  return true;
}
