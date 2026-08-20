import { Stack } from 'expo-router';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Değerlendirme düzeni. Başlık gizli: ilerleme şeridi başlığın işini görüyor.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("degerlendirme/index"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function DegerlendirmeDuzeni() {
  const secenekler = useYiginSecenekleri();

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="blok-sonu" options={{ headerShown: false }} />
      <Stack.Screen name="kapi" options={{ headerShown: false }} />
    </Stack>
  );
}
