import fs from "node:fs";
import path from "node:path";

import type { StaticConfig } from "./static.js";

/** Where the resolved config is written, relative to the project root. */
export const ARTIFACT_PATH = path.join(".dialex", "config.json");

/** The version of the file format. The native CLI refuses a format it does not know. */
export const ARTIFACT_VERSION = 1;

/**
 * The resolved config, written to `.dialex/config.json` before a command reads it. The native
 * CLI and language server read this instead of parsing or running `dialex.config.*`, so there is
 * one reader of the config. It is written again for every command, so it is never stale.
 */
export interface ResolvedConfig {
  version: typeof ARTIFACT_VERSION;
  /**
   * `run` imported the file; `static` read its syntax tree only. A config of plain literals is
   * read as `static` even when asked to run, because nothing needs executing.
   */
  mode: "run" | "static";
  /** Everything was read. For `static`, false when a value was not a literal. */
  complete: boolean;
  /** The config file the values came from, relative to the root, or `null` when there is none. */
  file: string | null;
  config: StaticConfig;
  /** Things that could not be read, for example `locales: getLocales()`. */
  notes: string[];
}

/** Reads `.dialex/config.json`, or `undefined` when it is absent, unreadable or another format. */
export function readArtifact(root: string): ResolvedConfig | undefined {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(root, ARTIFACT_PATH), "utf-8"));
    return value?.version === ARTIFACT_VERSION ? (value as ResolvedConfig) : undefined;
  } catch {
    return undefined;
  }
}

/** Writes the artifact atomically, so a reader never sees a half-written file. */
export function writeArtifact(root: string, artifact: ResolvedConfig): string {
  const file = path.join(root, ARTIFACT_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(artifact, null, 2)}\n`, "utf-8");
  fs.renameSync(temporary, file);
  return file;
}
