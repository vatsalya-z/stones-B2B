const path = require("path");

module.exports = function (api) {
  api.cache(true);
  const expoDir = path.dirname(
    require.resolve("expo/package.json", { paths: [__dirname] }),
  );
  const babelPresetExpo = require.resolve("babel-preset-expo", {
    paths: [__dirname, expoDir],
  });
  return {
    presets: [babelPresetExpo],
  };
};
