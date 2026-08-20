import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Vücut fotoğrafı akışı düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("fotograf/cekim"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function FotografDuzeni() {
  const secenekler = useYiginSecenekleri();
  const m = useMetinler().fotograf;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="cekim" options={{ title: m.sayfaBasligi }} />
      <Stack.Screen name="gizlilik" options={{ title: m.gizlilikSayfaBasligi }} />
    </Stack>
  );
}
