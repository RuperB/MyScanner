const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'pdf-lib' || moduleName.startsWith('pdf-lib/es'))) {
    return {
      filePath: require.resolve('pdf-lib/dist/pdf-lib.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
