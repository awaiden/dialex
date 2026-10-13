import type { loadFile } from "magicast";

import type { AstNode as Node } from "../ast.js";

export const TODO_PREFIX = "[TODO] ";

export interface DictionaryFile {
  file: string;
  /** Dictionary name from `defineDictionary("name", ...)` or the `name` property, if literal. */
  name?: string;
  mod: Awaited<ReturnType<typeof loadFile>>;
  /** The object whose keys are locales. */
  localesObj: Node;
  /** Whether the file ended with a newline when loaded; restored on save. */
  endsWithNewline: boolean;
  /**
   * `false` when part of the dictionary cannot be read statically (spreads, computed keys, or a
   * locale whose content is not an object literal). Leaf lists and parity checks are unreliable
   * for such files.
   */
  complete: boolean;
}

/** A zero-based line/column range, as used by editors. */
export interface SourceRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export type LeafKind = "string" | "function" | "other";

export interface Leaf {
  path: string[];
  kind: LeafKind;
  /** Present when `kind` is `"string"`. */
  value?: string;
}
