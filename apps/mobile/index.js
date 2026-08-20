/**
 * Uygulama girişi.
 *
 * Doğrudan `expo-router/entry` de kullanılabilirdi (ve `package.json` öyle diyordu) ama
 * monorepo'da yayın derlemesini bozuyor: paketler kökteki `node_modules`'te duruyor,
 * Metro'nun sunucu kökü çalışma alanı kökü oluyor, giriş yolu ise uygulama klasörüne
 * göre hesaplanıyor. İkisi uyuşmayınca `expo export:embed` girişi bulamıyor:
 *
 *   Unable to resolve module ./../../node_modules/expo-router/entry.js
 *
 * Geliştirme derlemesi Metro sunucusundan çalıştığı için bunu göstermiyordu; hata ancak
 * ilk yayın paketi alınırken çıktı.
 *
 * Giriş dosyası uygulama klasörünün içinde olunca yol her iki kökten de tutarlı çözülüyor.
 */
import 'expo-router/entry';
