const upstreamTransformer = require('@expo/metro-config/babel-transformer');

function transformSvgFabricWrapper(source) {
  const nativeName = source.match(/codegenNativeComponent\(['"]([^'"]+)['"]/);
  if (!nativeName) return source;

  // react-native-svg 15.12.1 ships these wrappers as generated JavaScript.
  // React Native 0.81's Codegen Babel plugin expects the original typed
  // source and otherwise throws before Metro can create the bundle. Expo Go
  // already contains the RNSVG native views, so a normal wrapper is correct.
  return [
    "import { requireNativeComponent } from 'react-native';",
    `export default requireNativeComponent('${nativeName[1]}');`,
  ].join('\n');
}

module.exports.transform = async ({ src, filename, options }) => {
  const generatedFabricPackages = [
    'react-native-svg',
    'react-native-screens',
  ];
  const isSvgFabricWrapper =
    generatedFabricPackages.some((packageName) => filename.includes(packageName)) &&
    filename.includes(`${require('path').sep}fabric${require('path').sep}`) &&
    filename.endsWith('.js');

  return upstreamTransformer.transform({
    src: isSvgFabricWrapper ? transformSvgFabricWrapper(src) : src,
    filename,
    options,
  });
};
