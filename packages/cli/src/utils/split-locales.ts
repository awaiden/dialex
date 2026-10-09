import { generateCode } from "magicast";

import {
  isObjectNode,
  propertyKeyName,
  unwrapNode,
  type AstNode,
  type DictionaryFile,
} from "./dictionary-edit.js";

export interface LocaleSlice {
  locale: string;
  /** Source of the locale's object, ready for `export default <code>`. */
  code: string;
}

export type SplitResult = { ok: true; slices: LocaleSlice[] } | { ok: false; reason: string };

const SKIPPED_KEYS = new Set([
  "loc",
  "start",
  "end",
  "extra",
  "range",
  "comments",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "tokens",
]);

/** Every identifier name used in a node, except property names that are not variable references. */
function usedNames(node: unknown, found = new Set<string>()): Set<string> {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => usedNames(child, found));
    return found;
  }
  const ast = node as AstNode;
  if (ast.type === "Identifier") found.add(ast.name);

  for (const key of Object.keys(ast)) {
    if (SKIPPED_KEYS.has(key)) continue;
    const isPropertyName =
      key === "key" &&
      !ast.computed &&
      ["ObjectProperty", "ObjectMethod", "TSPropertySignature", "TSMethodSignature"].includes(
        ast.type,
      );
    const isMemberName =
      key === "property" &&
      !ast.computed &&
      (ast.type === "MemberExpression" || ast.type === "OptionalMemberExpression");
    if (isPropertyName || isMemberName) continue;
    usedNames(ast[key], found);
  }
  return found;
}

/** Names bound anywhere in a pattern (`const { a, b: [c] } = ...`). */
function patternNames(pattern: AstNode | undefined, found: Set<string>) {
  if (!pattern) return;
  switch (pattern.type) {
    case "Identifier":
      found.add(pattern.name);
      break;
    case "ObjectPattern":
      for (const prop of pattern.properties) patternNames(prop.value ?? prop.argument, found);
      break;
    case "ArrayPattern":
      for (const element of pattern.elements) patternNames(element ?? undefined, found);
      break;
    case "AssignmentPattern":
      patternNames(pattern.left, found);
      break;
    case "RestElement":
      patternNames(pattern.argument, found);
      break;
  }
}

/** What the file declares or imports at the top level: a locale that uses any of it cannot move. */
function topLevelNames(df: DictionaryFile): Set<string> {
  const names = new Set<string>();
  const program: AstNode = (df.mod as any).$ast;
  const statements: AstNode[] = program?.body ?? program?.program?.body ?? [];
  for (const raw of statements) {
    const statement =
      raw.type === "ExportNamedDeclaration" && raw.declaration ? raw.declaration : raw;
    switch (statement.type) {
      case "ImportDeclaration":
        for (const specifier of statement.specifiers) names.add(specifier.local.name);
        break;
      case "VariableDeclaration":
        for (const declarator of statement.declarations) patternNames(declarator.id, names);
        break;
      case "FunctionDeclaration":
      case "ClassDeclaration":
      case "TSInterfaceDeclaration":
      case "TSTypeAliasDeclaration":
      case "TSEnumDeclaration":
        if (statement.id?.name) names.add(statement.id.name);
        break;
    }
  }
  return names;
}

/**
 * Cuts a dictionary into one self-contained piece per locale, for `lazy: "locale"`.
 *
 * A piece moves to its own file, so it must not depend on anything else in the original file.
 * That is checked conservatively: if a locale uses any name the file imports or declares (even one
 * that is only shadowed), the whole file is left alone. A missed split costs bytes; a wrong split
 * would break the app.
 */
export function splitLocales(df: DictionaryFile): SplitResult {
  if (!df.complete) {
    return { ok: false, reason: "it uses spreads, computed keys or non-literal locale values" };
  }

  const bound = topLevelNames(df);
  const slices: LocaleSlice[] = [];

  for (const prop of df.localesObj.properties as AstNode[]) {
    const locale = propertyKeyName(prop);
    const value = unwrapNode(prop.value);
    if (locale === undefined || !isObjectNode(value)) {
      return { ok: false, reason: "a locale is not an object literal" };
    }
    const clash = [...usedNames(value)].find((name) => bound.has(name));
    if (clash) {
      return {
        ok: false,
        reason: `"${locale}" uses "${clash}", which is defined elsewhere in the file`,
      };
    }
    slices.push({ locale, code: generateCode(value as any).code });
  }

  if (slices.length === 0) return { ok: false, reason: "it defines no locales" };
  return { ok: true, slices };
}
