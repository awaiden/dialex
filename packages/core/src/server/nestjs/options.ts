import type { DictionaryDefinition } from "../../core/dictionary.js";
import type { LocaleResolverOptions } from "../../core/resolver.js";

/**
 * Injection token under which `DialexModule` provides its options.
 */
export const DIALEX_OPTIONS = Symbol("DIALEX_OPTIONS");

/**
 * Options of `DialexModule.forRoot`: the shared locale detection options, the dictionaries to read and whether the module is global.
 */
export interface NestDialexOptions extends LocaleResolverOptions {
  /**
   * The dictionaries to read. `{ ...dialex }` from the generated file sets this, so pass your own
   * map or array of `defineDictionary` definitions only when you do not use that file.
   * If neither is given, only dictionaries already registered through `defineDictionary` are found.
   */
  dictionaries?:
    | Record<string, Record<string, any>>
    | (DictionaryDefinition<any, any> | Record<string, any>)[];
  /**
   * Whether the module should be global across all NestJS modules.
   * @default true
   */
  isGlobal?: boolean;
}

/**
 * Options of `DialexModule.forRootAsync`: build the `NestDialexOptions` in `useFactory`, with the providers listed in `inject` available to it.
 */
export interface NestDialexAsyncOptions {
  isGlobal?: boolean;
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<NestDialexOptions> | NestDialexOptions;
  inject?: any[];
}

/** A map of name to dictionary from either a map or an array of `defineDictionary` results. */
export function normalizeDictionaries(
  input?:
    | Record<string, Record<string, any>>
    | (DictionaryDefinition<any, any> | Record<string, any>)[],
): Record<string, Record<string, any>> | undefined {
  if (!input) return undefined;
  if (!Array.isArray(input)) return input;

  const result: Record<string, Record<string, any>> = {};
  for (const item of input) {
    if (item && typeof item === "object") {
      if ("name" in item && "dictionary" in item) {
        result[item.name as string] = item.dictionary as Record<string, any>;
      }
    }
  }
  return result;
}
