import { Stack } from 'expo-router';
import { useMetinler } from '../../src/durum/Oturum';
import { useYiginSecenekleri } from '../../src/gezinme/yiginSecenekleri';

/**
 * Program ekranları düzeni.
 *
 * Başlık BURADA tanımlı, ekranın içinde değil.
 *
 * Ekranlar başlığını kendi `<Stack.Screen options>` satırlarıyla kuruyordu ve o satır
 * yükleme/hata dallarından SONRA geliyordu: veri gelene kadar başlıkta ham rota yolu
 * yazıyordu ("program/gun"). Klasör düzeni başlığı en baştan biliyor.
 *
 * Ekranlar kendi tanımlarını yapmaya devam ediyor; dinamik başlıklar (tarif adı, hareket
 * adı) veri gelince buranın üstüne yazıyor.
 */
export default function ProgramDuzeni() {
  const secenekler = useYiginSecenekleri();
  const metinler = useMetinler();
  const m = metinler.program;

  return (
    <Stack screenOptions={secenekler}>
      <Stack.Screen name="gun" options={{ title: m.gunSayfaBasligi }} />
      <Stack.Screen name="hafta" options={{ title: m.hafta.sayfaBasligi }} />
      <Stack.Screen name="hareket" options={{ title: m.hareketSayfaBasligi }} />
      <Stack.Screen name="neden" options={{ title: m.neden.sayfaBasligi }} />
      <Stack.Screen
        name="geri-bildirim"
        options={{ title: metinler.geriBildirim.kararSayfaBasligi }}
      />
    </Stack>
  );
}
