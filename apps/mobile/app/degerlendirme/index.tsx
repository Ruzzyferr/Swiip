import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  ATLANDI,
  sonrakiSoru,
  type BlokIlerlemesi,
  type Cevaplar,
  type GorunurSoru,
} from '@swiip/core';
import { SORU_BANKASI } from '@swiip/shared';
import { Dugme, Ekran, Yazi, Yukleniyor } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { SoruAlani } from '../../src/degerlendirme/SoruAlani';
import {
  atlananlariIsaretle,
  blokBolumleri,
  blokHatalari,
  blokSorulari,
  cevaplandiMi,
  gosterilecekBlokId,
  istegeBaglilariAtla,
  zorunlulariBitti,
  zorunluSayisi,
} from '../../src/degerlendirme/akis';
import { Cetvel } from '../../src/tasarim/Cetvel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { istek } from '../../src/veri/api';
import { baglantiSorunuMu, yeniCevaplar } from '@swiip/shared';
import { islemHatasiMetni } from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';
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
  ilerleme: BlokIlerlemesi;
  sonraki_soru: GorunurSoru | null;
}

interface CevapSonucu {
  ilerleme: BlokIlerlemesi;
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

  /**
   * Ekranda duran soru.
   *
   * Bir zamanlar gösterilen soru doğrudan `sonrakiSoru(cevaplar)` idi ve kullanıcı bir
   * şık seçer seçmez ekran kendiliğinden ilerliyordu. "Devam et" cevabı sunucuya
   * kaydeden tek yol; ekran ondan önce ilerlediği için düğmeye hiç sıra gelmiyordu.
   * Hiçbir cevap sunucuya yazılmıyor, blok sonu geri bildirimi hiç görünmüyor ve
   * güvenlik kapıları sunucuda hiç değerlendirilmiyordu — hepsi sessizce.
   */
  const [aktifBlokId, setAktifBlokId] = useState<string | undefined>(undefined);
  /** Soru kimliği → hata metni. Blok görünümünde her soru kendi hatasını taşır. */
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

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
        setCevaplar((mevcut) => {
          const birlesik = { ...sunucuCevaplari, ...taslak, ...mevcut };
          // Açılışta da soru sabitleniyor; yoksa ilk cevap ekranı kendiliğinden atlatır.
          setAktifBlokId(gosterilecekBlokId(birlesik, undefined));
          return birlesik;
        });
      } catch (h) {
        setCevrimdisi(baglantiSorunuMu(h));
        // Sunucuya ulaşılamasa da soru sabitlenmeli; çevrimdışı akış da aynı kuralı izler.
        setAktifBlokId((mevcut) => mevcut ?? gosterilecekBlokId(taslak ?? {}, undefined));
      }
      setHazir(true);
    })();
  }, []);

  const blokId = useMemo(() => gosterilecekBlokId(cevaplar, aktifBlokId), [cevaplar, aktifBlokId]);
  const sorular = useMemo(() => (blokId ? blokSorulari(cevaplar, blokId) : []), [cevaplar, blokId]);
  const bolumler = useMemo(() => blokBolumleri(cevaplar), [cevaplar]);
  const zorunlu = useMemo(() => (blokId ? zorunluSayisi(cevaplar, blokId) : 0), [cevaplar, blokId]);
  /**
   * "İsteğe bağlıları sonra cevaplayacağım" satırının yeri.
   *
   * Bloğun zorunluları bitmeden çıkmıyor — daha erken çıksa zorunlu soruyu da
   * atlatıyormuş gibi okunurdu. Yeri de rastgele değil: cevapsız kalan İLK isteğe
   * bağlı sorunun hemen üstü, yani kullanıcının "bunların hepsini mi dolduracağım"
   * dediği an. Sayfanın dibindeki bir düğmeyi o an göremiyor.
   */
  const atlamaSirasi = useMemo(() => {
    if (!blokId || !zorunlulariBitti(cevaplar, blokId)) return -1;
    return sorular.findIndex((soru) => !soru.required && !cevaplandiMi(cevaplar, soru));
  }, [blokId, cevaplar, sorular]);
  const bolumSirasi = useMemo(
    () => Math.max(1, bolumler.findIndex((b) => b.id === blokId) + 1),
    [bolumler, blokId],
  );
  // Baslik gosterilen blogun adini yaziyor; ilerleme motorunun sectigi blok degil.
  const blok = SORU_BANKASI.blocks.find((b) => b.id === blokId);

  /**
   * Kayıt sonucu üç ayrı durum: gönderildi, bağlantı yok, sunucu reddetti.
   *
   * Üçü de `null` dönüyordu ve çağıran taraf ayırt edemiyordu. Sonucu: sunucu cevabı
   * reddettiğinde akış hiç durmadan devam ediyor, kullanıcı değerlendirmeyi bitiriyor
   * ve sunucudaki kayıt eksik kalıyordu.
   */
  type KayitSonucu =
    | { durum: 'gonderildi'; cevap: CevapSonucu }
    | { durum: 'bos' }
    | { durum: 'cevrimdisi' }
    | { durum: 'reddedildi' };

  const kaydet = useCallback(
    async (hepsi: Cevaplar, blokId?: string): Promise<KayitSonucu> => {
      await yaz(ANAHTARLAR.degerlendirmeTaslagi, hepsi);

      const fark = yeniCevaplar(hepsi, gonderilmis.current);
      // Blok sonu geri bildirimi fark boş olsa da istenir; o yüzden blokId varsa yine gider.
      if (Object.keys(fark).length === 0 && !blokId) return { durum: 'bos' };

      try {
        const cevap = await istek<CevapSonucu>('/v1/degerlendirme/cevap', {
          yontem: 'POST',
          govde: { cevaplar: fark, blok_id: blokId },
        });
        gonderilmis.current = { ...gonderilmis.current, ...fark };
        setCevrimdisi(false);
        return { durum: 'gonderildi', cevap };
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
          return { durum: 'cevrimdisi' };
        }

        setCevrimdisi(false);
        setHata(h instanceof Error ? h.message : m.gecersizCevap);
        return { durum: 'reddedildi' };
      }
    },
    [m.gecersizCevap],
  );

  /**
   * Blogu kaydeder ve bir sonrakine gecer.
   *
   * Bu, cevaplarin sunucuya yazildigi TEK yer. Bir zamanlar ekran cevap verilir
   * verilmez kendiliginde ilerledigi icin buraya hic gelinmiyordu.
   */
  const ilerle = useCallback(
    async (hepsiniAtla = false) => {
      if (!blokId) return;

      /**
       * Zorunlu soru atlanmıyor — "hepsini atla" da atlatmıyor.
       *
       * O düğme zaten yalnızca bloğun zorunluları bitince çıkıyor; yine de kapı
       * burada. Atlama yolunun doğrulamayı baypas etmesi, dört güvenlik kapısının
       * (18 yaş, gebelik, kardiyak, yeme bozukluğu) tek dokunuşla aşılması demekti.
       */
      const hatalar = blokHatalari(cevaplar, blokId);
      if (Object.keys(hatalar).length > 0) {
        setAlanHatalari(hatalar);
        /**
         * Sebep düğmenin YANINDA da yazılır.
         *
         * Hata yalnızca ilgili sorunun altına konuyordu. Beslenme bloğunda 25 soru var:
         * boş kalan zorunlu soru ekranın dışında kalınca "Devam et" hiçbir şey yapmıyor
         * gibi görünüyor ve kullanıcı bloğun tamamını cevaplamaya çalışıyordu.
         */
        setHata(m.eksikZorunlu(Object.keys(hatalar).length));
        return;
      }

      setAlanHatalari({});
      setHata(null);
      setKaydediliyor(true);

      // Bos birakilan istege bagli sorular atlanmis sayilir; her biri icin ayri bir
      // "Atla" dokunusu yuzden fazla gereksiz dokunus demekti. `hepsiniAtla` ayni
      // kurali butun bloklara birden uyguluyor.
      const tamamlanmis = hepsiniAtla
        ? istegeBaglilariAtla(cevaplar)
        : atlananlariIsaretle(cevaplar, blokId);
      setCevaplar(tamamlanmis);

      const kayit = await kaydet(tamamlanmis, blokId);
      setKaydediliyor(false);

      /**
       * Sunucu reddettiyse ilerlemiyoruz.
       *
       * Eskiden hata gosteriliyor ama akis devam ediyordu: kullanici degerlendirmeyi
       * bitirip programa geciyor, sunucudaki kayit ise eksik kaliyordu.
       */
      if (kayit.durum === 'reddedildi') return;

      const sonuc = kayit.durum === 'gonderildi' ? kayit.cevap : null;

      // Guvenlik kapilari her kayitta yeniden degerlendirilir; atlanamaz.
      const kapi = sonuc?.kapi_durumu.kapilar[0];
      if (kapi && (kapi.eylem === 'kayit_reddet' || kapi.eylem === 'program_uretme')) {
        router.push({ pathname: '/degerlendirme/kapi', params: { tip: kapi.tip } });
        return;
      }

      const sonrasi = sonrakiSoru(tamamlanmis);
      setAktifBlokId(sonrasi?.blok_id);

      if (sonuc?.blok_geri_bildirimi) {
        router.push({
          pathname: '/degerlendirme/blok-sonu',
          params: {
            blok: sonuc.blok_geri_bildirimi.blok_id,
            metin: sonuc.blok_geri_bildirimi.metin,
          },
        });
        return;
      }

      if (!sonrasi) {
        try {
          await istek('/v1/degerlendirme/tamamla', { yontem: 'POST', govde: {} });
        } catch {
          // Tamamlanmadan ilerlemek, profilsiz bir kullanici yaratir: program uretilemez.
          setHata(islemHatasiMetni('degerlendirme_tamamla', dil));
          return;
        }
        router.replace('/fotograf/gizlilik');
      }
    },
    [blokId, cevaplar, dil, kaydet, m.eksikZorunlu],
  );

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.kaldiginYer} />
      </View>
    );
  }

  if (!blokId) {
    /**
     * `ustGuvenliAlan` bu dalda da gerekli.
     *
     * Ekranın başlığı gizli; üst boşluğu ana dalda dış kap veriyor ama bu erken
     * dönüşte kap yok ve "Değerlendirme tamam" başlığı durum çubuğunun hizasına
     * giriyordu. `guvenliAlan.test.ts` dosya düzeyinde baktığı için yakalayamıyor:
     * dosyada `useSafeAreaInsets()` geçiyor, ama bu dalda kullanılmıyordu.
     */
    return (
      <Ekran ustGuvenliAlan>
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
            // Baslik gizli; durum cubugunun altina girmemek icin kenar boslugu burada.
            paddingTop: tema.bosluk.lg + kenar.top,
            paddingHorizontal: tema.bosluk.lg,
            paddingBottom: tema.bosluk.md,
            gap: tema.bosluk.sm,
            backgroundColor: tema.renk.zemin,
          }}
        >
          {/*
            Jenerik dolan cubugun yerine taksimat cetveli.
            O cubuk iki soruyu da cevaplamiyordu: kac bolum var, ben hangisindeyim.
            Cetvel ikisini de gosteriyor ve tamamlanmis bloga donmeyi sagliyor —
            dokunulamayan bir cetvel yalnizca cizilmis bir cetveldir.
          */}
          <Cetvel bolumler={bolumler} aktifId={blokId} onBolumSec={setAktifBlokId} />
          {cevrimdisi ? (
            <Yazi tur="etiket" renk="uyari">
              {m.cevrimdisiNotu}
            </Yazi>
          ) : null}
        </View>

        <Ekran>
          <View style={{ gap: tema.bosluk.xxs }}>
            <Yazi tur="baslik1">{blok ? blok.title : ''}</Yazi>
            {/*
              Soru sayısı yerine bölüm sayısı.
              Görünür soru sayısı dallanmayla değişiyor ve sayaç "0/123" iken bir sonraki
              cevapta "2/124" oluyordu; ilerlediğini görmek isteyen kullanıcı paydanın
              da kaydığını görüyordu. Bölüm sayısı sabit ve cetvelle aynı şeyi söylüyor.
            */}
            <Yazi tur="etiket" renk="metinSilik">
              {m.bolumSayaci(bolumSirasi, bolumler.length)}
            </Yazi>
            {/*
              Hangi soruların zorunlu olduğunu söyleyen tek satır.
              136 sorunun 26'sı zorunlu, gerisi boş bırakılınca atlanmış sayılıyor —
              ama bunu söyleyen hiçbir şey yoktu ve kullanıcı hepsini dolduruyordu.
            */}
            <Yazi tur="kucuk" renk="metinSilik">
              {m.zorunluNotu(zorunlu)}
            </Yazi>
          </View>

          {sorular.map((soru, sira) => (
            <View key={soru.id}>
              {sira === atlamaSirasi ? (
                <View
                  style={{
                    paddingTop: sira === 0 ? 0 : tema.bosluk.lg,
                    paddingBottom: tema.bosluk.lg,
                    borderTopWidth: sira === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: tema.renk.cizgi,
                    gap: tema.bosluk.xs,
                  }}
                >
                  <Dugme
                    baslik={m.sonraCevaplarim}
                    tur="sessiz"
                    onPress={() => void ilerle(true)}
                    yukleniyor={kaydediliyor}
                  />
                  <Yazi tur="kucuk" renk="metinSilik">
                    {m.sonraCevaplarimNotu}
                  </Yazi>
                </View>
              ) : null}
              <View
                style={{
                  paddingTop: sira === 0 || sira === atlamaSirasi ? 0 : tema.bosluk.lg,
                  borderTopWidth:
                    sira === 0 || sira === atlamaSirasi ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: tema.renk.cizgi,
                }}
              >
                <SoruAlani
                  soru={soru}
                  deger={cevaplar[soru.id] === ATLANDI ? null : cevaplar[soru.id]}
                  onDegisim={(deger) => {
                    setAlanHatalari((mevcut) => {
                      if (!mevcut[soru.id]) return mevcut;
                      const { [soru.id]: _cikar, ...kalan } = mevcut;
                      return kalan;
                    });
                    setCevaplar((mevcut) => ({ ...mevcut, [soru.id]: deger as never }));
                  }}
                  {...(alanHatalari[soru.id] ? { hata: alanHatalari[soru.id]! } : {})}
                />
              </View>
            </View>
          ))}

          {hata ? (
            <Yazi tur="kucuk" renk="tehlike">
              {hata}
            </Yazi>
          ) : null}

          <View style={{ marginTop: tema.bosluk.lg }}>
            <Dugme
              baslik={m.devamEtDugmesi}
              onPress={() => void ilerle(false)}
              yukleniyor={kaydediliyor}
            />
          </View>
        </Ekran>
      </View>
    </>
  );
}
