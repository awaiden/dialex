import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/translate/index.ts", "src/api.ts"],
    exports: true,
  },
});
