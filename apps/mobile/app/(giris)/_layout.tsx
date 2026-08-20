import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Giriş akışı düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("(giris)/giris"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function GirisDuzeni() {
  const secenekler = useYiginSecenekleri();
  const m = useMetinler().giris;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="giris" options={{ title: m.girisYap.sayfaBasligi }} />
      <Stack.Screen name="kayit" options={{ title: m.kayit.sayfaBasligi }} />
      <Stack.Screen name="nasil-calisir" options={{ title: m.nasilCalisir.baslik }} />
      <Stack.Screen name="parola-unuttum" options={{ title: m.parolaSifirlama.sayfaBasligi }} />
    </Stack>
  );
}
