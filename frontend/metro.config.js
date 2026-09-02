const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Preserve Expo's default package-entry priority. Selecting `module` here
// causes URL/polyfill packages to load their incompatible ESM entry in Expo Go.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.transformer.babelTransformerPath = require.resolve('./metro.transformer');

// Avoid Windows child-process failures (EPERM/UNKNOWN) while Metro transforms
// the bundle. Keep all worker work in-process and limit parallelism.
config.transformer.unstable_workerThreads = true;
config.watcher.unstable_workerThreads = true;
config.maxWorkers = 1;

module.exports = config;
