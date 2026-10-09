import {
  Injectable,
  Inject,
  Module,
  createParamDecorator,
  type DynamicModule,
  type ExecutionContext,
  type NestInterceptor,
  type CallHandler,
  type NestMiddleware,
  type Provider,
} from "@nestjs/common";
import { from, switchMap, type Observable } from "rxjs";

import { globalDictionaries, type DictionaryDefinition, type Locales } from "./index.js";
import { autoScanAndLoadDictionaries } from "./lazy-scanner.js";
import {
  parseAcceptLanguage,
  resolveLocaleFromCandidates,
  extractCookieLocale,
  extractPathLocale,
  lookupLocale,
  type LocaleResolverOptions,
} from "./resolver.js";

export interface DictionaryRegistry {}

type AutocompleteKey<T> = [T] extends [never] ? string : T | (string & {});
type DictionaryKey = AutocompleteKey<keyof DictionaryRegistry>;

type ResolveDictionaryType<K> = K extends keyof DictionaryRegistry ? DictionaryRegistry[K] : any;

export const DIALEX_OPTIONS = Symbol("DIALEX_OPTIONS");

export interface NestDialexOptions extends LocaleResolverOptions {
  /**
   * Optional direct dictionary map or array of defineDictionary definitions.
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

export interface NestDialexAsyncOptions {
  isGlobal?: boolean;
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<NestDialexOptions> | NestDialexOptions;
  inject?: any[];
}

function normalizeDictionaries(
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

/**
 * Injectable i18n service for NestJS applications.
 */
@Injectable()
export class DialexService {
  private customDictMap?: Record<string, Record<string, any>>;
  private scanPromise?: Promise<any>;

  constructor(@Inject(DIALEX_OPTIONS) private options: NestDialexOptions = {}) {
    this.customDictMap = normalizeDictionaries(this.options.dictionaries);
    if (!this.customDictMap) {
      this.scanPromise = autoScanAndLoadDictionaries(process.cwd(), {
        defaultLocale: this.options.defaultLocale || "en",
        locales: this.options.locales,
      });
    }
  }

  hasScanPromise(): boolean {
    return !!this.scanPromise;
  }

  async waitForScan(): Promise<void> {
    if (this.scanPromise) {
      await this.scanPromise;
    }
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

/**
 * NestJS interceptor that automatically attaches resolved locale and dictionary accessor to requests.
 */
@Injectable()
export class DialexInterceptor implements NestInterceptor {
  constructor(private dialexService: DialexService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const run = async () => {
      await this.dialexService.waitForScan();
      const http = context.switchToHttp();
      const req = http.getRequest();
      const res = http.getResponse();

      if (req) {
        const locale = this.dialexService.resolveLocale(req);
        req.locale = locale;
        req.getDictionary = <K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T =>
          this.dialexService.getDictionary(name, locale);

        if (res && typeof res.setHeader === "function") {
          res.setHeader("Content-Language", locale);
        }
      }
    };

    // Finish locale resolution before the handler runs; failures reach Nest's exception pipeline
    return from(run()).pipe(switchMap(() => next.handle()));
  }
}

/**
 * NestJS middleware that attaches resolved locale and dictionary accessor to requests.
 */
@Injectable()
export class DialexMiddleware implements NestMiddleware {
  constructor(private dialexService: DialexService) {}

  use(req: any, res: any, next: (error?: any) => void) {
    const handle = () => {
      if (req) {
        const locale = this.dialexService.resolveLocale(req);
        req.locale = locale;
        req.getDictionary = <K extends DictionaryKey, T = ResolveDictionaryType<K>>(name: K): T =>
          this.dialexService.getDictionary(name, locale);

        if (res && typeof res.setHeader === "function") {
          res.setHeader("Content-Language", locale);
        }
      }
      next();
    };

    if (this.dialexService.hasScanPromise()) {
      this.dialexService.waitForScan().then(handle).catch(next);
    } else {
      handle();
    }
  }
}

/**
 * Parameter decorator that extracts the resolved locale from the request.
 */
export const DialexLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Locales => {
    const req = ctx.switchToHttp().getRequest();
    return req?.locale || "en";
  },
);

/**
 * Parameter decorator that injects the resolved dictionary into a controller parameter.
 */
export const DialexDictionary = createParamDecorator(
  (dictionaryName: string, ctx: ExecutionContext): any => {
    const req = ctx.switchToHttp().getRequest();
    if (typeof req?.getDictionary === "function") {
      return req.getDictionary(dictionaryName);
    }
    return undefined;
  },
);

/**
 * NestJS dynamic module for dialex i18n.
 */
@Module({})
export class DialexModule {
  static forRoot(options: NestDialexOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DIALEX_OPTIONS,
        useValue: options,
      },
      DialexService,
      DialexInterceptor,
      DialexMiddleware,
    ];

    return {
      module: DialexModule,
      global: options.isGlobal ?? true,
      providers,
      exports: [DialexService, DialexInterceptor, DialexMiddleware],
    };
  }

  static forRootAsync(asyncOptions: NestDialexAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DIALEX_OPTIONS,
        useFactory: asyncOptions.useFactory || (() => ({})),
        inject: asyncOptions.inject || [],
      },
      DialexService,
      DialexInterceptor,
      DialexMiddleware,
    ];

    return {
      module: DialexModule,
      global: asyncOptions.isGlobal ?? true,
      imports: asyncOptions.imports || [],
      providers,
      exports: [DialexService, DialexInterceptor, DialexMiddleware],
    };
  }
}
