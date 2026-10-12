import fs from "node:fs";
import path from "node:path";

import {
  ARTIFACT_VERSION,
  collectInputs,
  isFresh,
  readArtifact,
  writeArtifact,
  type ResolvedConfig,
} from "./artifact.js";
import { loadConfigObject } from "./load.js";
import {
  applyConfigValues,
  configCandidates,
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

const toStatic = (root: string, file: string | undefined) =>
  file ? path.relative(root, file).split(path.sep).join("/") : null;

/** Runs `load` while recording which environment variables it reads. */
function trackEnv<T>(load: () => T): { value: T; env: Record<string, string | null> } {
  const env: Record<string, string | null> = {};
  const original = process.env;
  process.env = new Proxy(original, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof key === "string" && !(key in env)) {
        env[key] = typeof value === "string" ? value : null;
      }
      return value;
    },
  });
  try {
    return { value: load(), env };
  } finally {
    process.env = original;
  }
}

function resolveByRunning(root: string, options: ResolveOptions): ResolvedConfig {
  const notes: string[] = [];
  const config: StaticConfig = { ...DEFAULT_STATIC_CONFIG };
  let files: string[] = [];
  let file: string | undefined;
  let complete = true;

  const { env } = trackEnv(() => {
    try {
      const loaded = loadConfigObject(root, options.configFile);
      if (loaded) {
        file = loaded.file;
        files = loaded.files;
        applyConfigValues(loaded.config, config, notes);
      }
    } catch (error) {
      // A config that throws is reported and the defaults are used, as the CLI always did
      complete = false;
      notes.push(
        `Could not run ${path.basename(file ?? "the config file")}: ${(error as Error).message}`,
      );
    }
  });

  return {
    version: ARTIFACT_VERSION,
    mode: "run",
    complete,
    file: toStatic(root, file),
    config,
    notes,
    inputs: collectInputs(root, files, configCandidates(root, options.configFile), env),
  };
}

function resolveStatically(root: string, options: ResolveOptions): ResolvedConfig {
  const result = readStaticConfig(root, options.configFile);
  const files = result.file ? [result.file] : [];
  return {
    version: ARTIFACT_VERSION,
    mode: "static",
    complete: result.notes.length === 0 && !result.opaque,
    file: toStatic(root, result.file),
    config: result.config,
    notes: result.notes,
    inputs: collectInputs(root, files, configCandidates(root, options.configFile), {}),
  };
}

/** Resolves the config of a project now, without reading or writing the artifact. */
export function resolveConfig(root: string, options: ResolveOptions): ResolvedConfig {
  const fromSyntax = resolveStatically(root, options);
  if (options.mode === "static" || fromSyntax.complete) return fromSyntax;
  return resolveByRunning(root, options);
}

/** Whether `artifact` can serve a caller that asked for `mode`. */
export function satisfies(artifact: ResolvedConfig, mode: ResolveOptions["mode"]): boolean {
  return (
    artifact.mode === mode || (mode === "static" && artifact.mode === "run") || artifact.complete
  );
}

export interface EnsureResult {
  config: ResolvedConfig;
  /** The artifact was already up to date and was not rewritten. */
  reused: boolean;
  file: string;
}

/**
 * The resolved config of a project, from `.dialex/config.json` when it is still fresh and good
 * enough for `mode`, otherwise resolved again and written.
 */
export function ensureConfig(root: string, options: ResolveOptions): EnsureResult {
  const existing = readArtifact(root);
  const file = path.join(root, ".dialex", "config.json");
  if (
    existing &&
    isFresh(root, existing) &&
    satisfies(existing, options.mode) &&
    (options.configFile === undefined ||
      existing.file === toStatic(root, path.resolve(root, options.configFile)))
  ) {
    return { config: existing, reused: true, file };
  }
  const config = resolveConfig(root, options);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeArtifact(root, config);
  return { config, reused: false, file };
}
