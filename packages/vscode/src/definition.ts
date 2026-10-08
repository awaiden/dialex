import { dictionaryLocation, locationOf, type SourceRange } from "@dialexjs/cli/api";
import type { Reference } from "@dialexjs/cli/api";
import { orderedLocales, type ProjectModel } from "./model.js";
import { resolveReference } from "./references.js";

export interface DefinitionTarget {
  file: string;
  range: SourceRange;
}

const START: SourceRange = { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } };

/**
 * Where a reference is defined: the key in the default locale if it has one, otherwise in the
 * first locale that does. A dictionary reference points at the dictionary object.
 */
export function definitionFor(model: ProjectModel, ref: Reference): DefinitionTarget | undefined {
  const resolved = resolveReference(model, ref);
  if (!resolved) return undefined;
  const { dictionary, keyPath } = resolved;
  const { df } = dictionary;
  if (!df) return { file: dictionary.file, range: START };

  if (keyPath.length === 0) {
    return { file: dictionary.file, range: dictionaryLocation(df) ?? START };
  }

  for (const locale of orderedLocales(model, dictionary)) {
    const range = locationOf(df, locale, keyPath);
    if (range) return { file: dictionary.file, range };
  }
  return undefined;
}
