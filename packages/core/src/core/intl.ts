// `Intl.*` constructors are expensive (they load locale data), and a formatter is immutable, so one
// instance per locale and options is shared by every call.

const LIMIT = 200;

/**
 * One instance per locale and options: by locale when there are none, by the options object when it
 * is frozen (constants need no key), and by the options' JSON otherwise, since an object that is
 * not frozen may be changed later.
 */
function memoize<O extends object | undefined, T>(
  create: (locale: string, options: O) => T,
): (locale: string, options?: O) => T {
  const keyed = new Map<string, T>();
  const frozen = new WeakMap<object, Map<string, T>>();

  const get = (map: Map<string, T>, key: string, locale: string, options: O): T => {
    let value = map.get(key);
    if (value === undefined) {
      // Option sets come from code, so this stays small; a runaway set is dropped, not kept.
      if (map.size >= LIMIT) map.clear();
      value = create(locale, options);
      map.set(key, value);
    }
    return value;
  };

  return (locale, options) => {
    if (options === undefined) return get(keyed, locale, locale, options as O);
    if (!Object.isFrozen(options)) {
      return get(keyed, `${locale}\0${JSON.stringify(options)}`, locale, options);
    }
    let perLocale = frozen.get(options);
    if (!perLocale) frozen.set(options, (perLocale = new Map()));
    return get(perLocale, locale, locale, options);
  };
}

export const numberFormat = /* @__PURE__ */ memoize<
  Intl.NumberFormatOptions | undefined,
  Intl.NumberFormat
>((locale, options) => new Intl.NumberFormat(locale, options));

export const pluralRules = /* @__PURE__ */ memoize<
  Intl.PluralRulesOptions | undefined,
  Intl.PluralRules
>((locale, options) => new Intl.PluralRules(locale, options));

export const dateTimeFormat = /* @__PURE__ */ memoize<
  Intl.DateTimeFormatOptions | undefined,
  Intl.DateTimeFormat
>((locale, options) => new Intl.DateTimeFormat(locale, options));

export const relativeTimeFormat = /* @__PURE__ */ memoize<
  Intl.RelativeTimeFormatOptions | undefined,
  Intl.RelativeTimeFormat
>((locale, options) => new Intl.RelativeTimeFormat(locale, options));

export const listFormat = /* @__PURE__ */ memoize<
  Intl.ListFormatOptions | undefined,
  Intl.ListFormat
>((locale, options) => new Intl.ListFormat(locale, options));

// The two Intl calls a plural message makes on every call (`PluralRules.select` and the
// `NumberFormat.format` of `#`) cost far more than the rest of the message. Their results for small
// non-negative integers are memoized per locale: the stored value is whatever Intl returned, so it
// is exact for every locale and numbering system, and anything else still goes to Intl.

/** Per locale: the cardinal categories, the ordinal ones and the formatted integers, by number. */
const small = new Map<string, (string | undefined)[][]>();

/** Whether `n` is 0 to 255 (`-0` is not: Intl may tell it apart from 0). */
const isSmall = (n: number): boolean =>
  n >= 0 && n < 256 && (n | 0) === n && (n !== 0 || 1 / n > 0);

/** `new Intl.PluralRules(locale, { type }).select(n)`, memoized for small integers. */
export function pluralCategory(locale: string, ordinal: boolean, n: number): string {
  const options = ordinal ? ORDINAL : CARDINAL;
  if (!isSmall(n)) return pluralRules(locale, options).select(n);
  const table = tables(locale)[+ordinal];
  return (table[n] ??= pluralRules(locale, options).select(n));
}

/** `new Intl.NumberFormat(locale).format(n)`, memoized for small integers. */
export function formatNumber(locale: string, n: number): string {
  if (!isSmall(n)) return numberFormat(locale).format(n);
  return (tables(locale)[2][n] ??= numberFormat(locale).format(n));
}

const CARDINAL: Intl.PluralRulesOptions = Object.freeze({ type: "cardinal" });
const ORDINAL: Intl.PluralRulesOptions = Object.freeze({ type: "ordinal" });

function tables(locale: string): (string | undefined)[][] {
  let found = small.get(locale);
  if (!found) {
    if (small.size >= LIMIT) small.clear();
    small.set(locale, (found = [[], [], []]));
  }
  return found;
}
