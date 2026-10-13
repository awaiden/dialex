/**
 * Maps dictionary names to their content types. `dialex generate` augments it in
 * `dialex-env.d.ts`, which is what types `getDictionary("home")` and autocompletes the names.
 * Leave it empty in your own code.
 */
export interface DictionaryRegistry {}

/** A union of names with autocomplete, or any `string` while the registry is empty. */
export type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
/** A registered dictionary name, or any `string` before `dialex generate` has run. */
export type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

/** The content type of the dictionary named `K`, or `any` when it is not registered. */
export type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry
  ? DictionaryRegistry[K]
  : any;
