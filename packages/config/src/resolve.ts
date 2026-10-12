import path from "node:path";

import { writeArtifact, ARTIFACT_VERSION, type ResolvedConfig } from "./artifact.js";
import { loadConfigObject } from "./load.js";
import {
  applyConfigValues,
  DEFAULT_STATIC_CONFIG,
  readStaticConfig,
  type StaticConfig,
} from "./static.js";

export interface ResolveOptions {
  /**
   * `run` may import the config file, but only when its syntax tree is not enough (a spread, a
   * computed value, an import): a config of plain literals is never executed.
   * `static` only reads the syntax tree and never executes project code.
   */
  mode: "run" | "static";
  /** A config file path, relative to the root, instead of `dialex.config.*`. */
  configFile?: string;
}

const relativeFile = (root: string, file: string | undefined) =>
  file ? path.relative(root, file).split(path.sep).join("/") : null;

function resolveByRunning(root: string, options: ResolveOptions): ResolvedConfig {
  const notes: string[] = [];
  const config: StaticConfig = { ...DEFAULT_STATIC_CONFIG };
  let file: string | undefined;
  let complete = true;

  try {
    const loaded = loadConfigObject(root, options.configFile);
    if (loaded) {
      file = loaded.file;
      applyConfigValues(loaded.config, config, notes);
    }
  } catch (error) {
    // A config that throws is reported and the defaults are used, as the CLI always did
    complete = false;
    notes.push(
      `Could not run ${path.basename(file ?? "the config file")}: ${(error as Error).message}`,
    );
  }

  return {
    version: ARTIFACT_VERSION,
    mode: "run",
    complete,
    file: relativeFile(root, file),
    config,
    notes,
  };
}

function resolveStatically(root: string, options: ResolveOptions): ResolvedConfig {
  const result = readStaticConfig(root, options.configFile);
  return {
    version: ARTIFACT_VERSION,
    mode: "static",
    complete: result.notes.length === 0 && !result.opaque,
    file: relativeFile(root, result.file),
    config: result.config,
    notes: result.notes,
  };
}

/** Resolves the config of a project now, without writing anything. */
export function resolveConfig(root: string, options: ResolveOptions): ResolvedConfig {
  const fromSyntax = resolveStatically(root, options);
  if (options.mode === "static" || fromSyntax.complete) return fromSyntax;
  return resolveByRunning(root, options);
}

/**
 * Resolves the config and writes it to `.dialex/config.json`. Call it before every command that
 * reads that file: there is no freshness check, the file is simply written again.
 */
export function writeConfig(
  root: string,
  options: ResolveOptions,
): { config: ResolvedConfig; file: string } {
  const config = resolveConfig(root, options);
  return { config, file: writeArtifact(root, config) };
}
