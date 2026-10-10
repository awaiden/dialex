import fs from "node:fs";
import path from "node:path";

import { parseModule } from "magicast";

import {
  findProperty,
  isObjectNode,
  propertyKeyName,
  unwrapNode,
  type AstNode,
} from "./dictionary-edit.js";

/**
 * The parts of `dialex.config` that tooling needs, read **without running the file**. Editors must
 * not execute workspace code (it may be untrusted), so values are read from the syntax tree and
 * only literals are understood.
 */
export interface StaticConfig {
  defaultLocale: string;
  locales: string[];
  include: string | string[];
  exclude: string[];
  fallbacks: Record<string, string[]>;
  prefixDefault: boolean;
  lazy: boolean | "locale";
}

export interface StaticConfigResult {
  config: StaticConfig;
  /** The file the values came from, if any. */
  file?: string;
  /** Things that could not be read statically, for example `locales: getLocales()`. */
  notes: string[];
}

const CONFIG_NAMES = ["dialex.config", "i18n.config"];
const EXTENSIONS = ["ts", "mts", "cts", "js", "mjs", "cjs", "json"];

export const DEFAULT_STATIC_CONFIG: StaticConfig = {
  defaultLocale: "en",
  locales: [],
  include: "**/*.content.ts",
  exclude: [],
  fallbacks: {},
  prefixDefault: true,
  lazy: false,
};

const NOT_LITERAL = Symbol("not literal");

function literal(node: AstNode | undefined): unknown {
  node = unwrapNode(node as AstNode);
  switch (node?.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "Literal":
      return node.value;
    case "TemplateLiteral":
      return node.expressions.length === 0 ? (node.quasis[0]?.value?.cooked ?? "") : NOT_LITERAL;
    case "ArrayExpression": {
      const items = node.elements.map((e: AstNode) => literal(e));
      return items.includes(NOT_LITERAL) ? NOT_LITERAL : items;
    }
    case "ObjectExpression": {
      const result: Record<string, unknown> = {};
      for (const prop of node.properties) {
        const key = propertyKeyName(prop);
        const value = key === undefined ? NOT_LITERAL : literal(prop.value);
        if (value === NOT_LITERAL) return NOT_LITERAL;
        result[key as string] = value;
      }
      return result;
    }
    default:
      return NOT_LITERAL;
  }
}

/** The object literal passed to `defineConfig({...})`, or exported directly. */
function findConfigObject(declaration: AstNode): AstNode | undefined {
  const node = unwrapNode(declaration);
  if (node?.type === "CallExpression") return findConfigObject(node.arguments[0]);
  return isObjectNode(node) ? node : undefined;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

function apply(object: Record<string, unknown>, config: StaticConfig, notes: string[]) {
  const accept = <K extends keyof StaticConfig>(
    key: K,
    valid: (value: unknown) => boolean,
    expected: string,
  ) => {
    if (!(key in object)) return;
    const value = object[key];
    if (valid(value)) (config as any)[key] = value;
    else notes.push(`"${key}" could not be read statically (expected ${expected}).`);
  };

  accept("defaultLocale", (v) => typeof v === "string" && v !== "", "a string literal");
  accept("locales", isStringArray, "an array of string literals");
  accept(
    "include",
    (v) => typeof v === "string" || isStringArray(v),
    "a string or array of strings",
  );
  accept("exclude", isStringArray, "an array of string literals");
  accept(
    "fallbacks",
    (v) =>
      typeof v === "object" && v !== null && Object.values(v).every((list) => isStringArray(list)),
    "an object of string arrays",
  );
  accept("prefixDefault", (v) => typeof v === "boolean", "true or false");
  accept("lazy", (v) => typeof v === "boolean" || v === "locale", 'true, false or "locale"');
}

/** Reads a config file's source text. Exposed for tests and for unsaved buffers. */
export function parseStaticConfig(text: string, file = "dialex.config.ts"): StaticConfigResult {
  const notes: string[] = [];
  const config: StaticConfig = { ...DEFAULT_STATIC_CONFIG };

  if (file.endsWith(".json")) {
    try {
      const data = JSON.parse(text);
      if (data && typeof data === "object") apply(data, config, notes);
    } catch (error) {
      notes.push(`Could not parse ${path.basename(file)}: ${(error as Error).message}`);
    }
    return { config, file, notes };
  }

  try {
    const exported = (parseModule(text).exports as any).default;
    const object = findConfigObject(exported?.$ast?.declaration ?? exported?.$ast);
    if (!object) {
      notes.push(`${path.basename(file)} does not export a config object literal.`);
    } else {
      const values: Record<string, unknown> = {};
      for (const key of [
        "defaultLocale",
        "locales",
        "include",
        "exclude",
        "fallbacks",
        "prefixDefault",
        "lazy",
      ]) {
        const prop = findProperty(object, key);
        if (!prop) continue;
        const value = literal(prop.value);
        if (value === NOT_LITERAL)
          notes.push(`"${key}" could not be read statically (not a literal).`);
        else values[key] = value;
      }
      apply(values, config, notes);
    }
  } catch (error) {
    notes.push(`Could not parse ${path.basename(file)}: ${(error as Error).message}`);
  }

  return { config, file, notes };
}

/** Reads `dialex.config.*` (or `i18n.config.*`) from `root`, or from `configFile` if given. */
export function readStaticConfig(root: string, configFile?: string): StaticConfigResult {
  const candidates = configFile
    ? [path.resolve(root, configFile)]
    : CONFIG_NAMES.flatMap((name) => EXTENSIONS.map((ext) => path.join(root, `${name}.${ext}`)));

  for (const file of candidates) {
    if (fs.existsSync(file)) return parseStaticConfig(fs.readFileSync(file, "utf-8"), file);
  }
  return { config: { ...DEFAULT_STATIC_CONFIG }, notes: [] };
}
