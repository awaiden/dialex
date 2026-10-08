import path from "node:path";
import type { AnalysisResult, AnalyzedDictionary } from "@dialex/cli/api";

/** What the editor features know about one Dialex project (a folder with its own config). */
export interface ProjectModel {
  root: string;
  defaultLocale: string;
  dictionaries: Map<string, AnalyzedDictionary>;
}

export function buildModel(
  root: string,
  defaultLocale: string,
  result: Pick<AnalysisResult, "dictionaries">,
): ProjectModel {
  return {
    root,
    defaultLocale,
    dictionaries: new Map(result.dictionaries.map((d) => [d.name, d])),
  };
}

/** The model whose root contains `file`, preferring the deepest (nested projects). */
export function modelForFile(
  models: Iterable<ProjectModel>,
  file: string,
): ProjectModel | undefined {
  let best: ProjectModel | undefined;
  for (const model of models) {
    const rel = path.relative(model.root, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    if (!best || model.root.length > best.root.length) best = model;
  }
  return best;
}

/** Locales with the default locale first. */
export function orderedLocales(model: ProjectModel, dictionary: AnalyzedDictionary): string[] {
  return [
    ...dictionary.locales.filter((l) => l === model.defaultLocale),
    ...dictionary.locales.filter((l) => l !== model.defaultLocale),
  ];
}
