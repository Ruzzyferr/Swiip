import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { islemHatasiMetni } from '@swiip/shared';
import { Dugme, Ekran, ParolaAlani, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { ApiHatasi, istek } from '../../src/veri/api';
import { useDil, useMetinler, useOturum } from '../../src/durum/Oturum';
import { useAbonelik } from '../../src/reklam/ReklamHakki';

/**
 * Hesap silme — parola ister.
 *
 * Eskiden Ayarlar'daki bir onay penceresiydi ve sunucu yalnız erişim tokenı istiyordu:
 * kilidi açık bırakılmış bir telefonu eline alan biri hesabı ve bütün sağlık verisini
 * iki dokunuşla, geri dönüşsüz silebiliyordu. Sunucu artık parolayı şart koşuyor;
 * Android'in onay penceresi metin alanı almadığı için silme kendi ekranına taşındı.
 *
 * Sıra Apple 5.1.1(v)'in istediği gibi: ne olacağı, ödeyene abonelik uyarısı, sonra
 * düğme. Silme hâlâ uygulamanın içinde ve tek ekranda.
 */
export default function HesapSil() {
  const tema = useTema();
  const metinler = useMetinler();
  const a = metinler.ayarlar;
  const dil = useDil();
  const { cikisYap } = useOturum();
  const { durum: abonelik } = useAbonelik();

  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);

  const sil = async () => {
    if (siliniyor || !parola) return;
    setHata(null);
    setSiliniyor(true);
    try {
      await istek('/v1/hesap', {
        yontem: 'DELETE',
        govde: { onay: 'HESABIMI SİL', parola },
      });
      await cikisYap();
      router.replace('/');
    } catch (h) {
      // Silme başarısız olursa kullanıcı bunu ÖĞRENMELİ; sessiz kalmak, tutulmamış bir söz.
      setHata(h instanceof ApiHatasi ? h.mesaj : islemHatasiMetni('hesap_sil', dil));
      setSiliniyor(false);
    }
  };

  return (
    <Ekran>
      <Yazi tur="baslik1">{a.silOnayBaslik}</Yazi>
      <Yazi renk="metinYumusak">{a.silOnayGovde}</Yazi>
      {abonelik && abonelik.plan !== 'ucretsiz' ? (
        <Uyari tur="uyari" govde={a.silAbonelikNotu} />
      ) : null}

      <View style={{ gap: tema.bosluk.sm }}>
        <Yazi tur="kucuk" renk="metinYumusak">
          {a.silParolaEtiketi}
        </Yazi>
        <ParolaAlani
          value={parola}
          onChangeText={setParola}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          accessibilityLabel={a.silParolaEtiketi}
        />
        <Yazi tur="etiket" renk="metinSilik">
          {a.silParolaAciklama}
        </Yazi>
      </View>

      {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

      <Dugme
        baslik={a.silKaliciDugme}
        tur="tehlike"
        onPress={() => void sil()}
        pasif={!parola}
        yukleniyor={siliniyor}
      />
    </Ekran>
  );
}
