import { generateCode } from "magicast";

import { findProperty as findProp } from "../ast.js";
import type { AstNode as Node } from "../ast.js";
import { getProp } from "./read.js";
import type { DictionaryFile, SourceRange } from "./types.js";

const toRange = (loc: Node | undefined): SourceRange | undefined =>
  loc
    ? {
        start: { line: loc.start.line - 1, column: loc.start.column },
        end: { line: loc.end.line - 1, column: loc.end.column },
      }
    : undefined;

/**
 * Where a locale (no `path`) or a key within it is written. The range covers the property key, so
 * it is a good place to attach a diagnostic or jump to.
 */
export function locationOf(
  df: DictionaryFile,
  locale: string,
  path: string[] = [],
): SourceRange | undefined {
  const prop = path.length === 0 ? findProp(df.localesObj, locale) : getProp(df, locale, path);
  return toRange((prop?.key ?? prop)?.loc);
}

/** The source text of the dictionary object itself (the object whose keys are locales). */
export function dictionaryLocation(df: DictionaryFile): SourceRange | undefined {
  return toRange(df.localesObj.loc);
}

/** The source code of a leaf's value (a function's source, or a string with its quotes). */
export function getLeafSource(
  df: DictionaryFile,
  locale: string,
  path: string[],
): string | undefined {
  const prop = getProp(df, locale, path);
  if (!prop) return undefined;
  return generateCode((prop.type === "ObjectMethod" ? prop : prop.value) as any).code;
}
