import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OturumSaglayici } from '../src/durum/Oturum';
import { useYiginSecenekleri } from '../src/gezinme/yiginSecenekleri';
import { useTema } from '../src/tasarim/tema';

export default function KokDuzen() {
  return (
    <SafeAreaProvider>
      <OturumSaglayici>
        <Yigin />
      </OturumSaglayici>
    </SafeAreaProvider>
  );
}

function Yigin() {
  const tema = useTema();
  const secenekler = useYiginSecenekleri();

  return (
    <>
      <StatusBar style={tema.koyu ? 'light' : 'dark'} />
      <Stack screenOptions={secenekler}>
        {/*
          Buradaki her ad gerçek bir rotaya karşılık geliyor: `index.tsx` bir dosya
          rotası, diğerleri `_layout.tsx` taşıyan klasörler.

          Klasör düzenleri uzun süre YAZILMAMIŞTI ve bu satırlar sessizce yok sayılıyordu.
          Görünürdeki sonucu, o klasörlerdeki ekranların yükleme anında başlıkta ham rota
          yolunu göstermesiydi ("rapor/index", "ogun/plan") — çünkü başlık ekranın kendi
          içinde, yükleme dalından sonra kuruluyordu.

          `headerShown: false` burada: başlığı iç düzen veriyor, ikisi birden verirse
          üst üste iki başlık çıkar.

          `src/gezinme/rotalar.test.ts` bu adların gerçek olduğunu koruyor.
        */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(giris)" options={{ headerShown: false }} />
        <Stack.Screen name="(sekme)" options={{ headerShown: false }} />
        <Stack.Screen name="degerlendirme" options={{ headerShown: false }} />
        <Stack.Screen name="fotograf" options={{ headerShown: false }} />
        <Stack.Screen name="rapor" options={{ headerShown: false }} />
        <Stack.Screen name="program" options={{ headerShown: false }} />
        <Stack.Screen name="ogun" options={{ headerShown: false }} />
        <Stack.Screen name="beslenme" options={{ headerShown: false }} />
        <Stack.Screen name="ilerleme" options={{ headerShown: false }} />
        <Stack.Screen name="ayarlar" options={{ headerShown: false }} />
        <Stack.Screen name="odeme" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
