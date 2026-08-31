import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { birimKimligi } from './kimlikler';
import { BOS_DURUM, gosterildi, gosterilebilirMi, type GecisDurumu } from './siklik';

/**
 * Tam ekran (interstitial) reklam denetleyicisi.
 *
 * **Reklam eylemin YERİNE geçmez, ARDINDAN gelir.** Bu kural bir tercih değil,
 * ölçülmüş bir şikâyetin karşılığı — `docs/rakip-analizi.md`, 1★ / 8 beğeni:
 *
 *   "3 aylık programı satın aldım ama öğün kaydetmek istediğimde kaydet tuşuna
 *    basıyorum, kaydetmek yerine reklam çıkıyor."
 *
 * İki ayrı kusur var o cümlede ve ikisinden de kaçınıyoruz: kullanıcı ödemişti
 * (ödeyene hiç gösterilmiyor, `ReklamHakki`) ve reklam kaydın yerine geçmişti
 * (burada kayıt tamamlandıktan SONRA çağrılıyor, sonucu beklenmiyor).
 *
 * **Reklam asla akışı bloklamaz.** `gosterebilirsen()` hiçbir koşulda hata
 * fırlatmıyor ve hiçbir koşulda beklenmesi gerekmiyor; yüklü reklam yoksa sessizce
 * geçiyor. Kullanıcının kaydı her hâlükârda tamamlanmış oluyor.
 */

const ANAHTAR = 'reklam.gecis.durum';

let durum: GecisDurumu = BOS_DURUM;
let okundu = false;
let reklam: InterstitialAd | null = null;
let hazir = false;

async function durumuOku(): Promise<GecisDurumu> {
  if (okundu) return durum;
  okundu = true;
  try {
    const ham = await AsyncStorage.getItem(ANAHTAR);
    if (ham) durum = { ...BOS_DURUM, ...(JSON.parse(ham) as Partial<GecisDurumu>) };
  } catch {
    // Bozuk kayıt sayacı sıfırlar; tavanın bir kez fazla çalışması kabul edilebilir.
  }
  return durum;
}

async function durumuYaz(yeni: GecisDurumu): Promise<void> {
  durum = yeni;
  try {
    await AsyncStorage.setItem(ANAHTAR, JSON.stringify(yeni));
  } catch {
    // Yazılamazsa sayaç yalnızca bu oturumda tutulur; reklam yine sınırlı kalır.
  }
}

/**
 * Bir sonraki reklamı önceden yükler.
 *
 * Tam ekran reklam yüklenmesi saniyeler sürüyor. Gösterileceği anda yüklemeye
 * başlamak, kullanıcıyı boş bir ekranda bekletmek demek — o yüzden bir önceki
 * gösterimin hemen ardından yenisi hazırlanıyor.
 */
export function gecisReklamiHazirla(): void {
  if (reklam) return;
  try {
    const yeni = InterstitialAd.createForAdRequest(birimKimligi('gecis'), {
      requestNonPersonalizedAdsOnly: true,
    });
    yeni.addAdEventListener(AdEventType.LOADED, () => {
      hazir = true;
    });
    yeni.addAdEventListener(AdEventType.CLOSED, () => {
      // Kapanınca nesne tükeniyor; bir sonraki için yenisi kuruluyor.
      hazir = false;
      reklam = null;
      gecisReklamiHazirla();
    });
    yeni.addAdEventListener(AdEventType.ERROR, () => {
      hazir = false;
      reklam = null;
    });
    reklam = yeni;
    yeni.load();
  } catch {
    reklam = null;
  }
}

/**
 * Gösterebiliyorsa gösterir; gösteremiyorsa hiçbir şey yapmaz.
 *
 * `reklamGoster` çağıranın elindeki SUNUCU kararı (`useReklamHakki().goster`).
 * Burada tekrar sorulmuyor ama parametre zorunlu: çağıran onu geçmek zorunda
 * kalsın, "unuttum" diye ödeyene reklam çıkmasın.
 */
export async function gecisReklamiGoster(reklamGoster: boolean): Promise<void> {
  if (!reklamGoster) return;

  const simdi = new Date();
  const mevcut = await durumuOku();
  if (!gosterilebilirMi(mevcut, simdi)) return;

  if (!reklam || !hazir) {
    // Hazır değilse bir sonrakine hazırlan ve bu seferi sessizce geç.
    gecisReklamiHazirla();
    return;
  }

  try {
    reklam.show();
    await durumuYaz(gosterildi(mevcut, simdi));
  } catch {
    // Gösterilemezse sayaç ARTMAZ: kullanıcı görmediği bir reklamın bedelini ödemez.
  }
}

/** Testler ve oturum kapanışı için. */
export function gecisDurumunuSifirla(): void {
  durum = BOS_DURUM;
  okundu = false;
  reklam = null;
  hazir = false;
}
