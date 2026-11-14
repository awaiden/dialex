import { loadConfigSync } from "unconfig";

import { CONFIG_EXTENSIONS, CONFIG_NAMES } from "./static-config.js";

/** What running a config file produced. */
export interface LoadedConfig {
  /** The exported config object, exactly as the file built it (functions and all). */
  config: Record<string, unknown>;
  /** The config file that was run, absolute. */
  file: string;
}

/**
 * Runs the first config file that exists (`dialex.config.*`, then `i18n.config.*`, or
 * `configFile`) with `unconfig` and returns what it exports. **This executes project code.**
 * Returns `undefined` when the project has no config file; throws what the file throws.
 */
export function loadConfigObject(root: string, configFile?: string): LoadedConfig | undefined {
  const sources: any[] = [];
  if (configFile) sources.push({ files: configFile });
  for (const name of CONFIG_NAMES) {
    sources.push({ files: name, extensions: [...CONFIG_EXTENSIONS, ""] });
  }

  const result = loadConfigSync<Record<string, unknown>>({
    sources,
    merge: false,
    defaults: {},
    cwd: root,
  });
  const file = result?.sources?.[0];
  if (!file) return undefined;

  const config = result.config && typeof result.config === "object" ? result.config : {};
  return { config, file };
}
