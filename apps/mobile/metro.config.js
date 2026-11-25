const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;
config.resolver.extraNodeModules = {
  "query-string": path.resolve(projectRoot, "node_modules/query-string"),
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "react-native-web": path.resolve(projectRoot, "node_modules/react-native-web"),
};

// Prevent any server-only / Next.js / Postgres driver modules from entering React Native bundles
const forbiddenModulesPattern =
  /^(server-only|pg|next(\/.*)?|@stone\/database\/(server|admin|pg)|@stone\/auth\/server)$/;

// Ensure workspace packages & transitive pnpm deps always resolve apps/mobile's single React 19.0.0 runtime
const singletonRuntimePattern =
  /^(react|react\/.+|react-dom|react-dom\/.+|react-native-web|react-native-web\/.+)$/;
const appResolutionOrigin = path.resolve(projectRoot, "package.json");

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (forbiddenModulesPattern.test(moduleName)) {
    throw new Error(
      `[StonesDekho Mobile Security Guard] Forbidden server/web module "${moduleName}" imported in React Native.`,
    );
  }
  const nextContext = singletonRuntimePattern.test(moduleName)
    ? { ...context, originModulePath: appResolutionOrigin }
    : context;
  if (originalResolveRequest) {
    return originalResolveRequest(nextContext, moduleName, platform);
  }
  return nextContext.resolveRequest(nextContext, moduleName, platform);
};

module.exports = config;
