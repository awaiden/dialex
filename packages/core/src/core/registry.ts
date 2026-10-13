/**
 * Augmented in `dialex-env.d.ts` with `locales`, a tuple of your configured locales, which narrows the `Locales` type.
 */
export interface Register {}

/**
 * Augmented by `dialex generate` (in `dialex-env.d.ts`) with the ICU arguments of each message:
 * `{ "cart.items": { count: number } }`. `t("cart.items", { count })` is then type-checked.
 */
export interface MessageArguments {}

/**
 * Maps dictionary names to their content types. `dialex generate` augments it in `dialex-env.d.ts`,
 * which types `getDictionary("home")` and `t("home.title")`. Leave it empty in your own code.
 */
export interface DictionaryRegistry {}

/**
 * A dictionary name: the registered names with autocomplete, or any `string` before `dialex generate` has run.
 */
export type DictionaryKey = [keyof DictionaryRegistry] extends [never]
  ? string
  : // oxlint-disable-next-line typescript(no-redundant-type-constituents)
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    keyof DictionaryRegistry | (string & {});

/**
 * The content type of the dictionary named `K`, or `any` when it is not registered.
 */
export type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry
  ? DictionaryRegistry[K]
  : any;

/**
 * The union of your configured locales (from `dialex-env.d.ts`), or `string` before `dialex generate` has run.
 */
export type Locales = Register extends { locales: infer L }
  ? L extends string
    ? L
    : string
  : string;

/**
 * A dictionary's content for every configured locale, keyed by locale.
 */
export type Dictionary<T extends Record<string, any>> = Record<Locales, T>;
