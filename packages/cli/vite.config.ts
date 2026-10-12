import { defineConfig } from "vite-plus";

// `exports` is left out on purpose: with it, every build rewrites `bin` in package.json to
// `dist/index.mjs`, which silently bypasses `bin/launcher.mjs` and with it the native binary.
export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/translate/index.ts", "src/api.ts"],
  },
});
