import { addImports, addPluginTemplate, addVitePlugin, defineNuxtModule } from "@nuxt/kit";
import { dialexPlugin } from "./vite.js";
import type { DialexConfig } from "./index.js";

export interface NuxtDialexOptions extends DialexConfig {
  /**
   * Cookie used to persist the selected locale.
   * @default "locale"
   */
  cookieName?: string;
}

/**
 * Nuxt module: registers the dialex Vite plugin, installs the Vue plugin with a
 * cookie-backed locale, and auto-imports `useDialex` / `useDictionary`.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ["dialexjs/nuxt"],
 *   dialex: { defaultLocale: "en", locales: ["en", "tr"] },
 * });
 * ```
 */
export default defineNuxtModule<NuxtDialexOptions>({
  meta: { name: "dialex", configKey: "dialex" },
  defaults: { defaultLocale: "en", cookieName: "locale" },
  setup(options: NuxtDialexOptions) {
    const { cookieName, ...config } = options;

    addVitePlugin(dialexPlugin(config));

    addPluginTemplate({
      filename: "dialex.plugin.mjs",
      getContents: () => `
import { defineNuxtPlugin, useCookie } from "#imports";
import { createDialex } from "dialexjs/vue";

export default defineNuxtPlugin((nuxtApp) => {
  const cookie = useCookie(${JSON.stringify(cookieName)}, { sameSite: "lax", path: "/" });
  const dialex = createDialex({
    defaultLocale: cookie.value || ${JSON.stringify(config.defaultLocale ?? "en")},
    onLocaleChange: (locale) => { cookie.value = locale; },
  });
  nuxtApp.vueApp.use(dialex);
});
`,
    });

    addImports([
      { name: "useDialex", from: "dialexjs/vue" },
      { name: "useDictionary", from: "dialexjs/vue" },
    ]);
  },
});
