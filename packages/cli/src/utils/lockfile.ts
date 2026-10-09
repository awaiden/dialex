import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const LOCK_FILE = "dialex.lock.json";

/**
 * Records which version of the source text each translation was made from, so a later edit of the
 * source can be noticed. A translation whose source changed afterwards is *stale*.
 *
 * ```json
 * { "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
 * ```
 *
 * The value is a short hash of the source locale's text at the time. Translations without a
 * record are untracked (for example hand-written ones) and are never reported as stale.
 */
export interface Lockfile {
  version: 1;
  sourceLocale?: string;
  locales: Record<string, Record<string, string>>;
}

export const emptyLock = (sourceLocale?: string): Lockfile => ({
  version: 1,
  ...(sourceLocale ? { sourceLocale } : {}),
  locales: {},
});

export const lockPath = (root: string) => path.join(root, LOCK_FILE);

/** A short, stable fingerprint of a source string. */
export function hashSource(text: string): string {
  return createHash("sha1").update(text).digest("hex").slice(0, 8);
}

/** The lock file, or `undefined` when there is none (or it cannot be read). */
export function readLock(root: string): Lockfile | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(lockPath(root), "utf-8"));
    if (data?.version !== 1 || typeof data.locales !== "object" || data.locales === null) {
      return undefined;
    }
    return {
      version: 1,
      ...(typeof data.sourceLocale === "string" ? { sourceLocale: data.sourceLocale } : {}),
      locales: data.locales,
    };
  } catch {
    return undefined;
  }
}

/** Writes the lock with sorted keys, so it produces small, stable diffs. */
export function writeLock(root: string, lock: Lockfile): void {
  const sorted: Lockfile = {
    version: 1,
    ...(lock.sourceLocale ? { sourceLocale: lock.sourceLocale } : {}),
    locales: Object.fromEntries(
      Object.keys(lock.locales)
        .sort()
        .map((locale) => [
          locale,
          Object.fromEntries(
            Object.entries(lock.locales[locale]).sort(([a], [b]) => a.localeCompare(b)),
          ),
        ]),
    ),
  };
  fs.writeFileSync(lockPath(root), JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

/** Notes that `key` in `locale` was written from this source text. */
export function record(lock: Lockfile, locale: string, key: string, sourceText: string): void {
  (lock.locales[locale] ??= {})[key] = hashSource(sourceText);
}

/**
 * True when `key` was recorded for `locale` from different source text than `sourceText`. A key
 * with no record is not stale.
 */
export function isStale(lock: Lockfile, locale: string, key: string, sourceText: string): boolean {
  const recorded = lock.locales[locale]?.[key];
  return recorded !== undefined && recorded !== hashSource(sourceText);
}

/**
 * The lock to use for a run translating from `sourceLocale`. A lock written from another source
 * locale says nothing about this one, so it is replaced by a fresh one.
 */
export function lockFor(root: string, sourceLocale: string): { lock: Lockfile; replaced: boolean } {
  const existing = readLock(root);
  if (!existing) return { lock: emptyLock(sourceLocale), replaced: false };
  if (existing.sourceLocale && existing.sourceLocale !== sourceLocale) {
    return { lock: emptyLock(sourceLocale), replaced: true };
  }
  existing.sourceLocale = sourceLocale;
  return { lock: existing, replaced: false };
}
