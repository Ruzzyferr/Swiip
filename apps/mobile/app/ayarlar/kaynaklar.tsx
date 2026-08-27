import { Linking, Pressable, View } from 'react-native';
import { KAYNAKLAR } from '@swiip/shared';
import { Ayirac, Ekran, Kart, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

/**
 * Hesaplama kaynakları.
 *
 * NEDEN VAR: Apple 2026-08-27'de Guideline 1.4.1 (Safety — Physical Harm) ile
 * reddetti — uygulama sağlık hesapları sunuyor ama kaynak göstermiyordu. Apple'ın
 * şartı iki parçalı: atıf UYGULAMANIN İÇİNDE olacak ve "kolay bulunur" olacak.
 *
 * Bu yüzden ekran Ayarlar'ın içinde, sağlık uyarısının hemen yanında duruyor:
 * kullanıcı "bu sayı nereden çıktı" diye sorduğunda bakacağı yer orası.
 *
 * Künyeler `@swiip/shared`'daki `KAYNAKLAR` listesinden geliyor; açıklamalar
 * sözlükten. Akademik künye çevrilmez, açıklama çevrilir.
 */
export default function Kaynaklar() {
  const tema = useTema();
  const m = useMetinler().kaynaklar;

  const ac = (adres: string) => {
    void Linking.openURL(adres);
  };

  return (
    <Ekran kaydirilabilir>
      <Yazi tur="govde" renk="metinYumusak">
        {m.lede}
      </Yazi>

      <View style={{ gap: tema.bosluk.md }}>
        {KAYNAKLAR.map((kaynak) => {
          const aciklama = m.aciklamalar[kaynak.anahtar as keyof typeof m.aciklamalar];
          return (
            <Kart key={kaynak.anahtar}>
              <Yazi tur="baslik3">{aciklama}</Yazi>

              {/*
                Künye monospace DEĞİL: bu bir ölçüm değil, bir metin. Taksimat
                kuralının kardeşi — sayısal font yalnızca sayının okunduğu yerde.
              */}
              <Yazi tur="kucuk" renk="metinYumusak">
                {kaynak.kunye}
              </Yazi>

              {kaynak.baglanti ? (
                <Pressable
                  onPress={() => ac(kaynak.baglanti as string)}
                  accessibilityRole="link"
                  accessibilityLabel={kaynak.baglanti}
                  style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
                >
                  <Yazi tur="kucuk" renk="aksan">
                    {kaynak.baglanti}
                  </Yazi>
                </Pressable>
              ) : null}
            </Kart>
          );
        })}
      </View>

      <Ayirac />

      {/*
        Tahmin uyarısı EN ALTTA ve kartsız: kaynakları okuyup buraya gelen kişi
        "bunlar kesin sayılar" izlenimiyle ayrılmasın. Sağlıkta muhafazakâr ol.
      */}
      <Yazi tur="kucuk" renk="metinSilik">
        {m.tahminUyarisi}
      </Yazi>

      <Pressable
        onPress={() => ac('https://swiip.app/kaynaklar.html')}
        accessibilityRole="link"
        style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
      >
        <Yazi tur="kucuk" renk="aksan">
          {m.webBaglantisi}
        </Yazi>
      </Pressable>
    </Ekran>
  );
}
