import type { Rule } from "eslint";
import type { CallExpression, Node } from "estree";

export type CallKind = "dictionary" | "path";

const DICTIONARY_FUNCTIONS = new Set(["getDictionary", "useDictionary", "DialexDictionary"]);

/** Same shape the analyzer accepts for `t("dictionary.key.path")`. */
export const KEY_PATH = /^[\w-]+(?:\.[\w-]+)+$/;

/**
 * Classifies `getDictionary(...)` / `useDictionary(...)` / `@DialexDictionary(...)` and a bare
 * `t(...)`. Method calls such as `i18n.t(...)` are not Dialex references.
 */
export function callKind(node: CallExpression): CallKind | undefined {
  const callee = node.callee;
  if (callee.type !== "Identifier") return undefined;
  if (DICTIONARY_FUNCTIONS.has(callee.name)) return "dictionary";
  if (callee.name === "t") return "path";
  return undefined;
}

/** The text of a string literal or of a template literal without expressions. */
export function staticString(node: Node | undefined | null): string | undefined {
  if (!node) return undefined;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

export function filenameOf(context: Rule.RuleContext): string {
  return context.filename ?? (context as any).getFilename();
}

export function sourceTextOf(context: Rule.RuleContext): string {
  return (context.sourceCode ?? (context as any).getSourceCode()).text;
}

/** Whether `source` is Dialex's own package, which makes a bare `t` ours rather than i18next's. */
export function isDialexModule(source: unknown): boolean {
  return (
    typeof source === "string" &&
    (source === "dialexjs" || source.startsWith("dialexjs/") || source.startsWith("@dialexjs/"))
  );
}
