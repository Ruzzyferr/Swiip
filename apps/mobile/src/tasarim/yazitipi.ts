import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';

/**
 * Yazı tipleri.
 *
 * `tokens.ts` uzun süredir "başlıklarda karakterli grotesk, sayısal veride tabular
 * monospace" diyor ve `tipografi.aileler` içinde Inter ile JetBrains Mono adlarını
 * taşıyordu. Ama uygulamada `fontFamily` **hiçbir yerde yazmıyordu**: ne bu paketler
 * kuruluydu, ne de bir yükleme çağrısı vardı.
 *
 * Sonucu şuydu: uygulamanın tamamı Android sistem fontuyla (Roboto) çalışıyordu ve
 * "ölçü aleti" iddiasını taşıyan tek şey — hizalanan rakamlar — hiç var olmamıştı.
 * Dışarıdan bakan bir tasarımcı bunu ilk bakışta "sistem fontu yanılsaması" diye
 * teşhis etti; token dosyasındaki niyet ile ekrandaki gerçek beş aydır ayrışmıştı.
 *
 * Tabular rakam burada bir süs değil: set × tekrar × kg üçlüsü ve kalori sayıları
 * satırlar arasında aynı sütunda durmak zorunda. Orantılı bir fontta "1" ile "8"
 * farklı genişlikte olur ve sayı sütunu titrer.
 */

export const YAZI_TIPLERI = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
};

/**
 * Yazı tipleri yüklendi mi?
 *
 * Yüklenmeden çizmek, ilk kareyi sistem fontuyla gösterip sonra zıplatmak demek.
 * Kök düzen bu değeri bekliyor.
 */
export function yaziTipleriHazirMi(): boolean {
  const [hazir, hata] = useFonts(YAZI_TIPLERI);

  // Yükleme başarısızsa beklemiyoruz: sistem fontuyla açılmak, hiç açılmamaktan iyidir.
  return hazir || hata !== null;
}
