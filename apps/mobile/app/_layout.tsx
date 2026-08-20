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
        {/*
          Burada YALNIZCA gerçek rota adları durabilir: bir dosya rotası (`index.tsx`) ya da
          `_layout.tsx` taşıyan bir klasör (`(sekme)/`). expo-router karşılığı olmayan bir adı
          sessizce yok sayar — hata vermez, yalnızca konsola uyarı düşer.

          Daha önce burada `degerlendirme`, `fotograf`, `program`, `odeme` gibi on ad vardı ve
          hiçbiri eşleşmiyordu; o klasörlerin `_layout.tsx`'i yok. Ekranların çoğu kendi
          `<Stack.Screen options>` tanımını yaptığı için görünürde bir şey bozulmuyordu, ama
          `odeme`nin `presentation: 'modal'` seçeneği gerçekten kayboluyordu. Artık o seçenek
          paywall ekranının kendi tanımında.

          `src/gezinme/rotalar.test.ts` bu kuralı koruyor.
        */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(sekme)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
