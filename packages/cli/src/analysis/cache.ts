import fs from "node:fs";

import type { AnalysisCache } from "./types.js";

export function createAnalysisCache(): AnalysisCache {
  return { dictionaries: new Map(), sources: new Map(), gitignore: new Map() };
}

/** Forget the cached `.gitignore` rules, for example after a `.gitignore` file changed. */
export function clearGitignore(cache: AnalysisCache): void {
  cache.gitignore.clear();
}

export function stampOf(file: string): string | undefined {
  try {
    const stat = fs.statSync(file);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return undefined;
  }
}
