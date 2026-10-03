import { Linking } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Dugme, Ekran, Kart, Yazi } from '../../src/tasarim/bilesenler';
import { useMetinler, useOturum } from '../../src/durum/Oturum';
import { DESTEK_EPOSTASI } from '../../src/baglantilar';

/**
 * Güvenlik kapısı ekranı (F2.7).
 *
 * Tasarım ilkesi: kullanıcıyı suçlamaz ve kapıyı çarpmaz.
 * Ne olduğu, neden olduğu ve ne yapabileceği söylenir. Verisi silinmez.
 */

type KapiTipi = 'yas' | 'gebelik' | 'kardiyak' | 'yeme_bozuklugu';

export default function Kapi() {
  const metinler = useMetinler();
  const k = metinler.kapiEkrani;
  const { kullanici } = useOturum();
  const kardiyak = metinler.kapilar.kardiyak;

  /*
    Doktor onayı E-POSTAYLA, ekip eliyle açılıyor (`/v1/analitik/doktor-onayi`).

    Bu düğme eskiden Ayarlar'a götürüyordu ve orada yükleme diye bir şey yoktu;
    sunucuda da onayı yazan bir uç yoktu. Ekran "onayını yükleyince açılır" diyerek
    olmayan bir yol vaat ediyordu. Uygulama içi bir "onayım var" kutusu bilerek YOK:
    kendi beyanıyla açılan bir sert kapı, kapı değildir.
  */
  const onayGonder = () => {
    const konu = encodeURIComponent(kardiyak.epostaKonusu);
    const govde = encodeURIComponent(kardiyak.epostaGovdesi(kullanici?.email ?? ''));
    void Linking.openURL(`mailto:${DESTEK_EPOSTASI}?subject=${konu}&body=${govde}`).catch(
      () => null,
    );
  };
  const { tip, kalan } = useLocalSearchParams<{ tip: KapiTipi; kalan?: string }>();

  /**
   * Sirada bekleyen kapilar.
   *
   * Birden fazla kapi tetiklenebiliyor (ornegin kardiyak bayrak + yeme bozuklugu).
   * Yalnizca en agirini gostermek digerini sessizce yutmak olurdu; kullanici hem
   * "doktoruna danis" hem "sayilari gizliyorum" bilgisini hak ediyor.
   */
  const sirada = (kalan ?? '').split(',').filter(Boolean) as KapiTipi[];

  const ilerle = () => {
    if (sirada.length > 0) {
      router.replace({
        pathname: '/degerlendirme/kapi',
        params: { tip: sirada[0]!, kalan: sirada.slice(1).join(',') },
      });
      return true;
    }
    return false;
  };

  const secenekler = {
    yas: {
      ...metinler.kapilar.yas,
      eylem: null,
      geriDon: k.anladim,
      devamEdilebilir: false,
    },
    gebelik: {
      ...metinler.kapilar.gebelik,
      eylem: null,
      geriDon: k.anladim,
      devamEdilebilir: false,
    },
    kardiyak: {
      ...metinler.kapilar.kardiyak,
      eylem: metinler.kapilar.kardiyak.eylem,
      geriDon: k.simdilikDevam,
      devamEdilebilir: true,
    },
    yeme_bozuklugu: {
      ...metinler.kapilar.yemeBozuklugu,
      eylem: null,
      geriDon: k.devamEt,
      devamEdilebilir: true,
    },
  };

  /**
   * Tanimsiz tip patlatmiyor.
   *
   * Eskiden dogrudan `{...}[tip ?? 'kardiyak']` yaziliyordu ve tabloda karsiligi olmayan
   * bir `tip` icin `undefined` donuyordu; hemen ardindaki `icerik.baslik` firlatiyordu.
   * `swiip://degerlendirme/kapi?tip=x` ile ulasilabilir bir cokme yoluydu ve uygulamada
   * hicbir ErrorBoundary yok — sonuc beyaz ekran olurdu.
   */
  const icerik = secenekler[tip as KapiTipi] ?? secenekler.kardiyak;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/*
        Kaydırılabilir: bu ekran bir SERT KAPI ve üzerindeki tek çıkış düğmesi her
        zaman ulaşılabilir olmalı. `kaydirilabilir={false}` bir `View` çiziyordu;
        büyük yazı tipinde ya da küçük ekranda uzun sağlık metni taşınca "Anladım"
        düğmesi ekranın dışında kalıyordu — kullanıcı kapının önünde kilitleniyordu.

        Dikey ortalamayı da kap veriyor. Dışına sarılan `justifyContent: 'center'`
        `View` hiçbir işe yaramıyordu: içindeki `Ekran` zaten `flex: 1`.
      */}
      <Ekran ustGuvenliAlan ortala>
        <Yazi tur="baslik1">{icerik.baslik}</Yazi>
        <Yazi renk="metinYumusak">{icerik.govde}</Yazi>

        <Kart>
          <Yazi tur="kucuk" renk="metinSilik">
            {k.duraklama}
          </Yazi>
        </Kart>

        {icerik.eylem ? <Dugme baslik={icerik.eylem} onPress={onayGonder} /> : null}

        {/*
          Yanlış dokunulmuş tek bir kardiyak cevap program üretimini kalıcı olarak
          kapatıyordu (CLAUDE.md, 7. kusur). Düzeltmenin yolu bu ekranda görünmeli.
        */}
        {tip === 'kardiyak' ? (
          <Dugme
            baslik={kardiyak.gozdenGecir}
            tur="ikincil"
            onPress={() => router.push('/degerlendirme')}
          />
        ) : null}

        <Dugme
          baslik={icerik.geriDon}
          tur={icerik.eylem ? 'sessiz' : 'birincil'}
          onPress={() => {
            if (ilerle()) return;
            if (icerik.devamEdilebilir) router.back();
            else router.replace('/');
          }}
        />
      </Ekran>
    </>
  );
}
