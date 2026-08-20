import * as Bildirimler from 'expo-notifications';
import {
  bildirimKimligi,
  bildirimPlaniHesapla,
  type BildirimMetinleri,
  type BildirimTercihleri,
  type PlanliBildirim,
} from '@made2fit/core';

/**
 * Bildirim adaptörü (T7).
 *
 * Ne planlanacağı çekirdekte (`@made2fit/core` · bildirim/plan) hesaplanır ve orada
 * test edilir. Burada yalnızca "kur / iptal et" var.
 *
 * Tetikleyici biçimi tahminle değil, kurulu paketin tipinden yazıldı: SDK 52'de haftalık
 * tetikleyici `{type: WEEKLY, weekday, hour, minute}`. Eski `{weekday, hour, minute,
 * repeats}` biçimi artık kabul edilmiyor ve sessizce çalışmıyor olurdu.
 */

export type ZamanlayiciDurumu = { durum: 'kuruldu'; adet: number } | { durum: 'izin_yok' };

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

  // Tam yeniden kurulum: kısmi güncelleme, iptal edilmiş bir tercihi hayatta bırakabilir.
  await Bildirimler.cancelAllScheduledNotificationsAsync();

  for (const bildirim of plan) {
    await Bildirimler.scheduleNotificationAsync({
      identifier: bildirimKimligi(bildirim),
      content: { title: bildirim.baslik, body: bildirim.govde },
      trigger: {
        type: Bildirimler.SchedulableTriggerInputTypes.WEEKLY,
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
