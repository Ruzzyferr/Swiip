import { Platform } from 'react-native';
import * as Bildirimler from 'expo-notifications';
import {
  bildirimKimligi,
  bildirimPlaniHesapla,
  type BildirimMetinleri,
  type BildirimTercihleri,
  type BildirimTuru,
  type PlanliBildirim,
} from '@swiip/core';

/**
 * Bildirim adaptörü (T7).
 *
 * Ne planlanacağı çekirdekte (`@swiip/core` · bildirim/plan) hesaplanır ve orada
 * test edilir. Burada yalnızca "kur / iptal et" var.
 *
 * Tetikleyici biçimi tahminle değil, kurulu paketin tipinden yazıldı: SDK 52'de haftalık
 * tetikleyici `{type: WEEKLY, weekday, hour, minute}`. Eski `{weekday, hour, minute,
 * repeats}` biçimi artık kabul edilmiyor ve sessizce çalışmıyor olurdu.
 */

export type ZamanlayiciDurumu = { durum: 'kuruldu'; adet: number } | { durum: 'izin_yok' };

/**
 * Uygulama AÇIKKEN gelen hatırlatma da gösterilir.
 *
 * Emülatörde ölçüldü: uygulama ön plandayken 18:00 alarmı tetiklendi (alarm listeden
 * düştü) ama bildirim gölgeye HİÇ girmedi; aynı hatırlatma uygulama arka plandayken
 * sorunsuz göründü. Sebep, `expo-notifications` sözleşmesi: ön planda gelen bildirim
 * işleyiciye sorulur ve işleyici yoksa varsayılan "gösterme"dir.
 *
 * Yani davranış seçilmemişti, kütüphane varsayılanına bırakılmıştı. Seans hatırlatması
 * ve "seansı nasıl geçirdin" dürtüsü ürünün döngüsünü taşıyan iki bildirim; uygulamanın
 * o an açık olması onları kaybetmek için bir sebep değil.
 *
 * Ses ve rozet kapalı: hatırlatma gönderiyoruz, dürtmüyoruz.
 */
Bildirimler.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    /**
     * `shouldPlaySound` Android'de yalnızca sesi kapatmıyor.
     *
     * Kütüphanenin kendi notu: Android'de `shouldPlaySound: false` verildiğinde açılır
     * bildirim uyarısı da GÖSTERİLMİYOR — öncelik ne olursa olsun. Yani "sessiz olsun"
     * demek, uygulama açıkken bildirimi tamamen kaybetmek demekti.
     *
     * Sessizliği kanal seviyesinde sağlıyoruz (`sound: null`, `enableVibrate: false`);
     * orası hem doğru yer hem de kullanıcının sistem ayarlarından değiştirebileceği yer.
     */
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Her hatırlatma türü kendi kanalında.
 *
 * Emülatörde görüldü: bildirim `expo_notifications_fallback_notification_channel`
 * kanalıyla düşüyordu — yani uygulama hiç kanal tanımlamamış. Android 8'den beri kanal
 * kullanıcıya görünür: sistem ayarlarında beş hatırlatma türü tek bir "diğer" başlığı
 * altında toplanıyor ve kullanıcı yalnızca su hatırlatmasını susturamıyordu.
 *
 * Uygulama içi anahtarlar zaten var; ama kullanıcının sistem tarafında da aynı ayrımı
 * görebilmesi gerekiyor — bildirim ayarına uygulamadan değil telefon ayarlarından
 * bakan kullanıcı azınlık değil.
 */
const KANAL_ADLARI: Record<BildirimTuru, string> = {
  seans: 'Seans hatırlatması',
  geri_bildirim: 'Geri bildirim hatırlatması',
  haftalik_ozet: 'Haftalık özet',
  olcum: 'Ölçüm hatırlatması',
  su: 'Su hatırlatması',
};

function kanalKimligi(tur: BildirimTuru): string {
  return `swiip-${tur}`;
}

