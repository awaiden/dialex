import { createI18n } from "../vue.js";

/**
 * Vue plugin for component tests: starts in `locale`, with no persistence.
 *
 * Needs the Dialex Vite plugin in your Vitest config, because `useDictionary` reads the plugin's
 * virtual modules.
 *
 * ```ts
 * mount(Header, { global: { plugins: [createTestI18n("tr")] } });
 * ```
 */
export function createTestI18n(locale?: string) {
  return createI18n({ defaultLocale: locale });
}
