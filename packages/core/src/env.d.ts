declare module "virtual:dialex-dictionaries" {
  const dictionaries: Record<string, Record<string, any>>;
  /** `true` when dictionaries are loaded on demand (`lazy: true`). */
  export const lazy: boolean;
  /** Loads a dictionary and resolves to its locale map; the promise is cached per name. */
  export function loadDictionary(name: string): Promise<Record<string, any> | undefined>;
  export default dictionaries;
}

declare module "virtual:dialex-config" {
  import type { I18nConfig } from "./index.js";
  const config: I18nConfig;
  export default config;
}

declare module "virtual:pregnancy-government-dictionaries" {
  const dictionaries: Record<string, Record<string, any>>;
  export default dictionaries;
}

declare module "virtual:pregnancy-government-config" {
  import type { I18nConfig } from "./index.js";
  const config: I18nConfig;
  export default config;
}
