import path from "node:path";

import { parseDictionaryText } from "../utils/dictionary/index.js";
import {
  cachedDictionary,
  cachedDictionaryStatic,
  fromParsed,
  UNANALYZABLE,
} from "./load-dictionary.js";
import { analysisSteps } from "./steps.js";
import type { AnalysisOptions, AnalysisResult } from "./types.js";

/**
 * Project analysis shared by `dialex check` and the editor extension.
 *
 * It reads dictionaries from the syntax tree, so it never runs project code. Dictionaries that
 * cannot be read that way (spreads, computed keys, imported values) are skipped with an `info`
 * issue, unless `runtime: true` is passed, in which case they are imported and read from the
 * evaluated module (the CLI does this; editors must not).
 */

export type {
  AnalysisCache,
  AnalysisConfig,
  AnalysisIssue,
  AnalysisOptions,
  AnalysisResult,
  AnalyzedDictionary,
  IssueCode,
  IssueLevel,
  LeafInfo,
  LintSetting,
  Reference,
} from "./types.js";
export { clearGitignore, createAnalysisCache } from "./cache.js";
export { DEFAULT_SOURCE_GLOB, scanReferences, scanText } from "./source-scan.js";

/** Analyzes a project. With `runtime: true`, dictionaries the syntax tree cannot describe are imported. */
export async function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult> {
  const steps = analysisSteps(options);
  let step = steps.next();
  while (!step.done) {
    const { file, runtime, cache, text } = step.value;
    step = steps.next(
      text === undefined
        ? await cachedDictionary(file, runtime, cache)
        : (fromParsed(() => parseDictionaryText(file, text)) ?? UNANALYZABLE),
    );
  }
  return step.value;
}

/**
 * `analyzeProject` for callers that cannot await, such as lint rules. Reads dictionaries from the
 * syntax tree only: `runtime` is ignored, so project code is never executed.
 */
export function analyzeProjectSync(options: AnalysisOptions): AnalysisResult {
  const steps = analysisSteps({ ...options, runtime: false });
  let step = steps.next();
  while (!step.done) {
    const { file, cache, text } = step.value;
    step = steps.next(
      text === undefined
        ? cachedDictionaryStatic(file, cache)
        : (fromParsed(() => parseDictionaryText(file, text)) ?? UNANALYZABLE),
    );
  }
  return step.value;
}

/** Project root-relative path with forward slashes, for display. */
export function relativeFile(root: string, file: string): string {
  return path.relative(root, file);
}
