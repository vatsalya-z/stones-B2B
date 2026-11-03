import { FlatCompat } from "@eslint/eslintrc";
import base from "@stone/config/eslint";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [...compat.extends("next/core-web-vitals"), ...base];

export default config;
