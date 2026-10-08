import fs from "node:fs";
import { loadFile, writeFile, generateCode, parseExpression, parseModule } from "magicast";

/**
 * AST-level helpers for reading and editing `.content.ts` dictionary files.
 *
 * Magicast's proxy layer cannot represent every value (for example template-literal
 * functions), so these helpers work on the underlying AST nodes and use Magicast only
 * to parse and print, which preserves the rest of the file's formatting.
 *
 * Supported shapes:
 * - `export default defineDictionary("name", { en: {...}, tr: {...} })`
 * - `export default defineDictionary({ name: "name", dictionary: { ... } })`
 * - `export default { name: "name", dictionary: { ... } }`
 */

type Node = { type: string; [key: string]: any };

export const TODO_PREFIX = "[TODO] ";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

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

function unwrap(node: Node): Node {
  while (
    node &&
    (node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "ParenthesizedExpression")
  ) {
    node = node.expression;
  }
  return node;
}

const isObject = (node: Node) => node?.type === "ObjectExpression";

function keyName(prop: Node): string | undefined {
  const key = prop?.key;
  if (!key || prop.computed) return undefined;
  if (key.type === "Identifier") return key.name;
  if (key.type === "StringLiteral" || (key.type === "Literal" && typeof key.value === "string")) {
    return key.value;
  }
  if (key.type === "NumericLiteral") return String(key.value);
  return undefined;
}

const isPropLike = (p: Node) =>
  p?.type === "ObjectProperty" || p?.type === "Property" || p?.type === "ObjectMethod";

function findProp(obj: Node, key: string): Node | undefined {
  return obj.properties.find((p: Node) => isPropLike(p) && keyName(p) === key);
}

function stringValue(node: Node): string | undefined {
  node = unwrap(node);
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? undefined;
  }
  return undefined;
}

function leafKind(node: Node): LeafKind {
  node = unwrap(node);
  if (stringValue(node) !== undefined) return "string";
  if (
    node?.type === "ArrowFunctionExpression" ||
    node?.type === "FunctionExpression" ||
    node?.type === "ObjectMethod"
  ) {
    return "function";
  }
  return "other";
}

function dictionaryProp(obj: Node): Node | undefined {
  const prop = findProp(obj, "dictionary");
  const value = unwrap(prop?.value);
  return isObject(value) ? value : undefined;
}

function locateName(declaration: Node): string | undefined {
  const decl = unwrap(declaration);
  if (decl?.type === "CallExpression") {
    const first = unwrap(decl.arguments[0]);
    if (isObject(first)) return stringValue(findProp(first, "name")?.value);
    return stringValue(first);
  }
  if (isObject(decl)) return stringValue(findProp(decl, "name")?.value);
  return undefined;
}

function locateLocalesObject(declaration: Node): Node | undefined {
  const decl = unwrap(declaration);
  if (decl?.type === "CallExpression") {
    const first = unwrap(decl.arguments[0]);
    const second = unwrap(decl.arguments[1]);
    if (isObject(second)) return second;
    if (isObject(first)) return dictionaryProp(first);
    return undefined;
  }
  if (isObject(decl)) return dictionaryProp(decl);
  return undefined;
}

/** Quotes a property key only when it is not a valid identifier. */
function keyCode(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

/** Builds a detached `key: <value>` property node from source text. */
function makeProp(key: string, valueCode: string): Node {
  const expr: Node = parseExpression(`({ ${keyCode(key)}: ${valueCode} })`);
  return expr.$ast.properties[0];
}

function makeStringNode(value: string): Node {
  return makeProp("_", JSON.stringify(value)).value;
}

/**
 * A dictionary is statically readable when every locale is an object literal and no object on the
 * way down uses spreads or computed keys.
 */
function isStaticallyComplete(localesObj: Node): boolean {
  const walk = (obj: Node): boolean =>
    obj.properties.every((prop: Node) => {
      if (!isPropLike(prop) || keyName(prop) === undefined) return false;
      if (prop.type === "ObjectMethod") return true;
      const value = unwrap(prop.value);
      return isObject(value) ? walk(value) : true;
    });

  return localesObj.properties.every((prop: Node) => {
    if (!isPropLike(prop) || keyName(prop) === undefined || prop.type === "ObjectMethod")
      return false;
    const value = unwrap(prop.value);
    return isObject(value) && walk(value);
  });
}

/**
 * Parses dictionary source text (for example an unsaved editor buffer). Returns `undefined` when
 * the file does not have an editable shape; throws on syntax errors.
 */
export function parseDictionaryText(file: string, text: string): DictionaryFile | undefined {
  const mod = parseModule(text);
  const exported: Node = (mod.exports as any).default;
  const ast: Node = exported?.$ast;
  if (!ast) return undefined;
  const declaration = ast.declaration ?? ast;
  const localesObj = locateLocalesObject(declaration);
  return localesObj
    ? {
        file,
        mod,
        localesObj,
        name: locateName(declaration),
        endsWithNewline: text.endsWith("\n"),
        complete: isStaticallyComplete(localesObj),
      }
    : undefined;
}

/** Loads a dictionary file; returns `undefined` when its shape is not editable. */
export async function loadDictionaryFile(file: string): Promise<DictionaryFile | undefined> {
  return parseDictionaryText(file, fs.readFileSync(file, "utf-8"));
}

/** The source text with all edits applied, without writing anything. */
export function renderDictionaryFile(df: DictionaryFile): string {
  const code = generateCode(df.mod as any).code;
  return df.endsWithNewline && !code.endsWith("\n") ? `${code}\n` : code;
}

export async function saveDictionaryFile(df: DictionaryFile): Promise<void> {
  await writeFile(df.mod, df.file);
  if (df.endsWithNewline) {
    const text = fs.readFileSync(df.file, "utf-8");
    if (!text.endsWith("\n")) fs.writeFileSync(df.file, text + "\n", "utf-8");
  }
}

export function listLocales(df: DictionaryFile): string[] {
  return df.localesObj.properties
    .filter(isPropLike)
    .map(keyName)
    .filter((k: string | undefined): k is string => k !== undefined);
}

function localeObject(df: DictionaryFile, locale: string): Node | undefined {
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

function getProp(df: DictionaryFile, locale: string, path: string[]): Node | undefined {
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

/** Leaf paths of a runtime dictionary value (plain objects recurse; everything else is a leaf). */
export function flattenPaths(value: unknown, prefix: string[] = []): string[][] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => flattenPaths(v, [...prefix, k]));
  }
  return prefix.length > 0 ? [prefix] : [];
}

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

// AST helpers shared with the static config reader.
export {
  unwrap as unwrapNode,
  isObject as isObjectNode,
  keyName as propertyKeyName,
  findProp as findProperty,
};
export type { Node as AstNode };
