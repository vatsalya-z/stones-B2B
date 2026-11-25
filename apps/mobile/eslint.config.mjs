import base from "@stone/config/eslint";

export default [
  {
    ignores: [
      ".expo/**",
      "dist/**",
      "dist-android/**",
      "dist-ios/**",
      "dist-web/**",
      "babel.config.js",
      "metro.config.js",
    ],
  },
  ...base,
  {
    files: ["src/theme/assets.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
