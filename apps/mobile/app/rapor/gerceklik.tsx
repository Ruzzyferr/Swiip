import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { gercekcilikTesti } from '@swiip/core';
import type { Hedef } from '@swiip/shared';
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
import { istek } from '../../src/veri/api';
import { useMetinler, useSayilarGizli } from '../../src/durum/Oturum';

/**
 * Hedefin gerçekçiliği (H10 · F2.11).
 *
 * Ücretsiz raporun en değerli parçası ve aynı zamanda en zor kısmı: kullanıcıya
 * beklentisinin fizyolojik olmadığını söylemek. Bunu suçlayarak değil, hesap göstererek
 * yapıyoruz — ve her zaman bir alternatif sunuyoruz.
 *
 * Play "Sağlık uygulamaları" politikası da bunu gerektiriyor: yanıltıcı vaat yasak.
 * "2 haftada 10 kilo" pazarlaması kullanılamaz; biz zaten kullanmıyoruz.
 */

interface ProfilCevabi {
  profil: {
    kilo_kg: number;
    hedef_vektoru: {
      birincil: Hedef;
      hedef_kilo_kg?: number;
      aylik_beklenti_kg?: number;
      hedef_tarih?: string;
    };
  };
}

export default function Gerceklik() {
  const tema = useTema();
  const m = useMetinler().gerceklik;
  const sayilarGizli = useSayilarGizli();

  const [profil, setProfil] = useState<ProfilCevabi['profil'] | null>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    // Okuma isteginin yan etkisi olmaz: eskiden POST /tamamla cagriliyordu ve o uc
    // degerlendirmeyi TAMAMLANMIS isaretliyordu — yarim doldurulmus yeni surum dahil.
    void istek<ProfilCevabi>('/v1/degerlendirme/profil')
      .then((c) => setProfil(c.profil))
      .catch(() => setProfil(null))
      .finally(() => setHazir(true));
  }, []);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.yukleniyor} />
      </View>
    );
  }

  if (!profil) {
    return (
      <Ekran>
        <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
      </Ekran>
    );
  }

  if (sayilarGizli) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: m.edSayfaBasligi }} />
        <Ekran>
          <Yazi tur="baslik1">{m.edBaslik}</Yazi>
          <Uyari baslik={m.edUyariBaslik} govde={m.edUyariGovde} />
          <Dugme baslik={m.programimiGor} onPress={() => router.replace('/(sekme)/program')} />
        </Ekran>
      </>
    );
  }

  const beklenti = profil.hedef_vektoru.aylik_beklenti_kg;
  const hedefKilo = profil.hedef_vektoru.hedef_kilo_kg;

  const test =
    beklenti !== undefined
      ? gercekcilikTesti({
          kiloKg: profil.kilo_kg,
          aylikBeklentiKg: beklenti,
          hedef: profil.hedef_vektoru.birincil,
        })
      : null;

  const fark = hedefKilo !== undefined ? Math.abs(hedefKilo - profil.kilo_kg) : null;
  const gercekciAylik = test
    ? Number(
        test.onerilen_aralik
          .split('-')[1]
          ?.replace(/[^\d,.]/g, '')
          .replace(',', '.') ?? 0,
      )
    : 0;
  const gercekciHafta =
    fark !== null && gercekciAylik > 0 ? Math.ceil((fark / gercekciAylik) * 4.345) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        {test ? (
          <Kart vurgulu={!test.gercekci}>
            <Satir dagit="space-between">
              <Yazi tur="etiket" renk={test.gercekci ? 'aksan' : 'uyari'}>
                {m.seninBeklentin}
              </Yazi>
              <Etiket
                metin={test.gercekci ? m.gercekciEtiketi : m.cokHizliEtiketi}
                tur={test.gercekci ? 'aksan' : 'uyari'}
              />
            </Satir>
            <Satir arasi="xs" hizala="baseline">
              <Sayi tur="dev" renk={test.gercekci ? 'aksan' : 'uyari'}>
                {String(beklenti).replace('.', ',')}
              </Sayi>
              <Yazi tur="kucuk" renk="metinSilik">
                {m.kgAy}
              </Yazi>
            </Satir>

            <Satir arasi="sm" hizala="baseline">
              <Yazi tur="kucuk" renk="metinSilik">
                {m.korunabilirAralik}
              </Yazi>
              <Sayi tur="kucuk" renk="aksan">
                {test.onerilen_aralik} {m.ayBirimi}
              </Sayi>
            </Satir>

            <Yazi tur="kucuk" renk="metinYumusak">
              {test.mesaj}
            </Yazi>
          </Kart>
        ) : (
          <Uyari govde={m.beklentiYok} />
        )}

        {fark !== null && gercekciHafta !== null ? (
          <Kart>
            <Yazi tur="baslik3">{m.yolBasligi}</Yazi>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.suAnkiKilo}
              </Yazi>
              <Sayi tur="kucuk">{profil.kilo_kg} kg</Sayi>
            </Satir>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.hedefKilo}
              </Yazi>
              <Sayi tur="kucuk">{hedefKilo} kg</Sayi>
            </Satir>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.fark}
              </Yazi>
              <Sayi tur="kucuk" renk="aksan">
                {String(Math.round(fark * 10) / 10).replace('.', ',')} kg
              </Sayi>
            </Satir>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.korunabilirSure}
              </Yazi>
              <Sayi tur="baslik3" renk="aksan">
                {m.haftaBirimi(gercekciHafta)}
              </Sayi>
            </Satir>

            {profil.hedef_vektoru.hedef_tarih ? (
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.hedefTarihNotu(profil.hedef_vektoru.hedef_tarih)}
              </Yazi>
            ) : null}
          </Kart>
        ) : null}

        <Kart>
          <Yazi tur="baslik3">{m.nedenHizliBaslik}</Yazi>
          {m.nedenHizliMaddeleri.map((madde) => (
            <Madde key={madde} metin={madde} />
          ))}
        </Kart>

        <Uyari tur="uyari" govde={m.saglikUyarisi} />

        <Dugme baslik={m.programimiGor} onPress={() => router.replace('/(sekme)/program')} />
        <Dugme
          baslik={m.hedefimiGuncelle}
          tur="ikincil"
          onPress={() => router.push('/(sekme)/ayarlar')}
        />
      </Ekran>
    </>
  );
}

function Madde({ metin }: { metin: string }) {
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
