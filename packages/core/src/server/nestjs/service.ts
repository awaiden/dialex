import { Inject, Injectable } from "@nestjs/common";

import type { Locales } from "../../core/registry.js";
import { withConfig } from "../../core/resolver.js";
import {
  createGetDictionary,
  normalizeDictionaries,
  resolveRequestLocale,
} from "../../core/shared.js";
import { DIALEX_OPTIONS, type NestDialexOptions } from "./options.js";
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
    const headerKey = (this.options.headerKey || "accept-language").toLowerCase();
    const reqCookies = req?.cookies;
    const cookieHeader =
      reqCookies && typeof reqCookies === "object"
        ? Object.entries(reqCookies)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .map(([k, v]) => `${k}=${v}`)
            .join("; ")
        : typeof req?.headers?.cookie === "string"
          ? req.headers.cookie
          : undefined;

    const rawHeader = req?.headers?.[headerKey];
    const acceptLanguage = Array.isArray(rawHeader) ? rawHeader.join(",") : rawHeader;
    const pathname = req?.path || req?.url;

    return resolveRequestLocale(this.options, {
      custom: typeof this.options.custom === "function" ? this.options.custom(req) : undefined,
      pathname: typeof pathname === "string" ? pathname : undefined,
      query: (key) => {
        const val = req?.query?.[key];
        return typeof val === "string" ? val : undefined;
      },
      cookieHeader,
      acceptLanguage,
    });
  }

  /**
   * Retrieves a dictionary by name for the given locale.
   */
  getDictionary<K extends DictionaryKey, T = ResolveDictionaryType<K>>(
    name: K,
    locale?: Locales,
  ): T {
    const defaultLocale = this.options.defaultLocale || "en";
    return createGetDictionary({
      customDictMap: this.customDictMap,
      locale: (locale as string) || defaultLocale,
      defaultLocale,
      fallbacks: this.options.fallbacks,
      tag: "nestjs",
    })<T>(name as string);
  }
}
