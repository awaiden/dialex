import type { IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
  internationalization: { locales: ["en"], defaultLocale: "en" },
  content: { contentDir: ["./content"], watch: false },
};

export default config;
