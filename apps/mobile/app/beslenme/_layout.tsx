import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Beslenme alt ekranları düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("beslenme/barkod"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function BeslenmeDuzeni() {
  const secenekler = useYiginSecenekleri();
  const metinler = useMetinler();

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="barkod" options={{ title: metinler.barkod.sayfaBasligi }} />
      <Stack.Screen name="tanima" options={{ title: metinler.tanima.dogrulaSayfaBasligi }} />
    </Stack>
  );
}
