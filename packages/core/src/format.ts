import {
  dateTimeFormat,
  listFormat,
  numberFormat,
  pluralRules,
  relativeTimeFormat,
} from "./intl.js";

/**
 * The CLDR plural categories a locale can use. English uses `one` and `other`; Arabic and Russian use more.
 */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * The text for each plural category. `other` is required and is the fallback for a missing category.
 */
export type PluralForms<T = string> = { other: T } & Partial<
  Record<Exclude<PluralCategory, "other">, T>
>;

/**
 * Picks the plural form for `count` using the locale's CLDR rules (`Intl.PluralRules`).
 * Falls back to `other` when the locale's category has no matching form.
 *
 * ```ts
 * items: (n: number) => plural("en", n, { one: "1 item", other: `${n} items` })
 * ```
 */
export function plural<T = string>(locale: string, count: number, forms: PluralForms<T>): T {
  const category = pluralRules(locale).select(count) as PluralCategory;
  return forms[category] ?? forms.other;
}

/**
 * Formats a number with `Intl.NumberFormat`. The formatter is cached per locale and options.
 *
 * ```ts
 * number("de", 1234.5); // "1.234,5"
 * number("en", 0.25, { style: "percent" }); // "25%"
 * ```
 */
export function number(locale: string, value: number, options?: Intl.NumberFormatOptions): string {
  return numberFormat(locale, options).format(value);
}

/**
 * Formats a date with `Intl.DateTimeFormat`. `value` may be a `Date`, a timestamp or a date string.
 *
 * ```ts
 * date("en", new Date(2026, 2, 1), { dateStyle: "medium" }); // "Mar 1, 2026"
 * ```
 */
export function date(
  locale: string,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return dateTimeFormat(locale, options).format(new Date(value));
}

/**
 * Formats a distance in time with `Intl.RelativeTimeFormat`.
 *
 * ```ts
 * relativeTime("en", -2, "day"); // "2 days ago"
 * relativeTime("en", 1, "hour", { numeric: "auto" }); // "in 1 hour"
 * ```
 */
export function relativeTime(
  locale: string,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
): string {
  return relativeTimeFormat(locale, options).format(value, unit);
}

/**
 * Formats a list with `Intl.ListFormat`.
 *
 * ```ts
 * list("en", ["a", "b", "c"]); // "a, b, and c"
 * list("de", ["a", "b", "c"]); // "a, b und c"
 * ```
 */
export function list(
  locale: string,
  values: Iterable<string>,
  options?: Intl.ListFormatOptions,
): string {
  return listFormat(locale, options).format(values);
}

/**
 * The formatting helpers of `formatters(locale)`, with the locale already bound.
 */
export interface Formatters {
  plural: <T = string>(count: number, forms: PluralForms<T>) => T;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  relativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ) => string;
  list: (values: Iterable<string>, options?: Intl.ListFormatOptions) => string;
}

/**
 * Returns the formatting helpers pre-bound to a locale.
 *
 * ```ts
 * const f = formatters("tr");
 * f.number(1234.5); // "1.234,5"
 * ```
 */
export function formatters(locale: string): Formatters {
  return {
    plural: (count, forms) => plural(locale, count, forms),
    number: (value, options) => number(locale, value, options),
    date: (value, options) => date(locale, value, options),
    relativeTime: (value, unit, options) => relativeTime(locale, value, unit, options),
    list: (values, options) => list(locale, values, options),
  };
}
