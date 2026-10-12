import fs from "node:fs";
import path from "node:path";

import type { StaticConfig } from "./static.js";

/** Where the resolved config is written, relative to the project root. */
export const ARTIFACT_PATH = path.join(".dialex", "config.json");

/** The version of the file format. The native CLI refuses a format it does not know. */
export const ARTIFACT_VERSION = 1;

/** A file the config depended on, and a hash of what it contained. */
export interface ArtifactInput {
  /** Relative to the project root, with forward slashes. */
  path: string;
  /** FNV-1a 64-bit hash of the file's bytes, in 16 hex digits. */
  hash: string;
}

/**
 * The resolved config, written to `.dialex/config.json`. The native CLI and language server read
 * this instead of parsing or running `dialex.config.*`, so there is one reader of the config.
 */
export interface ResolvedConfig {
  version: typeof ARTIFACT_VERSION;
  /** `run` imported the file; `static` read its syntax tree only (never executes project code). */
  mode: "run" | "static";
  /** Everything was read. Always true for `run`; for `static` false when a value was not a literal. */
  complete: boolean;
  /** The config file the values came from, relative to the root, or `null` when there is none. */
  file: string | null;
  config: StaticConfig;
  /** Things that could not be read, for example `locales: getLocales()`. */
  notes: string[];
  inputs: {
    /** Files read to produce this, including what the config imported. */
    files: ArtifactInput[];
    /** Config file names that did not exist. A new one appearing makes the artifact stale. */
    missing: string[];
    /** Environment variables the config read while it ran, with the value it saw (`null`: unset). */
    env: Record<string, string | null>;
  };
}

/** FNV-1a, 64-bit, over the bytes of a file. Small, dependency-free, and the same in Rust. */
export function hashBytes(bytes: Uint8Array): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

const toRelative = (root: string, file: string) =>
  path.relative(root, file).split(path.sep).join("/");

/** Hashes `files` (absolute paths) and records which of `candidates` do not exist. */
export function collectInputs(
  root: string,
  files: string[],
  candidates: string[],
  env: Record<string, string | null>,
): ResolvedConfig["inputs"] {
  const inputs: ArtifactInput[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    try {
      inputs.push({ path: toRelative(root, file), hash: hashBytes(fs.readFileSync(file)) });
    } catch {
      // vanished while loading: the next freshness check will find it missing
    }
  }
  const missing = candidates
    .filter((c) => !seen.has(c) && !fs.existsSync(c))
    .map((c) => toRelative(root, c));
  return { files: inputs, missing, env };
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

/** Whether the artifact still describes the project: inputs unchanged, none appeared, env equal. */
export function isFresh(root: string, artifact: ResolvedConfig): boolean {
  for (const input of artifact.inputs.files) {
    try {
      const hash = hashBytes(fs.readFileSync(path.join(root, input.path)));
      if (hash !== input.hash) return false;
    } catch {
      return false;
    }
  }
  for (const missing of artifact.inputs.missing) {
    if (fs.existsSync(path.join(root, missing))) return false;
  }
  for (const [name, value] of Object.entries(artifact.inputs.env)) {
    if ((process.env[name] ?? null) !== value) return false;
  }
  return true;
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
