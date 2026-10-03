import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
import { ApiHatasi, istek } from '../../src/veri/api';
import { uygunKareBoyutu } from '../../src/veri/kameraBoyutu';
import { besinToplami } from '@swiip/core';
import { besinAdi, buyukHarf, islemHatasiMetni, ogunTahmini, yerelGun } from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';

/**
 * Fotoğraftan yemek tanıma ve doğrulama (F7.5).
 *
 * Akışın kalbi DOĞRULAMA ekranı: model ne yendiğini ve ne kadar yendiğini tahmin eder,
 * kullanıcı düzeltir, ancak onaylandıktan sonra kaydedilir. Besin değeri her zaman
 * veritabanından gelir — model kalori söyleyemez.
 *
 * Kota adaleti burada görünür kılınıyor: önbellekten gelen ve yanlış tanıma sonrası
 * tekrar denenen tanımalar "kotandan düşmedi" etiketiyle işaretlenir.
 */

interface Bilesim {
  kalori: number;
  protein_g: number;
  yag_g: number;
  karbonhidrat_g: number;
  lif_g: number;
}

interface TaninanKalem {
  ad: string;
  miktar: number;
  gram: number;
  eslesti: boolean;
  /** `per_100g` eski sunucuda yok; o zaman toplam sunucunun ilk cevabından okunur. */
  /** `ad` Türkçe veri adı (eşleme bununla); `ad_en` İngilizce arayüzde gösterilir. */
  besin: { id: string; ad: string; ad_en?: string | null; per_100g?: Bilesim } | null;
  skor: number | null;
}

interface TanimaCevabi {
  photo_hash: string;
  kaynak: 'onbellek' | 'model';
  kalemler: TaninanKalem[];
  toplam: { kalori: number; protein_g: number; yag_g: number; karbonhidrat_g: number };
  kota: { dusuldu: boolean; kalan: number; toplam: number; not: string | null };
  onay_bekliyor: boolean;
  model_uyarisi?: string;
}

interface BesinSonucu {
  id: string;
  name_tr: string;
  name_en?: string | null;
  per_100g: Bilesim;
}

