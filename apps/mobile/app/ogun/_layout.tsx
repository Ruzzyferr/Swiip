import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Öğün planı ekranları düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("ogun/plan"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function OgunDuzeni() {
  const secenekler = useYiginSecenekleri();
  const m = useMetinler().ogun;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="plan" options={{ title: m.plan.sayfaBasligi }} />
      <Stack.Screen name="deste" options={{ title: m.deste.sayfaBasligi }} />
      <Stack.Screen name="tarif" options={{ title: m.tarif.sayfaBasligi }} />
      <Stack.Screen name="dolap" options={{ title: m.dolap.sayfaBasligi }} />
      <Stack.Screen name="alisveris" options={{ title: m.alisveris.sayfaBasligi }} />
    </Stack>
  );
}
