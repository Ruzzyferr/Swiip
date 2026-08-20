import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useMetinler } from '../durum/Oturum';
import { useTema } from '../tasarim/tema';

/**
 * Yığın başlıklarının ortak görünümü.
 *
 * Kök düzen ve klasör düzenleri aynı seçenekleri kullanmak zorunda: iç içe bir yığın
 * kendi varsayılanlarıyla açılırsa başlık rengi ve yazı tipi sayfadan sayfaya değişir.
 * Tek yerde durması, ayrışmasını imkânsız kılıyor.
 */
export function useYiginSecenekleri(): NativeStackNavigationOptions {
  const tema = useTema();
  const metinler = useMetinler();

  return {
    headerStyle: { backgroundColor: tema.renk.zemin },
    headerTintColor: tema.renk.metin,
    headerTitleStyle: { fontWeight: '600' },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: tema.renk.zemin },
    headerBackTitle: metinler.genel.geri,
  };
}
