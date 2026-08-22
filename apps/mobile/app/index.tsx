import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Dugme, Yazi, Yukleniyor } from '../src/tasarim/bilesenler';
import { useTema } from '../src/tasarim/tema';
import { useMetinler, useOturum } from '../src/durum/Oturum';
import { Isaret } from '../src/marka/Isaret';

/**
 * Karşılama ekranı.
 *
 * Vaat tek cümlede: programı değil, programın gerekçesini satıyoruz.
 * "Kişiselleştirilmiş" kelimesi burada da hiçbir yerde de geçmez.
 */
export default function Karsilama() {
  const tema = useTema();
  const metinler = useMetinler();
  const { kullanici, hazir } = useOturum();

  useEffect(() => {
    if (hazir && kullanici) router.replace('/(sekme)/program');
  }, [hazir, kullanici]);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={metinler.giris.aciliyor} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tema.renk.zemin,
        padding: tema.bosluk.xl,
        paddingTop: tema.bosluk.xxl,
        paddingBottom: tema.bosluk.xxl,
      }}
    >
      <View style={{ gap: tema.bosluk.lg }}>
        <Isaret renk={tema.renk.aksan} />

        <View style={{ gap: tema.bosluk.sm }}>
          <Yazi tur="dev">{metinler.giris.slogan}</Yazi>
          <Yazi tur="baslik3" renk="metinYumusak">
            {metinler.giris.altSlogan}
          </Yazi>
        </View>
        {/*
        Maddeler bir künye satırı olarak duruyor.

        Dört madde ekranın üst üçte birine sıkışıyor, altında yedi yüz piksel boşluk
        kalıyordu; o boşluk "odak" değil "yarım kalmış" okuyordu. Künye hem alanı
        gerçek içerikle dolduruyor hem de ürünün ne olduğunu tek bakışta söylüyor.
      */}
        <View style={{ marginTop: tema.bosluk.sm }}>
          {metinler.giris.maddeler.map((madde, i) => (
            <Madde key={madde.etiket} etiket={madde.etiket} metin={madde.metin} ilk={i === 0} />
          ))}
        </View>
      </View>

      {/*
        Boşluk tek yerde: künyeden sonra.

        `space-between` içerik bloklarını iki uca itiyor ve ARADA iki ayrı boşluk
        bırakıyordu; ekran hem üstten hem ortadan boş görünüyordu. Nefes almasını
        istediğimiz tek yer eylemin hemen öncesi.
      */}
      <View style={{ flex: 1, minHeight: tema.bosluk.xl }} />

      <View style={{ gap: tema.bosluk.md }}>
        <Dugme
          baslik={metinler.giris.basla}
          onPress={() => router.push('/(giris)/nasil-calisir')}
        />
        <Dugme
          baslik={metinler.giris.hesabimVar}
          tur="sessiz"
          onPress={() => router.push('/(giris)/giris')}
        />
      </View>
    </View>
  );
}

function Madde({ etiket, metin, ilk }: { etiket: string; metin: string; ilk: boolean }) {
  const tema = useTema();
  return (
    <View
      style={{
        paddingVertical: tema.bosluk.md,
        borderTopWidth: ilk ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: tema.renk.cizgi,
        gap: tema.bosluk.xxs,
      }}
    >
      <Yazi tur="etiket" renk="aksan">
        {etiket}
      </Yazi>
      <Yazi renk="metinYumusak">{metin}</Yazi>
    </View>
  );
}
