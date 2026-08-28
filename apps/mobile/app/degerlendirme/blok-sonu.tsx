import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Dugme, Ekran, Kart, Yazi } from '../../src/tasarim/bilesenler';
import { buyukHarf } from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';

/**
 * Blok sonu geri bildirimi (F2.8).
 *
 * Terk oranına karşı en güçlü kozumuz. Kural: buradaki her cümle gerçek bir hesaptan gelir.
 * Kutlama yok, konfeti yok, "harikasın" yok — sadece o ana kadar ne öğrendiğimiz.
 */

export default function BlokSonu() {
  const degerlendirme = useMetinler().degerlendirme;
  const m = degerlendirme.blokSonu;
  const dil = useDil();
  const { blok, metin } = useLocalSearchParams<{ blok: string; metin: string }>();
  const baslik = m.basliklar[(blok ?? '') as keyof typeof m.basliklar] ?? m.varsayilanBaslik;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/*
        Yatay kenar boşluğu BURADA verilmiyor — `Ekran` zaten veriyor.

        `paddingHorizontal: tema.bosluk.lg` yazıyordu ve `Ekran` da kendi içinde
        `padding: tema.bosluk.lg` uyguluyor. İkisi toplanıyordu: bu ekran 32 px yatay
        boşlukla, uygulamanın geri kalanı 16 px ile çiziliyordu. Ölçüldü (1320 px
        cihaz): kart sonu 96 px, diğer her ekran 48 px.

        Zaten seyrek olan bir ekranın bir de içeri kaçmış görünmesinin sebebi buydu.

        Dikey ortalama da BURADA verilmiyor. Önce dışa `justifyContent: 'center'`
        bir `View` sarılıp içine `<Ekran kaydirilabilir={false}>` konuyordu; o
        kurulum içerik taştığında kaydırmıyor, KIRPIYOR. Blok sonu metni sunucudan
        geliyor ve uzunluğu değişken — uzun bir metinde "Devam et" düğmesi ekranın
        dışında kalıyordu ve değerlendirme orada kilitleniyordu. `ortala` yer varken
        ortalıyor, yer yokken kaydırıyor.
      */}
      <Ekran ustGuvenliAlan ortala>
        {/*
            Etiket HAM BLOK ANAHTARI değil, bölüm harfi.

            `{m.bolum} {blok}` yazıyordu ve ekranda "BÖLÜM K" çıkıyordu: `K` bir
            veritabanı kimliği, kullanıcı için bir anlamı yok. Dahası değerlendirme
            cetveli aynı kartı "S" (Sen) diye gösteriyor — kullanıcı aynı kart için
            iki farklı harf görüyordu.

            Cetvel bu hatayı bir kez yaşayıp düzeltmişti (`Cetvel.tsx`: "Etiket bölüm
            harfi — ama ham blok anahtarı DEĞİL"); aynı düzeltme buraya uğramamış.
            Harf artık orada olduğu gibi bölüm ADININ baş harfinden geliyor, yani
            hemen altındaki başlıkla aynı kelimeye bağlanıyor.
          */}
        <Yazi tur="etiket" renk="aksan">
          {m.bolum} {buyukHarf(baslik.slice(0, 1), dil)}
        </Yazi>
        <Yazi tur="baslik1">{baslik}</Yazi>

        <Kart vurgulu>
          <Yazi tur="baslik3">{metin}</Yazi>
        </Kart>

        <Yazi tur="kucuk" renk="metinSilik">
          {m.dipnot}
        </Yazi>

        <Dugme baslik={degerlendirme.devamEtDugmesi} onPress={() => router.back()} />
      </Ekran>
    </>
  );
}
