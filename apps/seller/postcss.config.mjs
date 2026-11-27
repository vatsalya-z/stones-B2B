import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, "tailwind.config.mjs"),
    },
    autoprefixer: {},
  },
};

export default config;