async function kanallariKur(): Promise<void> {
  // Android dışında kanal kavramı yok; çağrı zararsız ama gereksiz.
  if (Platform.OS !== 'android') return;

  for (const [tur, ad] of Object.entries(KANAL_ADLARI)) {
    await Bildirimler.setNotificationChannelAsync(kanalKimligi(tur as BildirimTuru), {
      name: ad,
      // VARSAYILAN, YÜKSEK değil: hatırlatma kesintiye uğratmaz.
      importance: Bildirimler.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });
  }
}

/**
 * expo-notifications haftanın günlerini 1 = Pazar … 7 = Cumartesi sayar;
 * çekirdek 0 = Pazar … 6 = Cumartesi. Dönüşüm tek yerde kalsın.
 */
function haftaGunuSdk(haftaGunu: number): number {
  return haftaGunu + 1;
}

/**
 * Dört haftada bir tekrar eden bildirim, haftalık tetikleyicilerle ifade edilemez.
 * Bunu yaklaşık olarak haftalık kurmaktansa hiç kurmuyoruz: kullanıcıya söz verdiğimiz
 * aralık dört hafta, her hafta ölçü hatırlatması göndermek verdiğimiz sözü bozar.
 */
function haftalikOlanlar(plan: PlanliBildirim[]): PlanliBildirim[] {
  return plan.filter((b) => b.tekrar === 'haftalik');
}

/**
 * Metinler çağıranın verdiği sözlükten gelir.
 *
 * Bildirim, kullanıcının uygulamayı açmadan gördüğü tek yüzümüz; ekranları çevirip
 * bildirimleri Türkçe bırakmak, yarı çevrilmiş bir üründen daha kötü görünür.
 */
export async function bildirimleriKur(
  tercihler: BildirimTercihleri,
  antrenmanGunleri: number[],
  metinler: BildirimMetinleri,
): Promise<ZamanlayiciDurumu> {
  const plan = haftalikOlanlar(bildirimPlaniHesapla(tercihler, { antrenmanGunleri }, metinler));

  // Hiçbir tercih açık değilse izin istemeye gerek yok; sadece temizle.
  if (plan.length === 0) {
    await Bildirimler.cancelAllScheduledNotificationsAsync();
    return { durum: 'kuruldu', adet: 0 };
  }

  let izin = await Bildirimler.getPermissionsAsync();
  if (!izin.granted) izin = await Bildirimler.requestPermissionsAsync();
  if (!izin.granted) return { durum: 'izin_yok' };

  await kanallariKur();

  // Tam yeniden kurulum: kısmi güncelleme, iptal edilmiş bir tercihi hayatta bırakabilir.
  await Bildirimler.cancelAllScheduledNotificationsAsync();

  for (const bildirim of plan) {
    await Bildirimler.scheduleNotificationAsync({
      identifier: bildirimKimligi(bildirim),
      content: {
        title: bildirim.baslik,
        body: bildirim.govde,
      },
      /**
       * `channelId` TETİKLEYİCİDE, içerikte değil.
       *
       * İçeriğe konmuştu ve TypeScript yakalamadı: `...(kosul ? {...} : {})` yayılması
       * fazla-alan kontrolünü atlatıyor. `NotificationContentInput` böyle bir alan
       * tanımlamıyor; `WeeklyTriggerInput` tanımlıyor
       * (`expo-notifications/build/Notifications.types.d.ts`). Sonuç: `kanallariKur()`
       * beş kanalı düzgünce oluşturuyor, sonra hepsi kullanılmadan duruyor ve her
       * bildirim `expo_notifications_fallback_notification_channel` içine düşüyordu —
       * yani kullanıcı sistem ayarlarından "antrenman hatırlatması"nı ayrı kapatamıyordu.
       */
      trigger: {
        type: Bildirimler.SchedulableTriggerInputTypes.WEEKLY,
        ...(Platform.OS === 'android' ? { channelId: kanalKimligi(bildirim.tur) } : {}),
        weekday: haftaGunuSdk(bildirim.haftaGunu),
        hour: bildirim.saat,
        minute: bildirim.dakika,
      },
    });
  }

  return { durum: 'kuruldu', adet: plan.length };
}

/** Çıkışta çağrılır: bir sonraki kullanıcıya öncekinin hatırlatmaları gitmesin. */
export async function bildirimleriKapat(): Promise<void> {
  await Bildirimler.cancelAllScheduledNotificationsAsync();
}
