import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { islemHatasiMetni } from '@made2fit/shared';

/**
 * Kaydırmalı öğün değiştirme (F8.10).
 *
 * Kullanıcı planladığımız öğünü beğenmediğinde, o öğünün MAKRO BÜTÇESİNİ KORUYAN
 * alternatifler arasında gezer. Ne seçerse seçsin günlük toplam bozulmaz.
 *
 * Sonsuz kaydırma yok: deste 12-15 kartta biter. Boş destede eksik malzeme önerisi çıkar.
 */

interface Kart {
  id: string;
  ad: string;
  makrolar: { kalori: number; protein_g: number; yag_g: number; karbonhidrat_g: number };
  porsiyon_katsayisi: number;
  hazirlik_dakika: number;
  maliyet_kademesi: number;
  etiketler: string[];
  malzemeler: Array<{ ad: string; gram: number }>;
}

interface DesteCevabi {
  ogun: string;
  /** Sekmeler sunucudan gelir: Ramazan'da liste sahur/iftar olur. */
  ogunler: Array<{ kod: string; ad: string }>;
  hedef: { kalori: number; protein_g: number };
  kartlar: Kart[];
  mod: 'menu' | 'porsiyon';
  mesaj: string;
  eksik_malzeme_onerisi: Array<{ malzeme: string; acilan_tarif: number }>;
}

