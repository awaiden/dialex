import { generateCode, parseExpression } from "magicast";

import {
  findProperty as findProp,
  isObjectNode as isObject,
  unwrapNode as unwrap,
} from "../ast.js";
import type { AstNode as Node } from "../ast.js";
import { leafKind, makeProp, makeStringNode, stringValue } from "./ast-helpers.js";
import { getProp, hasPath, localeObject } from "./read.js";
import type { DictionaryFile } from "./types.js";

function ensureLocale(df: DictionaryFile, locale: string): Node {
  let obj = localeObject(df, locale);
  if (!obj) {
    const prop = makeProp(locale, "{}");
    df.localesObj.properties.push(prop);
    obj = prop.value as Node;
  }
  return obj;
}

/** Returns the object that should contain the last path segment, creating objects as needed. */
function ensureParent(df: DictionaryFile, locale: string, path: string[]): Node | undefined {
  let obj = ensureLocale(df, locale);
  for (const segment of path.slice(0, -1)) {
    let prop = findProp(obj, segment);
    if (!prop) {
      prop = makeProp(segment, "{}");
      obj.properties.push(prop);
    }
    const next = unwrap(prop.value);
    if (!isObject(next)) return undefined;
    obj = next;
  }
  return obj;
}

export type SetResult = "created" | "updated" | "skipped";

/**
 * Sets a string value at `path`. Existing function or non-string values are left alone
 * (`"skipped"`) because they cannot be translated as plain text.
 */
export function setString(
  df: DictionaryFile,
  locale: string,
  path: string[],
  value: string,
): SetResult {
  const parent = ensureParent(df, locale, path);
  if (!parent) return "skipped";

  const last = path[path.length - 1];
  const existing = findProp(parent, last);
  if (existing) {
    if (existing.type === "ObjectMethod" || leafKind(existing.value) !== "string") {
      return "skipped";
    }
    existing.value = makeStringNode(value);
    return "updated";
  }
  parent.properties.push(makeProp(last, JSON.stringify(value)));
  return "created";
}

/**
 * Copies the leaf at `path` from one locale to another. String values can be rewritten with
 * `mapString` (for example to add a `[TODO]` marker); other values are copied verbatim.
 * Returns `false` when the source has no such leaf or the target already has one.
 */
export function copyLeaf(
  df: DictionaryFile,
  fromLocale: string,
  toLocale: string,
  path: string[],
  mapString?: (value: string) => string,
): boolean {
  const source = getProp(df, fromLocale, path);
  if (!source || hasPath(df, toLocale, path)) return false;

  const parent = ensureParent(df, toLocale, path);
  if (!parent) return false;

  const last = path[path.length - 1];
  const text = source.type === "ObjectMethod" ? undefined : stringValue(source.value);
  if (text !== undefined && mapString) {
    parent.properties.push(makeProp(last, JSON.stringify(mapString(text))));
  } else {
    const code = generateCode(source as any).code;
    const expr: Node = parseExpression(`({ ${code} })`);
    parent.properties.push(expr.$ast.properties[0]);
  }
  return true;
}
