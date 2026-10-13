import { parseMessage, type IcuNode } from "../../src/core/icu/parse.js";
// The ICU formatter as it was before it was compiled to closures. It is the oracle of
// icu-differential.test.ts: the compiled formatter must return what this returns, or fail the same way.
import { dateTimeFormat, numberFormat, pluralRules } from "../../src/core/intl.js";

export type IcuValue = string | number | boolean | Date | null | undefined;
export type IcuValues = Record<string, IcuValue>;

export class ReferenceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IcuFormatError";
  }
}

const CACHE_LIMIT = 500;
const cache = new Map<string, IcuNode[]>();

function parseCached(message: string): IcuNode[] {
  let nodes = cache.get(message);
  if (!nodes) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    nodes = parseMessage(message);
    cache.set(message, nodes);
  }
  return nodes;
}

const DATE_STYLES = new Set(["short", "medium", "long", "full"]);
const INTEGER: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
const PERCENT: Intl.NumberFormatOptions = { style: "percent" };
const CARDINAL: Intl.PluralRulesOptions = { type: "cardinal" };
const ORDINAL: Intl.PluralRulesOptions = { type: "ordinal" };

function formatNumber(locale: string, value: number, style: string | undefined): string {
  if (style === "integer") return numberFormat(locale, INTEGER).format(value);
  if (style === "percent" || style === "::percent") {
    return numberFormat(locale, PERCENT).format(value);
  }
  if (style?.startsWith("::currency/")) {
    const currency = style.slice("::currency/".length).toUpperCase();
    return numberFormat(locale, { style: "currency", currency }).format(value);
  }
  return numberFormat(locale).format(value);
}

function formatDateTime(
  locale: string,
  value: Date,
  kind: "date" | "time",
  style: string | undefined,
): string {
  const chosen = style && DATE_STYLES.has(style) ? (style as "short") : "medium";
  return dateTimeFormat(
    locale,
    kind === "date" ? { dateStyle: chosen } : { timeStyle: chosen },
  ).format(value);
}

function requireValue(values: IcuValues, name: string): IcuValue {
  if (!(name in values) || values[name] === undefined) {
    throw new ReferenceFormatError(`Missing value for "${name}"`);
  }
  return values[name];
}

function requireNumber(values: IcuValues, name: string): number {
  const value = Number(requireValue(values, name));
  if (!Number.isFinite(value)) throw new ReferenceFormatError(`"${name}" must be a number`);
  return value;
}

function render(
  nodes: IcuNode[],
  locale: string,
  values: IcuValues,
  pound: string | undefined,
): string {
  let out = "";

  for (const node of nodes) {
    switch (node.type) {
      case "literal":
        out += node.value;
        break;
      case "pound":
        out += pound ?? "#";
        break;
      case "argument":
        out += String(requireValue(values, node.name));
        break;
      case "number":
        out += formatNumber(locale, requireNumber(values, node.name), node.style);
        break;
      case "date":
      case "time": {
        const date = new Date(requireValue(values, node.name) as string | number | Date);
        if (Number.isNaN(date.getTime()))
          throw new ReferenceFormatError(`"${node.name}" must be a date`);
        out += formatDateTime(locale, date, node.type, node.style);
        break;
      }
      case "select": {
        const key = String(requireValue(values, node.name));
        out += render(node.options[key] ?? node.options.other, locale, values, pound);
        break;
      }
      case "plural": {
        const n = requireNumber(values, node.name);
        const branch =
          node.options[`=${n}`] ??
          node.options[
            pluralRules(locale, node.ordinal ? ORDINAL : CARDINAL).select(n - node.offset)
          ] ??
          node.options.other;
        out += render(branch, locale, values, numberFormat(locale).format(n - node.offset));
        break;
      }
    }
  }

  return out;
}

/**
 * Formats an ICU message for a locale.
 *
 * ```ts
 * formatMessage("en", "{count, plural, =0 {No items} one {# item} other {# items}}", { count: 3 });
 * // "3 items"
 * ```
 *
 * Throws `IcuSyntaxError` for invalid messages and `IcuFormatError` for missing or invalid values.
 */
export function referenceFormatMessage(
  locale: string,
  message: string | IcuNode[],
  values: IcuValues = {},
): string {
  const nodes = typeof message === "string" ? parseCached(message) : message;
  return render(nodes, locale, values, undefined);
}
