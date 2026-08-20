import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OturumSaglayici, useMetinler } from '../src/durum/Oturum';
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
  const metinler = useMetinler();

  return (
    <>
      <StatusBar style={tema.koyu ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tema.renk.zemin },
          headerTintColor: tema.renk.metin,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: tema.renk.zemin },
          headerBackTitle: metinler.genel.geri,
        }}
      >
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
        <Stack.Screen name="odeme" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </>
  );
}
