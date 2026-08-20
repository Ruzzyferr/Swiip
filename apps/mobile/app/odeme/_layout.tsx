import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Ödeme düzeni. Modal sunum burada: paywall akışın içindeki bir adım değil, araya giren bir teklif.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("odeme/paywall"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function OdemeDuzeni() {
  const secenekler = useYiginSecenekleri();
  const m = useMetinler().paywall;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="paywall" options={{ title: m.planlarBasligi, presentation: 'modal' }} />
    </Stack>
  );
}
