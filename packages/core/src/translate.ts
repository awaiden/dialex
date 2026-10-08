import type { DictionaryRegistry } from "./index.js";
import { formatMessage, type IcuValues } from "./icu/format.js";

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
 * Function leaves take their own parameters; string leaves optionally take ICU message values:
 * `t("cart.items", { count: 3 })`.
 */
export type TranslationArgs<P extends string> =
  LeafOf<P> extends (...args: infer A) => any ? A : [values?: IcuValues];

export type TranslationResult<P extends string> =
  LeafOf<P> extends (...args: any[]) => infer R ? R : LeafOf<P>;

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
  return ((path: string, ...args: any[]) => {
    const dot = path.indexOf(".");
    const name = dot === -1 ? path : path.slice(0, dot);
    const rest = dot === -1 ? [] : path.slice(dot + 1).split(".");

    let value: any = getDictionary(name);
    for (const segment of rest) {
      if (value == null || typeof value !== "object") {
        value = undefined;
        break;
      }
      value = value[segment];
    }

    if (value === undefined) {
      console.warn(`[dialex] Translation path "${path}" not found.`);
      return path;
    }
    if (typeof value === "function") return value(...args);
    if (typeof value === "string" && isValues(args[0])) {
      try {
        return formatMessage(locale, value, args[0]);
      } catch (error) {
        console.warn(`[dialex] Could not format "${path}": ${(error as Error).message}`);
        return value;
      }
    }
    return value;
  }) as Translate;
}
