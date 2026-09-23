const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Preserve Expo's default package-entry priority. Selecting `module` here
// causes URL/polyfill packages to load their incompatible ESM entry in Expo Go.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Keep dev bundling within the available memory on Windows.
config.maxWorkers = 2;

module.exports = config;
