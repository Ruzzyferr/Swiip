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

module.exports = config;
