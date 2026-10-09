import fs from "node:fs";
import path from "node:path";

import { addImports, addPluginTemplate, defineNuxtModule } from "@nuxt/kit";

import type { DialexConfig } from "./index.js";

export interface NuxtDialexOptions extends DialexConfig {
  /**
   * Cookie used to persist the selected locale.
   * @default "locale"
   */
  cookieName?: string;
  /**
   * Path of the file `dx generate` writes, without the extension. Found automatically in the
   * source directory, the project root or `src/` when omitted.
   */
  generated?: string;
}

function findGenerated(candidates: string[]): string | undefined {
  return candidates.find((base) => fs.existsSync(`${base}.ts`) || fs.existsSync(`${base}.js`));
}

/**
 * Nuxt module: installs the Vue plugin with a cookie-backed locale, using the dictionaries and
 * config from `dialex.generated.ts`, and auto-imports `useDialex` / `useDictionary`.
 *
 * Run `dx generate` first (`dx generate --watch` while developing); the module reads the file
 * it writes.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({ modules: ["dialexjs/nuxt"] });
 * ```
 */
export default defineNuxtModule<NuxtDialexOptions>({
  meta: { name: "dialex", configKey: "dialex" },
  defaults: { cookieName: "locale" },
  setup(options: NuxtDialexOptions, nuxt: { options: { rootDir: string; srcDir: string } }) {
    const { cookieName, generated } = options;

    const root = nuxt.options.rootDir;
    const found = generated
      ? path.resolve(root, generated)
      : findGenerated([
          path.join(nuxt.options.srcDir, "dialex.generated"),
          path.join(root, "dialex.generated"),
          path.join(root, "src", "dialex.generated"),
        ]);
    if (!found) {
      throw new Error(
        "[dialex] Cannot find dialex.generated.ts. Run `dx generate` (or `dx init`) in your project, " +
          "or set `dialex.generated` in nuxt.config.ts.",
      );
    }
    const generatedImport = found.replace(/\\/g, "/").replace(/\.(ts|js)$/, "");

    addPluginTemplate({
      filename: "dialex.plugin.mjs",
      getContents: () => `
import { defineNuxtPlugin, useCookie } from "#imports";
import { createDialex } from "dialexjs/vue";
import { dialex } from ${JSON.stringify(generatedImport)};

export default defineNuxtPlugin((nuxtApp) => {
  const cookie = useCookie(${JSON.stringify(cookieName)}, { sameSite: "lax", path: "/" });
  const instance = createDialex({
    ...dialex,
    defaultLocale: cookie.value || undefined,
    onLocaleChange: (locale) => { cookie.value = locale; },
  });
  nuxtApp.vueApp.use(instance);
});
`,
    });

    addImports([
      { name: "useDialex", from: "dialexjs/vue" },
      { name: "useDictionary", from: "dialexjs/vue" },
    ]);
  },
});
