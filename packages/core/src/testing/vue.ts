import { createDialex } from "../client/vue.js";
import type { DialexSource } from "../index.js";

/**
 * Vue plugin for component tests: starts in `locale`, with no persistence. Pass the generated
 * `dialex` export (or your own `dictionaries`) as the second argument.
 *
 * ```ts
 * import { dialex } from "../dialex.generated";
 * mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
 * ```
 */
export function createTestDialex(locale?: string, source: DialexSource = {}) {
  return createDialex({ ...source, defaultLocale: locale });
}
