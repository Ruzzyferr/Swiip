import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * İlerleme alt ekranları düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("ilerleme/karsilastirma"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function IlerlemeDuzeni() {
  const secenekler = useYiginSecenekleri();
  const m = useMetinler().karsilastirma;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="karsilastirma" options={{ title: m.sayfaBasligi }} />
    </Stack>
  );
}
