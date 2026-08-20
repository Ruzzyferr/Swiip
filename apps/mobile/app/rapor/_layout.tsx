import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Vücut analizi raporu düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("rapor/index"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function RaporDuzeni() {
  const secenekler = useYiginSecenekleri();
  const metinler = useMetinler();

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="index" options={{ title: metinler.rapor.sayfaBasligi }} />
      <Stack.Screen name="gerceklik" options={{ title: metinler.gerceklik.edSayfaBasligi }} />
    </Stack>
  );
}
