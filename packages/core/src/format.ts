export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

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
  const category = new Intl.PluralRules(locale).select(count) as PluralCategory;
  return forms[category] ?? forms.other;
}

export function number(locale: string, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function date(
  locale: string,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function relativeTime(
  locale: string,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
): string {
  return new Intl.RelativeTimeFormat(locale, options).format(value, unit);
}

export function list(
  locale: string,
  values: Iterable<string>,
  options?: Intl.ListFormatOptions,
): string {
  return new Intl.ListFormat(locale, options).format(values);
}

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
