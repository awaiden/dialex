import {
  findProperty as findProp,
  isObjectNode as isObject,
  propertyKeyName as keyName,
  unwrapNode as unwrap,
} from "../ast.js";
import type { AstNode as Node } from "../ast.js";
import { isPropLike, leafKind, stringValue } from "./ast-helpers.js";
import type { DictionaryFile, Leaf } from "./types.js";

export function listLocales(df: DictionaryFile): string[] {
  return df.localesObj.properties
    .filter(isPropLike)
    .map(keyName)
    .filter((k: string | undefined): k is string => k !== undefined);
}

export function localeObject(df: DictionaryFile, locale: string): Node | undefined {
  const value = unwrap(findProp(df.localesObj, locale)?.value);
  return isObject(value) ? value : undefined;
}

/** Lists every leaf (string, function, or other value) of a locale, in source order. */
export function listLeaves(df: DictionaryFile, locale: string): Leaf[] {
  const root = localeObject(df, locale);
  if (!root) return [];

  const leaves: Leaf[] = [];
  const walk = (obj: Node, prefix: string[]) => {
    for (const prop of obj.properties) {
      if (!isPropLike(prop)) continue;
      const name = keyName(prop);
      if (name === undefined) continue;
      const path = [...prefix, name];
      const value = prop.type === "ObjectMethod" ? prop : unwrap(prop.value);
      if (isObject(value)) {
        walk(value, path);
      } else {
        const kind = leafKind(value);
        leaves.push({ path, kind, ...(kind === "string" ? { value: stringValue(value) } : {}) });
      }
    }
  };
  walk(root, []);
  return leaves;
}

export function getProp(df: DictionaryFile, locale: string, path: string[]): Node | undefined {
  let obj = localeObject(df, locale);
  for (let i = 0; obj && i < path.length; i++) {
    const prop = findProp(obj, path[i]);
    if (!prop) return undefined;
    if (i === path.length - 1) return prop;
    const next = unwrap(prop.value);
    obj = isObject(next) ? next : undefined;
  }
  return undefined;
}

export function hasPath(df: DictionaryFile, locale: string, path: string[]): boolean {
  return getProp(df, locale, path) !== undefined;
}

export function getString(df: DictionaryFile, locale: string, path: string[]): string | undefined {
  const prop = getProp(df, locale, path);
  return prop && prop.type !== "ObjectMethod" ? stringValue(prop.value) : undefined;
}

/** Leaf paths of a runtime dictionary value (plain objects recurse; everything else is a leaf). */
export function flattenPaths(value: unknown, prefix: string[] = []): string[][] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => flattenPaths(v, [...prefix, k]));
  }
  return prefix.length > 0 ? [prefix] : [];
}
