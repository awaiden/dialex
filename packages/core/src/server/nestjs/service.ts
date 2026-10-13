import { Inject, Injectable } from "@nestjs/common";

import { globalDictionaries } from "../../core/dictionary.js";
import type { Locales } from "../../core/registry.js";
import {
  extractCookieLocale,
  extractPathLocale,
  lookupLocale,
  parseAcceptLanguage,
  resolveLocaleFromCandidates,
  withConfig,
} from "../../core/resolver.js";
import { DIALEX_OPTIONS, normalizeDictionaries, type NestDialexOptions } from "./options.js";
import type { DictionaryKey, ResolveDictionaryType } from "./types.js";

/**
 * Injectable i18n service for NestJS applications.
 */
@Injectable()
export class DialexService {
  private customDictMap?: Record<string, Record<string, any>>;

  private options: NestDialexOptions;

  constructor(@Inject(DIALEX_OPTIONS) rawOptions: NestDialexOptions = {}) {
    this.options = withConfig(rawOptions);
    this.customDictMap = normalizeDictionaries(this.options.dictionaries);
  }

  getDefaultLocale(): string {
    return this.options.defaultLocale || "en";
  }

  getSupportedLocales(): string[] {
    return this.options.locales || [];
  }

  /**
   * Resolves the locale from an incoming HTTP request.
   */
  resolveLocale(req: any): Locales {
    const candidates: (string | null | undefined)[] = [];
    const queryKeys = this.options.queryKeys || ["locale", "lang"];
    const queryKeyList = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
    const cookieKeys = this.options.cookieKeys || ["locale", "lang"];
    const cookieKeyList = Array.isArray(cookieKeys) ? cookieKeys : [cookieKeys];
    const headerKey = (this.options.headerKey || "accept-language").toLowerCase();

    // 1. Custom extractor
    if (typeof this.options.custom === "function") {
      candidates.push(this.options.custom(req));
    }

    // 2. URL Path locale (e.g. /tr/api)
    if (this.options.usePath !== false) {
      const pathname = req?.path || req?.url;
      if (typeof pathname === "string") {
        const pVal = extractPathLocale(pathname, this.options.locales);
        if (pVal) candidates.push(pVal);
      }
    }

    // 2. Query params
    if (req?.query) {
      for (const qk of queryKeyList) {
        const val = req.query[qk];
        if (typeof val === "string") candidates.push(val);
      }
    }

    // 3. Cookies
    if (req?.cookies && typeof req.cookies === "object") {
      for (const ck of cookieKeyList) {
        if (typeof req.cookies[ck] === "string") candidates.push(req.cookies[ck]);
      }
    } else if (req?.headers?.cookie && typeof req.headers.cookie === "string") {
      const cVal = extractCookieLocale(req.headers.cookie, cookieKeyList);
      if (cVal) candidates.push(cVal);
    }

    // 4. Accept-Language header
    const rawHeader = req?.headers?.[headerKey];
    const headerStr = Array.isArray(rawHeader) ? rawHeader.join(",") : rawHeader;
    if (headerStr) {
      candidates.push(...parseAcceptLanguage(headerStr));
    }

    return resolveLocaleFromCandidates(
      candidates,
      this.options.locales,
      this.options.defaultLocale || "en",
    ) as Locales;
  }

  /**
   * Retrieves a dictionary by name for the given locale.
   */
  getDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
    name: K,
    locale?: Locales,
  ): T {
    const defaultLocale = this.options.defaultLocale || "en";
    const targetLocale = (locale as string) || defaultLocale;

    const dict = this.customDictMap?.[name as string] || globalDictionaries[name as string];
    if (!dict) {
      console.warn(`[dialex/nestjs] Dictionary "${name as string}" not found.`);
      return {} as T;
    }
    const found = lookupLocale(dict, targetLocale, {
      fallbacks: this.options.fallbacks,
      defaultLocale,
    });
    if (!found) return {} as T;
    if (found.locale !== targetLocale) {
      console.warn(
        `[dialex/nestjs] Locale "${targetLocale}" not found in dictionary "${name as string}", using "${found.locale}".`,
      );
    }
    return found.content as T;
  }
}
