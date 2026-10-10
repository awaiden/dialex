import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  // React Router keeps its source in `app/`.
  output: "app/dialex.generated.ts",
});