export default function OgunDestesi() {
  const tema = useTema();
  const ogunler = useMetinler().ogun;
  const genel = useMetinler().genel;
  const m = ogunler.deste;
  const dil = useDil();

  /**
   * Hangi ögün değiştiriliyor?
   *
   * Plan ekranındaki "Değiştir" düğmesi hiçbir parametre göndermiyordu: kullanıcı
   * pazartesi kahvaltısına basıyor, deste öğle destesi açılıyordu. Gün ve öğün artık
   * parametreyle geliyor; gelmezse deste tek başına gezilebilir bir tarayıcı olarak
   * açılıyor ve seçim plana yazılmıyor.
   */
  const parametre = useLocalSearchParams<{ gun?: string; ogun?: string; hafta?: string }>();
  const planGunu = parametre.gun === undefined ? null : Number(parametre.gun);
  const haftaBasi = parametre.hafta ?? null;

  const [ogun, setOgun] = useState<string | null>(parametre.ogun ?? null);
  const [dolaptan, setDolaptan] = useState(false);
  const [deste, setDeste] = useState<DesteCevabi | null>(null);
  const [indeks, setIndeks] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setIndeks(0);
    try {
      const sorgu = ogun === null ? '' : `ogun=${ogun}&`;
      setDeste(await istek<DesteCevabi>(`/v1/ogun/deste?${sorgu}dolaptan=${dolaptan}`));
      setHata(null);
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.hata);
    } finally {
      setYukleniyor(false);
    }
  }, [ogun, dolaptan]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const kaydir = async (yon: 'saga' | 'sola') => {
    const kart = deste?.kartlar[indeks];
    if (!kart) return;

    setIslemHatasi(null);

    // Tercih öğrenmesi. Kaybolursa kullanıcı bir şey kaybetmez, o yüzden yolu bloke etmiyor.
    await istek('/v1/ogun/kaydirma', {
      yontem: 'POST',
      govde: { tarif_id: kart.id, yon },
    }).catch(() => null);

    if (yon !== 'saga') {
      setIndeks((i) => i + 1);
      return;
    }

    /**
     * Sağa kaydırma SEÇİMDİR ve plana yazılmak zorunda.
     *
     * Eskiden yalnızca tercih kaydediliyor, sonra `router.back()` çağrılıyordu:
     * kullanıcı seçtiğini sanıp plana dönüyor ve eski öğünü görüyordu.
     */
    const seciliOgun = ogun ?? deste?.ogun;
    if (planGunu === null || haftaBasi === null || !seciliOgun) {
      router.back();
      return;
    }

    try {
      await istek('/v1/ogun/degistir', {
        yontem: 'POST',
        govde: {
          hafta_basi: haftaBasi,
          gun: planGunu,
          ogun_kod: seciliOgun,
          tarif_id: kart.id,
        },
      });
    } catch {
      setIslemHatasi(islemHatasiMetni('ogun_degistir', dil));
      return;
    }

    router.back();
  };

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.yukleniyor} />
      </View>
    );
  }

  if (hata) {
    return (
      <Ekran>
        <BosDurum baslik={m.bosBaslik} govde={hata} />
        <Dugme baslik={genel.planlaraBak} onPress={() => router.push('/odeme/paywall')} />
      </Ekran>
    );
  }

  const kart = deste?.kartlar[indeks];
  const bitti = deste !== null && indeks >= deste.kartlar.length;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Satir arasi="sm">
          {(deste?.ogunler ?? []).map(({ kod, ad }) => (
            <Pressable
              key={kod}
              onPress={() => setOgun(kod)}
              accessibilityRole="tab"
              accessibilityState={{ selected: (ogun ?? deste?.ogun) === kod }}
              style={{
                flex: 1,
                minHeight: tema.dokunmaHedefi,
                borderRadius: tema.yaricap.md,
                borderWidth: (ogun ?? deste?.ogun) === kod ? 2 : 1,
                borderColor: (ogun ?? deste?.ogun) === kod ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor:
                  (ogun ?? deste?.ogun) === kod ? tema.renk.aksanZemin : tema.renk.yuzey,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Yazi tur="kucuk" renk={(ogun ?? deste?.ogun) === kod ? 'aksan' : 'metinYumusak'}>
                {ad}
              </Yazi>
            </Pressable>
          ))}
        </Satir>

        <Pressable
          onPress={() => setDolaptan(!dolaptan)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dolaptan }}
          style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
        >
          <Satir arasi="sm">
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: dolaptan ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor: dolaptan ? tema.renk.aksan : 'transparent',
              }}
            />
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.sadeceDolaptan}
            </Yazi>
          </Satir>
        </Pressable>

        {islemHatasi ? <Uyari tur="tehlike" govde={islemHatasi} /> : null}

        {deste?.mod === 'porsiyon' ? (
          <Uyari baslik={m.menuDayatmiyoruz} govde={deste.mesaj} />
        ) : null}

        {deste && deste.hedef ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.makroKilidi}
            </Yazi>
            <Satir arasi="lg" hizala="baseline">
              <Sayi tur="baslik2" renk="aksan">
                {deste.hedef.kalori}
              </Sayi>
              <Yazi tur="kucuk" renk="metinYumusak">
                kcal · {deste.hedef.protein_g} g protein
              </Yazi>
            </Satir>
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.makroKilidiNotu}
            </Yazi>
          </Kart>
        ) : null}

        {kart ? (
          <Kart>
            <Satir dagit="space-between" hizala="flex-start">
              <Yazi tur="baslik2" stil={{ flex: 1 }}>
                {kart.ad}
              </Yazi>
              <Yazi tur="etiket" renk="metinSilik">
                {indeks + 1} / {deste!.kartlar.length}
              </Yazi>
            </Satir>

            {kart.porsiyon_katsayisi !== 1 ? (
              <Etiket
                metin={m.porsiyonEtiketi(porsiyonMetni(kart.porsiyon_katsayisi))}
                tur="aksan"
              />
            ) : null}

            <Satir arasi="lg" hizala="baseline">
              <Sayi tur="baslik1">{kart.makrolar.kalori}</Sayi>
              <Yazi tur="kucuk" renk="metinSilik">
                kcal
              </Yazi>
            </Satir>

            <Satir arasi="lg">
              <Yazi tur="kucuk" renk="metinYumusak">
                P {Math.round(kart.makrolar.protein_g)} g
              </Yazi>
              <Yazi tur="kucuk" renk="metinYumusak">
                K {Math.round(kart.makrolar.karbonhidrat_g)} g
              </Yazi>
              <Yazi tur="kucuk" renk="metinYumusak">
                Y {Math.round(kart.makrolar.yag_g)} g
              </Yazi>
            </Satir>

            <Satir arasi="xs">
              <Etiket metin={genel.dakikaKisa(kart.hazirlik_dakika)} />
              <Etiket metin={genel.butceKademesi(kart.maliyet_kademesi)} />
              {kart.etiketler.slice(0, 2).map((e) => (
                <Etiket key={e} metin={buyukHarf(e, dil)} />
              ))}
            </Satir>

            <Yazi tur="etiket" renk="metinSilik">
              {genel.malzemelerBasligi}
            </Yazi>
            <Yazi tur="kucuk" renk="metinYumusak">
              {kart.malzemeler.map((m) => `${m.ad} ${m.gram} g`).join(' · ')}
            </Yazi>

            <Satir arasi="sm">
              <View style={{ flex: 1 }}>
                <Dugme baslik={m.begenmedim} tur="ikincil" onPress={() => void kaydir('sola')} />
              </View>
              <View style={{ flex: 1 }}>
                <Dugme baslik={m.bunuSec} onPress={() => void kaydir('saga')} />
              </View>
            </Satir>
          </Kart>
        ) : null}

        {bitti ? <BosDurum baslik={m.desteBitti} govde={m.sonsuzKaydirmaYok} /> : null}

        {deste && deste.kartlar.length === 0 ? (
          <View style={{ gap: tema.bosluk.md }}>
            <Uyari tur="uyari" govde={deste.mesaj} />
            {deste.eksik_malzeme_onerisi.length > 0 ? (
              <Kart>
                <Yazi tur="baslik3">{m.eklerseAcilir}</Yazi>
                {deste.eksik_malzeme_onerisi.slice(0, 5).map((oneri) => (
                  <Satir key={oneri.malzeme} dagit="space-between">
                    <Yazi tur="kucuk">{oneri.malzeme}</Yazi>
                    <Yazi tur="etiket" renk="aksan">
                      {m.acilanTarif(oneri.acilan_tarif)}
                    </Yazi>
                  </Satir>
                ))}
                <Dugme
                  baslik={m.alisverisListemeEkle}
                  tur="ikincil"
                  onPress={() => router.push('/ogun/dolap')}
                />
              </Kart>
            ) : null}
          </View>
        ) : null}
      </Ekran>
    </>
  );
}

function porsiyonMetni(katsayi: number): string {
  return String(katsayi).replace('.', ',');
}
