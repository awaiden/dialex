/**
 * What `defineDictionary` returns: the dictionary's `name` and its content by locale.
 */
export interface DictionaryDefinition<N extends string, T extends Record<string, any>> {
  name: N;
  dictionary: Record<string, T>;
}

/**
 * The registry that `defineDictionary` fills in the current process. Adapters read it when you do not pass `dictionaries` to them.
 */
export const globalDictionaries: Record<string, Record<string, any>> = {};

/**
 * Defines a dictionary and registers it in `globalDictionaries`. Put each one in a `*.content.ts`
 * file; `dialex generate` finds it, compiles it and types it.
 *
 * ```ts
 * export default defineDictionary("home", {
 *   en: { title: "Welcome" },
 *   tr: { title: "Hoş geldiniz" },
 * });
 * ```
 */
export function defineDictionary<N extends string, D extends Record<string, any>>(
  name: N,
  dictionary: D,
): DictionaryDefinition<N, D[keyof D]>;
/**
 * The object form of `defineDictionary`: `defineDictionary({ name: "home", dictionary: { en: {...} } })`.
 */
export function defineDictionary<N extends string, D extends Record<string, any>>(config: {
  name: N;
  dictionary: D;
}): DictionaryDefinition<N, D[keyof D]>;
export function defineDictionary<N extends string, D extends Record<string, any>>(
  nameOrConfig: N | { name: N; dictionary: D },
  maybeDictionary?: D,
): DictionaryDefinition<N, D[keyof D]> {
  if (typeof nameOrConfig === "object" && nameOrConfig !== null) {
    const { name, dictionary } = nameOrConfig;
    globalDictionaries[name] = dictionary as unknown as Record<string, any>;
    return {
      name,
      dictionary: dictionary as unknown as Record<string, D[keyof D]>,
    };
  }

  const name = nameOrConfig;
  const dictionary = maybeDictionary!;
  globalDictionaries[name] = dictionary as unknown as Record<string, any>;
  return {
    name,
    dictionary: dictionary as unknown as Record<string, D[keyof D]>,
  };
}
