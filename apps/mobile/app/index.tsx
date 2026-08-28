import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Dugme, Ekran, Yazi, Yukleniyor } from '../src/tasarim/bilesenler';
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

  /*
    Kap `Ekran` — düz bir `View` DEĞİL.

    Apple 2026-08-28'de tam bu ekran yüzünden Guideline 4 ile reddetti:
    *"the buttons and texts were not visible"*, inceleme cihazı iPad Air 11".
    iPad'in iPhone uyumluluk penceresi uygulamaya **375x667 pt** veriyor; künye
    dört maddeyle birlikte bu yüksekliği aşıyor ve kaydırmayan bir `View`
    içinde "Başla" ile "Hesabım var" ekranın altında kalıyordu.

    `Ekran` yer varken tuvali dolduruyor (ayırıcı çalışıyor, düğmeler dibe yaslı),
    yer yokken kaydırıyor. Kural `tasmaKorumasi.test.ts` ile kilitli.
  */
  return (
    <Ekran ustGuvenliAlan>
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

        `flexGrow` — `flex: 1` değil: içerik taştığında ayırıcı sıfıra çöküp yerini
        düğmelere bırakmalı, tuvali daha da büyütmemeli.
      */}
      <View style={{ flexGrow: 1, minHeight: tema.bosluk.xl }} />

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
    </Ekran>
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
