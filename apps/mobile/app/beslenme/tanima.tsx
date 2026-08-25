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
import { islemHatasiMetni } from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { buyukHarf } from '@swiip/shared';

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

interface TaninanKalem {
  ad: string;
  miktar: number;
  gram: number;
  eslesti: boolean;
  besin: { id: string; ad: string } | null;
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
  per_100g: { kalori: number };
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

  const kamera = useRef<CameraView>(null);
  const [izin, izinIste] = useCameraPermissions();
  const [cekiliyor, setCekiliyor] = useState(false);

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
    if (!sonuc) return;
    const eslesenler = kalemler.filter((k) => k.eslesti && k.besin);

    setHata(null);
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
        },
      });
    } catch {
      // Sessiz başarısızlık, kullanıcının öğünü kaydettiğini sanmasına yol açar.
      setHata(islemHatasiMetni('tanima_onayla', dil));
      return;
    }

    router.replace('/(sekme)/beslenme');
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
    const toplamKalori = kalemler.filter((k) => k.eslesti).reduce((t, k) => t + k.gram, 0);

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

          {sonuc.kota.not ? <Uyari govde={sonuc.kota.not} /> : null}
          {sonuc.model_uyarisi ? <Uyari tur="uyari" govde={sonuc.model_uyarisi} /> : null}

          {kalemler.map((kalem, i) => (
            <Kart key={`${kalem.ad}-${i}`} vurgulu={!kalem.eslesti}>
              <Satir dagit="space-between" hizala="flex-start">
                <View style={{ flex: 1, gap: 2 }}>
                  <Yazi tur="baslik3">{kalem.besin?.ad ?? kalem.ad}</Yazi>
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
                          ? { ...k, besin: { id: besin.id, ad: besin.name_tr }, eslesti: true }
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
                {sonuc.toplam.kalori}
              </Sayi>
              <Yazi tur="kucuk" renk="metinSilik">
                kcal · {toplamKalori} g
              </Yazi>
            </Satir>
            <Yazi tur="kucuk" renk="metinYumusak">
              P {Math.round(sonuc.toplam.protein_g)} g · K {Math.round(sonuc.toplam.karbonhidrat_g)}{' '}
              g · Y {Math.round(sonuc.toplam.yag_g)} g
            </Yazi>
            <Yazi tur="etiket" renk="metinSilik">
              {m.kaynakEtiketi}
            </Yazi>
          </Kart>

          <Dugme
            baslik={m.onayla}
            onPress={() => void onayla()}
            pasif={kalemler.filter((k) => k.eslesti).length === 0}
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
        <Yazi renk="metinYumusak">{m.cekimGiris}</Yazi>

        <Kart>
          {m.ipuclari.map((ipucu: string) => (
            <Ipucu key={ipucu} metin={ipucu} />
          ))}
        </Kart>

        {tekrarDeneme ? <Uyari govde={m.tekrarDenemeNotu} /> : null}
        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        {izin?.granted === false ? (
          <View style={{ gap: tema.bosluk.sm }}>
            <Uyari tur="uyari" govde={m.kameraIzniYok} />
            {izin.canAskAgain ? (
              <Dugme baslik={m.kameraIzniVer} tur="ikincil" onPress={() => void izinIste()} />
            ) : null}
          </View>
        ) : null}

        {izin?.granted ? (
          <CameraView
            ref={kamera}
            style={{
              width: '100%',
              aspectRatio: 3 / 4,
              borderRadius: tema.yaricap.md,
              overflow: 'hidden',
            }}
          />
        ) : null}

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
        <Dugme
          baslik={m.elleAraEkle}
          tur="sessiz"
          onPress={() => router.replace('/(sekme)/beslenme')}
        />

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
    const zamanlayici = setTimeout(() => {
      void istek<{ sonuclar: BesinSonucu[] }>(
        `/v1/beslenme/besin/ara?q=${encodeURIComponent(sorgu)}`,
      )
        .then((c) => setSonuclar(c.sonuclar))
        .catch(() => setSonuclar([]));
    }, 250);
    return () => clearTimeout(zamanlayici);
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
              {besin.name_tr}
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
