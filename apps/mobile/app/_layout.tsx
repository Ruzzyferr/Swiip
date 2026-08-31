import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OturumSaglayici, useMetinler } from '../src/durum/Oturum';
import { HataSiniri } from '../src/tasarim/HataSiniri';
import { useYiginSecenekleri } from '../src/gezinme/yiginSecenekleri';
import { useTema } from '../src/tasarim/tema';
import { ReklamSaglayici } from '../src/reklam/ReklamHakki';
import { reklamlariBaslat } from '../src/reklam/baslat';
import { yaziTipleriHazirMi } from '../src/tasarim/yazitipi';
/**
 * Yalnızca yan etkisi için: modül yüklenince bildirim sunum işleyicisi kuruluyor.
 *
 * İşleyici `zamanlayici.ts` içinde modül düzeyinde. O modül daha önce yalnızca bildirim
 * AYARLARI ekranından yükleniyordu; o ekrana hiç girmeyen kullanıcıda işleyici hiç
 * kurulmuyor ve uygulama açıkken gelen hatırlatma sessizce kayboluyordu. Kök düzen her
 * açılışta yükleniyor.
 */
import '../src/bildirim/zamanlayici';

/**
 * Reklam SDK'sı ve onay akışı, modül yüklenirken bir kez.
 *
 * Kök düzende çağrılıyor çünkü onayın (AB'de UMP formu) reklamdan ÖNCE alınması
 * gerekiyor; ilk banner çizildiğinde başlatmaya kalkmak, onay alınmadan istek
 * atma riski demek. Başlatma hiçbir koşulda hata fırlatmıyor: reklamın
 * başarısızlığı uygulamayı açmamazlık edemez.
 *
 * Ödeyen kullanıcıda da çalışıyor ve bu zararsız: SDK yalnızca hazırlanıyor,
 * hiçbir reklam ÇİZİLMİYOR — çizim kararı `ReklamHakki` sunucudan geliyor.
 */
void reklamlariBaslat();

export default function KokDuzen() {
  /**
   * Yazı tipleri yüklenmeden çizmiyoruz.
   *
   * Çizersek ilk kare sistem fontuyla gelir, sonra metin zıplar. Sayısal hizalama
   * iddiasında olan bir arayüzde bu zıplama tam da görünmemesi gereken şey.
   */
  const yaziHazir = yaziTipleriHazirMi();
  if (!yaziHazir) return null;

  return (
    <SafeAreaProvider>
      <OturumSaglayici>
        {/*
          Hata sınırı oturum sağlayıcısının İÇİNDE: metinler kullanıcının dilinde
          olsun diye. Sağlayıcının kendisi patlarsa zaten uygulama açılmıyor demektir
          ve orada gösterilecek bir ekran da yok.
        */}
        {/*
          Reklam hakkı oturumun İÇİNDE: hangi kullanıcının planına bakılacağını
          bilmek için önce oturum gerekiyor. Dışarı alınırsa çıkış yapan kullanıcının
          hakkı yenilenmez ve bir sonraki kullanıcı ötekinin planıyla açılır.
        */}
        <ReklamSaglayici>
          <SinirliYigin />
        </ReklamSaglayici>
      </OturumSaglayici>
    </SafeAreaProvider>
  );
}

function SinirliYigin() {
  const m = useMetinler().hataEkrani;
  return (
    <HataSiniri metinler={m}>
      <Yigin />
    </HataSiniri>
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
