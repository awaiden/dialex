import { defineConfig } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { dialexPlugin } from "dialexjs/vite";

// No `ssr.noExternal` needed: `dialexPlugin()` configures SSR for dialexjs itself.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [dialexPlugin(), tanstackStart(), viteReact()],
});
