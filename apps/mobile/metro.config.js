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
 * Sunucu kökü = proje kökü.
 *
 * Expo monorepo'da `serverRoot`u çalışma alanı köküne (C:/dev/Made2Fit) çekiyor ama
 * `projectRoot` uygulama klasörü olarak kalıyor. Geliştirmede sorun çıkmıyor; yayın
 * paketi alınırken `expo export:embed` giriş dosyasının yolunu proje köküne göre
 * hesaplayıp sunucu köküne göre çözmeye çalışıyor ve bulamıyor:
 *
 *   Unable to resolve module ./index.js from C:/dev/Made2Fit/.
 *
 * İkisini eşitlemek çözüyor. Çalışma alanı paketleri `watchFolders` ve
 * `nodeModulesPaths` üzerinden çözülmeye devam ediyor.
 */
config.server = { ...config.server, unstable_serverRoot: projeKoku };

module.exports = config;
