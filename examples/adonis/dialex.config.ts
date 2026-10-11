import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  // AdonisJS keeps its code in app/, start/ and config/, and imports them through `#start/*`
  output: "start/dialex.generated.ts",
});
