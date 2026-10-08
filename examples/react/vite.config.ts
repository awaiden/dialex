import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { i18nPlugin } from "dialexjs/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), i18nPlugin()],
});
