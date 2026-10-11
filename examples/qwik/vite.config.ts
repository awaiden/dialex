import { qwikVite } from "@builder.io/qwik/optimizer";
import { defineConfig } from "vite-plus";

// Client-side rendering keeps the example a plain Vite app. With Qwik City the same hooks run on
// the server too; see the Qwik page of the docs.
export default defineConfig({
  plugins: [qwikVite({ csr: true })],
});
