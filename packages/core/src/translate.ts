import { formatMessage, type IcuValues } from "./icu/format.js";
import type { DictionaryRegistry, MessageArguments } from "./index.js";

type Leaf = (...args: any[]) => any;

/** Dot-separated paths to every leaf (string or function) inside a dictionary content type. */
export type PathsOf<T> = T extends Leaf
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends Leaf
          ? K
          : T[K] extends object
            ? [PathsOf<T[K]>] extends [never]
              ? K
              : `${K}.${PathsOf<T[K]>}`
            : K;
      }[keyof T & string]
    : never;

// With an empty registry (before `dialex generate`) every path is a plain string.
// oxlint-disable-next-line typescript(no-redundant-type-constituents)
/**
 * Every valid `t()` path: `dictionary.key.path` for each leaf of each registered dictionary, or any `string` before `dialex generate` has run.
 */
export type TranslationPath = [keyof DictionaryRegistry] extends [never]
  ? string
  : // oxlint-disable-next-line typescript(no-redundant-type-constituents)
    {
      [N in Extract<keyof DictionaryRegistry, string>]: `${N}.${PathsOf<DictionaryRegistry[N]>}`;
    }[Extract<keyof DictionaryRegistry, string>];

type ValueAt<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ValueAt<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type LeafOf<P extends string> = [keyof DictionaryRegistry] extends [never]
  ? any
  : P extends `${infer N}.${infer Rest}`
    ? N extends keyof DictionaryRegistry
      ? ValueAt<DictionaryRegistry[N], Rest>
      : any
    : any;

/**
 * Function leaves take their own parameters. A string leaf with ICU arguments takes exactly those
 * values (`t("cart.items", { count: 3 })`, checked once `dialex generate` has written
 * `MessageArguments`); any other string leaf optionally takes a values object.
 */
export type TranslationArgs<P extends string> =
  LeafOf<P> extends (...args: infer A) => any
    ? A
    : P extends keyof MessageArguments
      ? [values: MessageArguments[P]]
      : [values?: IcuValues];

/**
 * What `t(path)` returns: the string, or the return type of a function leaf.
 */
export type TranslationResult<P extends string> =
  LeafOf<P> extends (...args: any[]) => infer R ? R : LeafOf<P>;

/**
 * The `t("dictionary.key.path", ...args)` function: typed paths, typed arguments and a typed result.
 */
export type Translate = <P extends TranslationPath>(
  path: P,
  ...args: TranslationArgs<P>
) => TranslationResult<P>;

const isValues = (value: unknown): value is IcuValues =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

/**
 * Builds a `t("dictionary.key.path", ...args)` function on top of a `getDictionary(name)`
 * accessor. If the leaf is a function, the extra arguments are forwarded to it. If the leaf is a
 * string and a values object is given, the string is formatted as an ICU message for `locale`
 * (a message that fails to format is reported and returned unchanged, so a bad string never
 * crashes a page). Unknown paths warn and return the path itself.
 */
export function createT(getDictionary: (name: any) => any, locale = "en"): Translate {
  // `arguments` instead of a rest parameter: the common call has one or two arguments, and a rest
  // array would be allocated on each of them.
  return function t(path: string): unknown {
    const parsed = parsePath(path);

    let value: any = getDictionary(parsed.name);
    const segments = parsed.segments;
    for (let i = 0; i < segments.length; i++) {
      if (value == null || typeof value !== "object") {
        value = undefined;
        break;
      }
      value = value[segments[i]];
    }

    if (typeof value === "string") {
      // oxlint-disable-next-line prefer-rest-params
      const values = arguments.length > 1 ? arguments[1] : undefined;
      if (values === undefined || !isValues(values)) return value;
      try {
        return formatMessage(locale, value, values);
      } catch (error) {
        console.warn(`[dialex] Could not format "${path}": ${(error as Error).message}`);
        return value;
      }
    }
    if (typeof value === "function") {
      /* oxlint-disable prefer-rest-params */
      switch (arguments.length) {
        case 1:
          return value();
        case 2:
          return value(arguments[1]);
        case 3:
          return value(arguments[1], arguments[2]);
        default:
          return value.apply(undefined, Array.prototype.slice.call(arguments, 1));
      }
      /* oxlint-enable prefer-rest-params */
    }
    if (value === undefined) {
      console.warn(`[dialex] Translation path "${path}" not found.`);
      return path;
    }
    return value;
  } as Translate;
}

interface ParsedPath {
  name: string;
  segments: string[];
}

const PATH_CACHE_LIMIT = 500;
const pathCache = new Map<string, ParsedPath>();

/** `"home.cart.items"` as the dictionary name and the keys below it, cached by path. */
function parsePath(path: string): ParsedPath {
  let parsed = pathCache.get(path);
  if (!parsed) {
    const dot = path.indexOf(".");
    parsed = {
      name: dot === -1 ? path : path.slice(0, dot),
      segments: dot === -1 ? [] : path.slice(dot + 1).split("."),
    };
    if (pathCache.size >= PATH_CACHE_LIMIT) pathCache.clear();
    pathCache.set(path, parsed);
  }
  return parsed;
}
