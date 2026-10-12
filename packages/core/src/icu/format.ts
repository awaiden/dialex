import { dateTimeFormat, formatNumber, numberFormat, pluralCategory } from "../intl.js";
import { parseMessage, type IcuNode } from "./parse.js";

/**
 * A value an ICU argument can take.
 */
export type IcuValue = string | number | boolean | Date | null | undefined;
/**
 * The values passed to `formatMessage`, by argument name.
 */
export type IcuValues = Record<string, IcuValue>;

/**
 * Thrown by `formatMessage` when a value is missing or has the wrong type (for example a non-number for a `plural`).
 */
export class IcuFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IcuFormatError";
  }
}

/**
 * A message turned into a function once, so formatting does not walk the syntax tree again.
 * `usesPound` tells whether the `#` of the enclosing plural appears in it.
 */
type Run = ((locale: string, values: IcuValues, pound?: string) => string) & {
  usesPound?: boolean;
};

const CACHE_LIMIT = 500;
const cache = new Map<string, Run>();
const compiledNodes = new WeakMap<IcuNode[], Run>();

const DATE_STYLES = new Set(["short", "medium", "long", "full"]);
const INTEGER: Intl.NumberFormatOptions = Object.freeze({ maximumFractionDigits: 0 });
const PERCENT: Intl.NumberFormatOptions = Object.freeze({ style: "percent" });

/** The value of an argument; a missing one is an error. */
function valueOf(values: IcuValues, name: string): NonNullable<IcuValue> {
  const value = values[name];
  if (value === undefined) throw new IcuFormatError(`Missing value for "${name}"`);
  return value as NonNullable<IcuValue>;
}

function numberOf(values: IcuValues, name: string): number {
  const value = Number(valueOf(values, name));
  if (!Number.isFinite(value)) throw new IcuFormatError(`"${name}" must be a number`);
  return value;
}

/** The `Intl.NumberFormat` options of a `{n, number, style}` argument. */
function numberOptions(style: string | undefined): Intl.NumberFormatOptions | undefined {
  if (style === "integer") return INTEGER;
  if (style === "percent" || style === "::percent") return PERCENT;
  if (style?.startsWith("::currency/")) {
    return Object.freeze({ style: "currency", currency: style.slice(11).toUpperCase() });
  }
  return undefined;
}

/** Branches by selector. */
function branches(options: Record<string, IcuNode[]>): Map<string, Run> {
  return new Map(Object.entries(options).map(([key, nodes]) => [key, compileNodes(nodes)]));
}

function compileNode(node: IcuNode): Run {
  switch (node.type) {
    case "literal":
      return () => node.value;
    case "pound": {
      const run: Run = (_locale, _values, pound) => pound ?? "#";
      run.usesPound = true;
      return run;
    }
    case "argument": {
      const name = node.name;
      return (_locale, values) => {
        const value = values[name];
        if (typeof value === "string") return value;
        return String(valueOf(values, name));
      };
    }
    case "number": {
      const options = numberOptions(node.style);
      return (locale, values) => numberFormat(locale, options).format(numberOf(values, node.name));
    }
    case "date":
    case "time": {
      const chosen = node.style && DATE_STYLES.has(node.style) ? (node.style as "short") : "medium";
      const options: Intl.DateTimeFormatOptions = Object.freeze(
        node.type === "date" ? { dateStyle: chosen } : { timeStyle: chosen },
      );
      return (locale, values) => {
        const date = new Date(valueOf(values, node.name) as string | number | Date);
        if (Number.isNaN(date.getTime())) {
          throw new IcuFormatError(`"${node.name}" must be a date`);
        }
        return dateTimeFormat(locale, options).format(date);
      };
    }
    case "select": {
      const options = branches(node.options);
      const other = options.get("other")!;
      const run: Run = (locale, values, pound) =>
        (options.get(String(valueOf(values, node.name))) ?? other)(locale, values, pound);
      // a select passes the `#` of its plural through to its branches
      run.usesPound = [...options.values()].some((branch) => branch.usesPound);
      return run;
    }
    case "plural": {
      const ordinal = node.ordinal === true;
      const exact = new Map<number, Run>();
      const options = new Map<string, Run>();
      for (const [key, nodes] of Object.entries(node.options)) {
        const branch = compileNodes(nodes);
        if (!key.startsWith("=")) options.set(key, branch);
        // only the canonical spelling matches (`=1`, not `=1.0`), as the key `=${n}` always did
        else if (String(Number(key.slice(1))) === key.slice(1))
          exact.set(Number(key.slice(1)), branch);
      }
      const other = options.get("other")!;
      const hasExact = exact.size > 0;
      // the branches get the `#` of this plural, so it adds none to an enclosing one
      return (locale, values) => {
        const n = numberOf(values, node.name);
        const shifted = n - node.offset;
        const branch =
          (hasExact ? exact.get(n) : undefined) ??
          options.get(pluralCategory(locale, ordinal, shifted)) ??
          other;
        // `#` is formatted only when the chosen branch uses it
        return branch(locale, values, branch.usesPound ? formatNumber(locale, shifted) : "");
      };
    }
  }
}

function compileNodes(nodes: IcuNode[]): Run {
  // adjacent literals become one string
  const parts: (string | Run)[] = [];
  for (const node of nodes) {
    const last = parts[parts.length - 1];
    if (node.type === "literal" && typeof last === "string")
      parts[parts.length - 1] = last + node.value;
    else parts.push(node.type === "literal" ? node.value : compileNode(node));
  }

  const usesPound = parts.some((part) => typeof part !== "string" && part.usesPound);
  let run: Run;
  if (parts.length === 0) {
    run = () => "";
  } else if (parts.length === 1) {
    const only = parts[0];
    if (typeof only !== "string") return only;
    run = () => only;
  } else if (parts.length === 2) {
    // two parts are never two literals (adjacent ones were merged), so one of them is a function
    const [a, b] = parts;
    if (typeof a === "string")
      run = (locale, values, pound) => a + (b as Run)(locale, values, pound);
    else if (typeof b === "string") run = (locale, values, pound) => a(locale, values, pound) + b;
    else run = (locale, values, pound) => a(locale, values, pound) + b(locale, values, pound);
  } else if (
    parts.length === 3 &&
    typeof parts[0] === "string" &&
    typeof parts[1] !== "string" &&
    typeof parts[2] === "string"
  ) {
    // `Hello, {name}!`
    const [head, middle, tail] = parts as [string, Run, string];
    run = (locale, values, pound) => head + middle(locale, values, pound) + tail;
  } else {
    run = (locale, values, pound) => {
      let out = "";
      for (const part of parts)
        out += typeof part === "string" ? part : part(locale, values, pound);
      return out;
    };
  }
  run.usesPound = usesPound;
  return run;
}

function compileCached(message: string): Run {
  let run = cache.get(message);
  if (!run) {
    // a syntax error is thrown here, and nothing is cached for it
    run = compileNodes(parseMessage(message));
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(message, run);
  }
  return run;
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
export function formatMessage(
  locale: string,
  message: string | IcuNode[],
  values: IcuValues = {},
): string {
  if (typeof message === "string") return compileCached(message)(locale, values, undefined);
  let run = compiledNodes.get(message);
  if (!run) {
    run = compileNodes(message);
    compiledNodes.set(message, run);
  }
  return run(locale, values, undefined);
}
