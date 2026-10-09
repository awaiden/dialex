import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { dialexPlugin } from "dialexjs/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dialexPlugin()],
});