export default function Tanima() {
  const tema = useTema();
  const m = useMetinler().tanima;
  const genel = useMetinler().genel;
  const dil = useDil();

  const [sonuc, setSonuc] = useState<TanimaCevabi | null>(null);
  const [kalemler, setKalemler] = useState<TaninanKalem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [tekrarDeneme, setTekrarDeneme] = useState(false);
  const [duzeltilen, setDuzeltilen] = useState<number | null>(null);
  const [onaylaniyor, setOnaylaniyor] = useState(false);

  const kamera = useRef<CameraView>(null);
  const [izin, izinIste] = useCameraPermissions();
  /*
    İzin henüz SORULMAMIŞSA ekran açılır açılmaz soruluyor. Kütüphane sorulmamış izni de
    `granted: false` diye bildiriyor ve ekran, kullanıcıya hiçbir şey sorulmadan
    "Kamera izni verilmedi" yazıyordu. Kullanıcı bu ekrana fotoğraf çekmek için geldi;
    niyet belli. "Verilmedi" yalnızca gerçekten reddedildiğinde (`denied`) çıkıyor.
  */
  useEffect(() => {
    if (izin?.status === 'undetermined' && izin.canAskAgain) void izinIste();
  }, [izin?.status, izin?.canAskAgain, izinIste]);
  const [cekiliyor, setCekiliyor] = useState(false);
  const [kareBoyutu, setKareBoyutu] = useState<string | undefined>(undefined);

  /**
   * Kamera modülü cihazda bağlanınca base64 buradan gelir. Fotoğraf yalnızca bu
   * fonksiyonun ömrü boyunca bellekte kalır; hiçbir yere yazılmaz.
   */
  const tani = async (fotograf: string) => {
    setYukleniyor(true);
    setHata(null);
    try {
      const cevap = await istek<TanimaCevabi>('/v1/beslenme/tani', {
        yontem: 'POST',
        govde: { fotograf, tekrar_deneme: tekrarDeneme },
      });
      setSonuc(cevap);
      setKalemler(cevap.kalemler);
      setTekrarDeneme(false);
    } catch (h) {
      if (h instanceof ApiHatasi && h.durum === 402) {
        router.push('/odeme/paywall');
        return;
      }
      setHata(h instanceof ApiHatasi ? h.mesaj : m.hata);
      // Başarısız tanıma sonrası tekrar deneme kotadan düşmez.
      setTekrarDeneme(true);
    } finally {
      setYukleniyor(false);
    }
  };

  /**
   * Kareyi çeker ve tanımaya gönderir.
   *
   * Burada bir zamanlar `void tani('m2f-ornek-fotograf-' + 'x'.repeat(400));` yazıyordu:
   * "Fotoğraf çek" düğmesi kamerayı **hiç açmıyordu.** O dolgu dize sunucunun
   * `z.string().min(100)` kontrolünü geçtiği için istek kabul ediliyor, parmak izi
   * alınıyor ve görsel modele gönderiliyordu. Yani Pro'yu Temel'den ayıran tek özellik,
   * kullanıcının aylık kotasını ve gerçek AI parasını harcayıp garantili boş sonuç
   * döndürüyordu.
   *
   * Vücut çekimindeki (`app/fotograf/cekim.tsx`) akışın aynısı: `base64` bellekte kalır,
   * istekle gider, diske hiç yazılmaz.
   */
  const kareCek = async () => {
    if (!kamera.current || cekiliyor) return;

    setCekiliyor(true);
    setHata(null);
    try {
      const kare = await kamera.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (!kare?.base64) {
        setHata(m.kareAlinamadi);
        return;
      }
      await tani(kare.base64);
    } catch {
      setHata(m.kareAlinamadi);
    } finally {
      setCekiliyor(false);
    }
  };

  const onayla = async () => {
    // Çift dokunuş aynı öğünü iki kez yazıyordu.
    if (!sonuc || onaylaniyor) return;
    const eslesenler = kalemler.filter((k) => k.eslesti && k.besin && k.gram > 0);

    setHata(null);
    setOnaylaniyor(true);
    try {
      await istek('/v1/beslenme/tani/onayla', {
        yontem: 'POST',
        govde: {
          photo_hash: sonuc.photo_hash,
          kalemler: eslesenler.map((k) => ({
            ad: k.ad,
            food_id: k.besin!.id,
            gram: k.gram,
            miktar: k.miktar,
          })),
          /*
            Gün ve öğün CİHAZDAN. Gönderilmediğinde sunucu günü kendi saatinden
            seçiyor ve kayıt "Öğün seçilmemiş" altına düşüyordu.
          */
          gun: yerelGun(),
          ogun: ogunTahmini(new Date()),
        },
      });
    } catch {
      // Sessiz başarısızlık, kullanıcının öğünü kaydettiğini sanmasına yol açar.
      setHata(islemHatasiMetni('tanima_onayla', dil));
      setOnaylaniyor(false);
      return;
    }

    router.dismissTo('/(sekme)/beslenme');
  };

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.yukleniyor} />
      </View>
    );
  }

  // --- Doğrulama ekranı ---
  if (sonuc) {
    /*
      Toplam DÜZENLEMEYLE birlikte değişiyor.

      Ekran sunucunun ilk cevabındaki toplamı gösteriyordu: gramı değiştirmek, yemeği
      değiştirmek ya da "Tabakta yoktu" demek sayıyı oynatmıyordu ve kullanıcı
      gördüğünden farklı bir öğünü onaylıyordu. Formül sunucununkiyle AYNI fonksiyon;
      kaydedilen değeri yine sunucu veritabanından hesaplıyor. Adı da yanlıştı:
      `toplamKalori` aslında gram toplamıydı.
    */
    const eslesen = kalemler.filter((k) => k.eslesti && k.besin);
    const bilesimTam = eslesen.every((k) => k.besin?.per_100g);
    const toplam = bilesimTam
      ? besinToplami(
          eslesen.map((k) => ({
            ad: k.ad,
            miktar: k.miktar,
            gram: k.gram,
            eslesti: true,
            besin: {
              id: k.besin!.id,
              ad: k.besin!.ad,
              per_100g: k.besin!.per_100g!,
              porsiyonlar: [],
            },
          })),
        )
      : sonuc.toplam;
    const toplamGram = eslesen.reduce((t, k) => t + k.gram, 0);
    const kotaNotu = sonuc.kota.dusuldu
      ? null
      : sonuc.kaynak === 'onbellek'
        ? m.kotaDusmediOnbellek
        : m.kotaDusmediTekrar;

    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: m.dogrulaSayfaBasligi }} />
        <Ekran>
          <Satir dagit="space-between">
            <Yazi tur="baslik1">{m.dogrulaBaslik}</Yazi>
            <Etiket
              metin={sonuc.kaynak === 'onbellek' ? m.onbellektenEtiketi : m.tanindiEtiketi}
              tur={sonuc.kaynak === 'onbellek' ? 'aksan' : 'notr'}
            />
          </Satir>

          <Yazi renk="metinYumusak">{m.dogrulaGiris}</Yazi>

          {/* Kota notu sözlükten: sunucunun Türkçe `kota.not` alanı her dilde Türkçeydi. */}
          {kotaNotu ? <Uyari govde={kotaNotu} /> : null}
          {sonuc.model_uyarisi ? <Uyari tur="uyari" govde={sonuc.model_uyarisi} /> : null}

          {kalemler.map((kalem, i) => (
            <Kart key={`${kalem.ad}-${i}`} vurgulu={!kalem.eslesti}>
              <Satir dagit="space-between" hizala="flex-start">
                <View style={{ flex: 1, gap: 2 }}>
                  <Yazi tur="baslik3">
                    {kalem.besin
                      ? besinAdi({ name_tr: kalem.besin.ad, name_en: kalem.besin.ad_en }, dil)
                      : kalem.ad}
                  </Yazi>
                  {kalem.besin && kalem.besin.ad !== kalem.ad ? (
                    <Yazi tur="etiket" renk="metinSilik">
                      {m.fotograftaEki(buyukHarf(kalem.ad, dil))}
                    </Yazi>
                  ) : null}
                </View>
                {kalem.eslesti ? (
                  <Sayi tur="baslik3" renk="aksan">
                    {kalem.gram} g
                  </Sayi>
                ) : (
                  <Etiket metin={m.eslesmediEtiketi} tur="uyari" />
                )}
              </Satir>

              {!kalem.eslesti ? (
                <Yazi tur="kucuk" renk="metinYumusak">
                  {m.eslesmediNotu}
                </Yazi>
              ) : null}

              <Satir arasi="sm">
                <View style={{ flex: 1 }}>
                  <Yazi tur="etiket" renk="metinSilik">
                    {m.miktarGram}
                  </Yazi>
                  <TextInput
                    defaultValue={String(kalem.gram)}
                    onChangeText={(v) => {
                      const gram = Number(v.replace(',', '.'));
                      if (!Number.isFinite(gram)) return;
                      setKalemler((m) =>
                        m.map((k, j) => (j === i ? { ...k, gram: Math.max(0, gram) } : k)),
                      );
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel={m.miktarErisim(kalem.ad)}
                    style={{
                      minHeight: tema.dokunmaHedefi,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: tema.renk.kenar,
                      borderRadius: tema.yaricap.md,
                      paddingHorizontal: tema.bosluk.md,
                      fontSize: 18,
                      fontFamily: tema.tipografi.aileler.sayisal,
                      fontVariant: ['tabular-nums'],
                      color: tema.renk.metin,
                      backgroundColor: tema.renk.zemin,
                    }}
                  />
                </View>
                <Pressable
                  onPress={() => setDuzeltilen(duzeltilen === i ? null : i)}
                  accessibilityRole="button"
                  style={{
                    minHeight: tema.dokunmaHedefi,
                    justifyContent: 'flex-end',
                    paddingBottom: tema.bosluk.sm,
                  }}
                >
                  <Yazi tur="kucuk" renk="aksan">
                    {duzeltilen === i ? m.kapat : m.yemegiDegistir}
                  </Yazi>
                </Pressable>
              </Satir>

              {duzeltilen === i ? (
                <BesinDegistir
                  onSec={(besin) => {
                    setKalemler((m) =>
                      m.map((k, j) =>
                        j === i
                          ? {
                              ...k,
                              besin: {
                                id: besin.id,
                                ad: besin.name_tr,
                                ad_en: besin.name_en ?? null,
                                per_100g: besin.per_100g,
                              },
                              eslesti: true,
                            }
                          : k,
                      ),
                    );
                    setDuzeltilen(null);
                  }}
                />
              ) : null}

              <Pressable
                onPress={() => setKalemler((m) => m.filter((_, j) => j !== i))}
                accessibilityRole="button"
                style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
              >
                <Yazi tur="kucuk" renk="tehlike">
                  {m.tabaktaYoktu}
                </Yazi>
              </Pressable>
            </Kart>
          ))}

          {kalemler.length === 0 ? (
            <BosDurum baslik={m.kalemKalmadiBaslik} govde={m.kalemKalmadiGovde} />
          ) : null}

          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {genel.toplamBasligi}
            </Yazi>
            <Satir arasi="xs" hizala="baseline">
              <Sayi tur="dev" renk="aksan">
                {toplam.kalori}
              </Sayi>
              <Yazi tur="kucuk" renk="metinSilik">
                kcal · {toplamGram} g
              </Yazi>
            </Satir>
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.makroOzeti(
                Math.round(toplam.protein_g),
                Math.round(toplam.karbonhidrat_g),
                Math.round(toplam.yag_g),
              )}
            </Yazi>
            <Yazi tur="etiket" renk="metinSilik">
              {m.kaynakEtiketi}
            </Yazi>
          </Kart>

          <Dugme
            baslik={m.onayla}
            onPress={() => void onayla()}
            yukleniyor={onaylaniyor}
            pasif={eslesen.filter((k) => k.gram > 0).length === 0}
          />
          <Dugme
            baslik={m.tekrarDene}
            tur="ikincil"
            onPress={() => {
              setSonuc(null);
              setTekrarDeneme(true);
            }}
          />
          <Yazi tur="etiket" renk="metinSilik" hizala="center">
            {m.kotaNotu}
          </Yazi>
        </Ekran>
      </>
    );
  }

  // --- Çekim ekranı ---
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.cekimSayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.cekimBaslik}</Yazi>

        {/*
          Kamera BAŞLIĞIN hemen altında, deklanşör kameranın hemen altında.

          İpuçları kartı ve giriş paragrafı kameranın üstündeydi ve deklanşör kameranın
          altında, ekranın dışında kalıyordu: tabağı kadrajlayan kullanıcı düğmeyi
          görmüyordu. Kadraj kare (3:4 değil): tabak için yeterli ve kamera ile düğme
          bir telefon ekranına birlikte sığıyor. Kutu izin yokken de aynı boyutta.
        */}
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            borderRadius: tema.yaricap.md,
            overflow: 'hidden',
            backgroundColor: tema.renk.yuzey,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tema.renk.cizgi,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {izin?.granted ? (
            <CameraView
              ref={kamera}
              /* Tam çözünürlüklü kare sunucunun 2 MB sınırını aşabiliyor (`kameraBoyutu.ts`). */
              pictureSize={kareBoyutu}
              onCameraReady={() => {
                void kamera.current
                  ?.getAvailablePictureSizesAsync()
                  .then((boyutlar) => setKareBoyutu(uygunKareBoyutu(boyutlar)))
                  .catch(() => null);
              }}
              style={StyleSheet.absoluteFill}
            />
          ) : izin?.status === 'denied' ? (
            <View style={{ gap: tema.bosluk.sm, padding: tema.bosluk.lg, width: '100%' }}>
              <Yazi tur="kucuk" renk="metinYumusak" hizala="center">
                {m.kameraIzniYok}
              </Yazi>
              {izin.canAskAgain ? (
                <Dugme baslik={m.kameraIzniVer} tur="ikincil" onPress={() => void izinIste()} />
              ) : null}
            </View>
          ) : null}
        </View>

        <Dugme
          baslik={cekiliyor ? m.cekiliyor : m.fotografCek}
          pasif={cekiliyor || !izin?.granted}
          onPress={() => {
            if (!izin?.granted) {
              void izinIste();
              return;
            }
            void kareCek();
          }}
        />

        {tekrarDeneme ? <Uyari govde={m.tekrarDenemeNotu} /> : null}
        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <Dugme
          baslik={m.elleAraEkle}
          tur="sessiz"
          onPress={() => router.dismissTo('/(sekme)/beslenme')}
        />

        <Yazi renk="metinYumusak">{m.cekimGiris}</Yazi>
        <Kart>
          {m.ipuclari.map((ipucu: string) => (
            <Ipucu key={ipucu} metin={ipucu} />
          ))}
        </Kart>

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.silmeNotu}
        </Yazi>
      </Ekran>
    </>
  );
}

