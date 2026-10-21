// Metro config for the Tonnta Expo app inside the pnpm monorepo.
// Lets Metro resolve the workspace packages (@tonnta/*) and the deps hoisted
// to the repo-root node_modules. See:
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot, { isCSSEnabled: true });

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// The workspace packages (@tonnta/*) and Tamagui expose their entry points
// via the package.json "exports" field (with a react-native condition) rather
// than a legacy "main", so Metro must resolve via package exports.
config.resolver.unstable_enablePackageExports = true;

// pnpm gives each workspace package its own React symlink, so `@tonnta/ui`
// would otherwise pull a second copy of react / react-native into the bundle
// (and hooks break with two Reacts). Resolve these singletons from the app.
const singletons = new Set(['react', 'react-dom', 'react-native', 'react-native-web']);
const appOrigin = path.join(projectRoot, 'package.json');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  const packageName = moduleName.startsWith('@')
    ? moduleName.split('/').slice(0, 2).join('/')
    : moduleName.split('/')[0];
  if (singletons.has(packageName)) {
    return resolve({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = withTamagui(config, {
  components: ['tamagui', '@tonnta/ui'],
  config: './tamagui.config.ts',
  outputCSS: './tamagui-web.css',
});
