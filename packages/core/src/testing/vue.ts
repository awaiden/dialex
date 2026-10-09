import { createDialex } from "../vue.js";

/**
 * Vue plugin for component tests: starts in `locale`, with no persistence.
 *
 * Needs the Dialex Vite plugin in your Vitest config, because `useDictionary` reads the plugin's
 * virtual modules.
 *
 * ```ts
 * mount(Header, { global: { plugins: [createTestDialex("tr")] } });
 * ```
 */
export function createTestDialex(locale?: string) {
  return createDialex({ defaultLocale: locale });
}
