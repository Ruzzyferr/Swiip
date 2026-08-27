import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Ayarlar alt ekranları düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("ayarlar/bildirimler"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function AyarlarDuzeni() {
  const secenekler = useYiginSecenekleri();
  const metinler = useMetinler();
  const m = metinler.bildirimAyarlari;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="bildirimler" options={{ title: m.sayfaBasligi }} />
      <Stack.Screen name="kaynaklar" options={{ title: metinler.kaynaklar.baslik }} />
    </Stack>
  );
}
