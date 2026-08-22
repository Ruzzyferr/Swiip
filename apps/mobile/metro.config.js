const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

// Monorepo: paketler kök node_modules'ten çözülür, workspace kaynakları izlenir.
const projeKoku = __dirname;
const calismaAlaniKoku = path.resolve(projeKoku, '../..');

const config = getDefaultConfig(projeKoku);

config.watchFolders = [calismaAlaniKoku];
config.resolver.nodeModulesPaths = [
  path.resolve(projeKoku, 'node_modules'),
  path.resolve(calismaAlaniKoku, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

/**
 * Sunucu kökü = proje kökü — AMA yalnızca paketleme sırasında.
 *
 * Expo monorepo'da `serverRoot`u çalışma alanı köküne çekiyor, `projectRoot` ise uygulama
 * klasörü olarak kalıyor. İki komut bu farktan ters yönlerde etkileniyor ve ikisini aynı
 * anda memnun eden sabit bir değer yok:
 *
 *  - `expo export:embed` (yayın paketi) giriş yolunu proje köküne göre hesaplayıp sunucu
 *    köküne göre çözüyor ve bulamıyor:
 *      Unable to resolve module ./index.js from C:/dev/Made2Fit/.
 *    Bunu düzelten şey kökleri eşitlemek.
 *
 *  - `expo start` (geliştirme sunucusu) ise sanal girişi çalışma alanı köküne göre
 *    hesaplıyor; kökler eşitlenince aynı yolu bir kez daha ekliyor ve bulamıyor:
 *      Unable to resolve module ./apps/mobile/index from C:/dev/Made2Fit/apps/mobile/.
 *
 * Override sabit yazılıyken geliştirme derlemesi HİÇ açılmıyordu: uygulama kırmızı hata
 * ekranıyla başlıyor, tek bir ekran bile görünmüyordu. Yayın tarafı çalıştığı için de
 * kimse fark etmiyordu — emülatörde çalışmayan bir uygulamayla arayüz hiç denenemez.
 *
 * Bu yüzden koşullu: `start` dışındaki her komutta (export, export:embed) kökler eşit.
 */
// eslint-disable-next-line no-undef -- Metro yapılandırması Node altında çalışır.
const gelistirmeSunucusu = process.argv.includes('start');
if (!gelistirmeSunucusu) {
  config.server = { ...config.server, unstable_serverRoot: projeKoku };
}

module.exports = config;
