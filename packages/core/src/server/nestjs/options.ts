import type { BaseAdapterOptions } from "../../core/shared.js";

/**
 * Injection token under which `DialexModule` provides its options.
 */
export const DIALEX_OPTIONS = Symbol("DIALEX_OPTIONS");

/**
 * Options of `DialexModule.forRoot`: the shared locale detection options, the dictionaries to read and whether the module is global.
 */
export interface NestDialexOptions extends BaseAdapterOptions {
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

export { normalizeDictionaries } from "../../core/shared.js";
