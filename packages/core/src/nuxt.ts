import { addImports, addPluginTemplate, addVitePlugin, defineNuxtModule } from "@nuxt/kit";
import { i18nPlugin } from "./vite.js";
import type { I18nConfig } from "./index.js";

export interface NuxtI18nOptions extends I18nConfig {
  /**
   * Cookie used to persist the selected locale.
   * @default "locale"
   */
  cookieName?: string;
}

/**
 * Nuxt module: registers the dialex Vite plugin, installs the Vue plugin with a
 * cookie-backed locale, and auto-imports `useI18n` / `useDictionary`.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ["dialex/nuxt"],
 *   dialex: { defaultLocale: "en", locales: ["en", "tr"] },
 * });
 * ```
 */
export default defineNuxtModule<NuxtI18nOptions>({
  meta: { name: "dialex", configKey: "dialex" },
  defaults: { defaultLocale: "en", cookieName: "locale" },
  setup(options: NuxtI18nOptions) {
    const { cookieName, ...config } = options;

    addVitePlugin(i18nPlugin(config));

    addPluginTemplate({
      filename: "dialex.plugin.mjs",
      getContents: () => `
import { defineNuxtPlugin, useCookie } from "#imports";
import { createI18n } from "dialex/vue";

export default defineNuxtPlugin((nuxtApp) => {
  const cookie = useCookie(${JSON.stringify(cookieName)}, { sameSite: "lax", path: "/" });
  const i18n = createI18n({
    defaultLocale: cookie.value || ${JSON.stringify(config.defaultLocale ?? "en")},
    onLocaleChange: (locale) => { cookie.value = locale; },
  });
  nuxtApp.vueApp.use(i18n);
});
`,
    });

    addImports([
      { name: "useI18n", from: "dialex/vue" },
      { name: "useDictionary", from: "dialex/vue" },
    ]);
  },
});