function Ipucu({ metin }: { metin: string }) {
  const tema = useTema();
  return (
    <Satir arasi="sm" hizala="flex-start">
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: tema.renk.aksan,
          marginTop: 8,
        }}
      />
      <Yazi tur="kucuk" renk="metinYumusak" stil={{ flex: 1 }}>
        {metin}
      </Yazi>
    </Satir>
  );
}

function BesinDegistir({ onSec }: { onSec: (besin: BesinSonucu) => void }) {
  const tema = useTema();
  const m = useMetinler().tanima;
  const dil = useDil();
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<BesinSonucu[]>([]);

  /**
   * Arama GECİKMELİ.
   *
   * Her tuş vuruşunda bir ağ isteği gidiyordu: "tavuk göğsü" yazmak on iki istek eder
   * ve cevaplar sırasız döndüğü için liste titriyor, bazen eski sorgunun sonucu
   * ekranda kalıyordu. Beslenme sekmesindeki aynı arama zaten 250 ms gecikmeyle
   * çalışıyor (`(sekme)/beslenme.tsx`); iki kopya iki farklı davranış demekti.
   */
  useEffect(() => {
    if (sorgu.length < 2) {
      setSonuclar([]);
      return;
    }
    // Eski sorgunun geç gelen cevabı yenisinin üstüne yazılmasın.
    let gecerli = true;
    const zamanlayici = setTimeout(() => {
      void istek<{ sonuclar: BesinSonucu[] }>(
        `/v1/beslenme/besin/ara?q=${encodeURIComponent(sorgu)}`,
      )
        .then((c) => {
          if (gecerli) setSonuclar(c.sonuclar);
        })
        .catch(() => {
          if (gecerli) setSonuclar([]);
        });
    }, 250);
    return () => {
      gecerli = false;
      clearTimeout(zamanlayici);
    };
  }, [sorgu]);

  return (
    <View style={{ gap: tema.bosluk.sm }}>
      <TextInput
        value={sorgu}
        onChangeText={setSorgu}
        placeholder={m.dogruYemegiAra}
        placeholderTextColor={tema.renk.metinSilik}
        accessibilityLabel={m.dogruYemegiAra}
        style={{
          minHeight: tema.dokunmaHedefi,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tema.renk.kenar,
          borderRadius: tema.yaricap.md,
          paddingHorizontal: tema.bosluk.md,
          fontSize: 16,
          fontFamily: tema.tipografi.aileler.govde,
          color: tema.renk.metin,
          backgroundColor: tema.renk.zemin,
        }}
      />
      {sonuclar.slice(0, 6).map((besin) => (
        <Pressable
          key={besin.id}
          onPress={() => onSec(besin)}
          accessibilityRole="button"
          style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
        >
          <Satir dagit="space-between">
            <Yazi tur="kucuk" stil={{ flex: 1 }}>
              {besinAdi(besin, dil)}
            </Yazi>
            <Sayi tur="etiket" renk="metinSilik">
              {besin.per_100g.kalori} kcal/100g
            </Sayi>
          </Satir>
        </Pressable>
      ))}
    </View>
  );
}
