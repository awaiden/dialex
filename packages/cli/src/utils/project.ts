import path from "node:path";

import type { DialexConfig } from "dialexjs";
import { resolveDialexConfig } from "dialexjs/scanner";
import fg from "fast-glob";

import { loadDictionaryFile, type DictionaryFile } from "./dictionary-edit.js";
import { readStaticConfig } from "./static-config.js";

export interface ProjectDictionary {
  /** Path relative to the project root. */
  rel: string;
  name: string;
  df: DictionaryFile;
}

export interface Project {
  root: string;
  config: DialexConfig;
  dictionaries: ProjectDictionary[];
  /** Dictionary files that could not be parsed into an editable shape. */
  unsupported: string[];
  /** Config values that could not be read statically (static loading only). */
  notes: string[];
}

async function loadDictionaries(root: string, config: DialexConfig) {
  const include = config.include || "**/*.content.ts";
  const files = fg.sync(include, {
    cwd: root,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/dialex.locales/**"],
  });

  const dictionaries: ProjectDictionary[] = [];
  const unsupported: string[] = [];

  for (const file of files) {
    const rel = path.relative(root, file);
    try {
      const df = await loadDictionaryFile(file);
      if (!df || !df.name) unsupported.push(rel);
      else dictionaries.push({ rel, name: df.name, df });
    } catch {
      unsupported.push(rel); // syntax error: reported by the analysis, nothing to edit here
    }
  }

  return { dictionaries, unsupported };
}

/**
 * Resolves the config (running `dialex.config.*` through the loader, which executes it) and loads
 * every dictionary file for AST-level reading and editing.
 */
export async function loadProject(root: string, configFile?: string): Promise<Project> {
  const config = resolveDialexConfig(root, configFile ? { configFile } : {});
  return { root, config, notes: [], ...(await loadDictionaries(root, config)) };
}

/**
 * Like `loadProject`, but reads the config from the syntax tree without executing it. Use this in
 * editors and anywhere project code must not run.
 */
export async function loadStaticProject(root: string, configFile?: string): Promise<Project> {
  const { config, notes } = readStaticConfig(root, configFile);
  return { root, config, notes, ...(await loadDictionaries(root, config)) };
}

/** `home` + `["nav", "about"]` -> `home.nav.about` */
export const toKey = (dictionary: string, keyPath: string[]) => [dictionary, ...keyPath].join(".");
