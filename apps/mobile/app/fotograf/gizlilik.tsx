import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Dugme, Ekran, Kart, Satir, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { islemHatasiMetni } from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { istek } from '../../src/veri/api';

/**
 * Fotoğraf gizlilik ekranı (F4.3, F4.9).
 *
 * Bu ekran bir hukuk metni değil, bir pazarlama argümanı: Türkiye'de indirmeyi öldürebilecek
 * en büyük çekince "vücut fotoğrafım nerede duracak" sorusu. Cevabımız "hiçbir yerde".
 *
 * Fotoğrafsız çıkış yolu (F6) burada, aynı boyutta ve aynı görünürlükte duruyor —
 * karanlık kalıp yok.
 */
export default function FotografGizlilik() {
  const tema = useTema();
  const metinler = useMetinler();
  const f = metinler.fotograf;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const dil = useDil();

  const rizaVer = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      await istek('/v1/vucut/foto-riza', { yontem: 'POST', govde: { onay: true } });
    } catch {
      /**
       * Rıza kaydedilmeden çekime geçmek, kullanıcıya üç fotoğraf çektirip sonunda
       * "rıza yok" demek olurdu. KVKK açık rızası kaydedilmeden fotoğraf istenmez.
       */
      setHata(islemHatasiMetni('foto_riza', dil));
      setYukleniyor(false);
      return;
    }
    setYukleniyor(false);
    router.push('/fotograf/cekim');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: f.gizlilikSayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{metinler.gizlilik.fotografBaslik}</Yazi>

        <Kart vurgulu>
          <Yazi renk="metinYumusak">{metinler.gizlilik.fotografGovde}</Yazi>
        </Kart>

        <View style={{ gap: tema.bosluk.md }}>
          {f.akisAdimlari.map((adim, sira) => (
            <Akis key={adim} adim={String(sira + 1)} metin={adim} vurgu={sira >= 3} />
          ))}
        </View>

        <Uyari tur="uyari" govde={metinler.gizlilik.cihazKopyasi} />

        {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

        <Dugme baslik={f.fotoraflaDevam} onPress={() => void rizaVer()} yukleniyor={yukleniyor} />

        <Kart>
          <Yazi tur="baslik3">{metinler.gizlilik.fotografsizDevam}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.gizlilik.fotografsizAciklama}
          </Yazi>
          <Dugme baslik={f.olculerleDevam} tur="ikincil" onPress={() => router.push('/rapor')} />
        </Kart>
      </Ekran>
    </>
  );
}

function Akis({ adim, metin, vurgu }: { adim: string; metin: string; vurgu?: boolean }) {
  const tema = useTema();
  return (
    <Satir arasi="md" hizala="flex-start">
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: vurgu ? tema.renk.aksan : tema.renk.cizgi,
          backgroundColor: vurgu ? tema.renk.aksanZemin : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Yazi tur="etiket" renk={vurgu ? 'aksan' : 'metinSilik'}>
          {adim}
        </Yazi>
      </View>
      <Yazi
        tur="kucuk"
        renk={vurgu ? 'metin' : 'metinYumusak'}
        stil={{ flex: 1, fontWeight: vurgu ? '600' : '400' }}
      >
        {metin}
      </Yazi>
    </Satir>
  );
}
