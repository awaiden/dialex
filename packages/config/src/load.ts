import fs from "node:fs";
import path from "node:path";

import { loadConfigSync } from "unconfig";

/** What running a config file produced. */
export interface LoadedConfig {
  /** The exported config object, exactly as the file built it (functions and all). */
  config: Record<string, unknown>;
  /** The config file that was run, absolute. */
  file: string;
  /**
   * The config file and the project files it imports, found by reading its import statements.
   * `unconfig` does not report what a config imported, so this is what freshness checks hash.
   */
  files: string[];
}

const RESOLVE_EXTENSIONS = [".ts", ".mts", ".cts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json"];

/** `import x from "./a"`, `import "./a"`, `export * from "./a"`, `import("./a")`, `require("./a")`. */
const RELATIVE_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'](\.{1,2}\/[^"']+|\.{1,2})["']/g;

function resolveRelative(from: string, specifier: string): string | undefined {
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((ext) => base + ext),
    ...RESOLVE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

/** `file` and the project files it imports, directly or not. Packages are not followed. */
export function importedFiles(file: string): string[] {
  const seen = new Set<string>();
  const visit = (current: string) => {
    if (seen.has(current)) return;
    seen.add(current);
    let text: string;
    try {
      text = fs.readFileSync(current, "utf-8");
    } catch {
      return;
    }
    for (const match of text.matchAll(RELATIVE_IMPORT)) {
      const resolved = resolveRelative(current, match[1]);
      if (resolved && !resolved.split(path.sep).includes("node_modules")) visit(resolved);
    }
  };
  visit(file);
  return [...seen];
}

/**
 * Runs the first config file that exists (`dialex.config.*`, then `i18n.config.*`, or
 * `configFile`) with `unconfig` and returns what it exports. **This executes project code.**
 * Returns `undefined` when the project has no config file; throws what the file throws.
 */
export function loadConfigObject(root: string, configFile?: string): LoadedConfig | undefined {
  const sources: any[] = [];
  if (configFile) sources.push({ files: configFile });
  for (const name of ["dialex.config", "i18n.config"]) {
    sources.push({ files: name, extensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "json", ""] });
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
  return { config, file, files: importedFiles(file) };
}
