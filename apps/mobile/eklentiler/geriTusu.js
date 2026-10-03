/**
 * Android geri tuşu — eski (KEYCODE_BACK) yol AÇIK kalıyor.
 *
 * Uygulama `targetSdkVersion 36` ile derleniyor. Android 16'da (API 36) bu hedefle
 * "tahmini geri" (predictive back) zorunlu hâle geliyor: sistem geri olayını artık
 * `onBackPressed` / `KEYCODE_BACK` olarak göndermiyor, yalnızca `OnBackInvokedCallback`
 * ile bildiriyor. React Native 0.76'nın `BackHandler`'ı o geri çağrıyı dinlemiyor.
 *
 * Sonucu emülatörde (Android 16) ölçüldü: HER "geri" basışı uygulamayı kapatıyordu —
 * ikincil sekmeden Program'a dönmek, ödeme ekranını kapatmak, barkod ekranından çıkmak
 * yerine kullanıcı ana ekrana atılıyordu. Gezgin olayı hiç görmüyordu.
 *
 * `android:enableOnBackInvokedCallback="false"` uygulamayı eski davranışa döndürüyor;
 * Android 16 bu geri çekilmeye hâlâ izin veriyor. React Native tahmini geriyi
 * desteklediğinde (yükseltmede) bu eklenti kaldırılmalı.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function geriTusu(yapilandirma) {
  return withAndroidManifest(yapilandirma, (sonuc) => {
    const uygulama = sonuc.modResults.manifest.application?.[0];
    if (uygulama) {
      uygulama.$['android:enableOnBackInvokedCallback'] = 'false';
    }
    return sonuc;
  });
};
