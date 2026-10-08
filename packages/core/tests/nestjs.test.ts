import "reflect-metadata";
import { describe, expect, it } from "vite-plus/test";
import { lastValueFrom, of, throwError } from "rxjs";
import { I18nModule, I18nService, I18nInterceptor, I18nMiddleware } from "../src/nestjs.js";

describe("NestJS integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  it("configures I18nModule.forRoot", () => {
    const dynamicModule = I18nModule.forRoot({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    expect(dynamicModule.module).toBe(I18nModule);
    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.exports).toEqual([I18nService, I18nInterceptor, I18nMiddleware]);
  });

  it("configures I18nModule.forRootAsync", async () => {
    const dynamicModule = I18nModule.forRootAsync({
      useFactory: () => ({
        defaultLocale: "en",
        locales: ["en", "tr"],
        dictionaries: [homeDict],
      }),
    });

    expect(dynamicModule.module).toBe(I18nModule);
    expect(dynamicModule.global).toBe(true);
  });

  it("I18nService resolves locale and returns dictionary", () => {
    const service = new I18nService({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    expect(service.getDefaultLocale()).toBe("en");
    expect(service.getSupportedLocales()).toEqual(["en", "tr"]);

    const req = {
      headers: { "accept-language": "tr-TR,tr;q=0.9" },
    };

    const locale = service.resolveLocale(req);
    expect(locale).toBe("tr");

    const dict = service.getDictionary("home", locale);
    expect(dict.title).toBe("Hoş Geldiniz");

    const defaultDict = service.getDictionary("home");
    expect(defaultDict.title).toBe("Welcome");
  });

  it("I18nMiddleware attaches locale and getDictionary to request", () => {
    const service = new I18nService({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    const middleware = new I18nMiddleware(service);

    const req: any = {
      headers: { "accept-language": "tr" },
    };
    const res: any = {
      setHeader: (name: string, val: string) => {
        res[name] = val;
      },
    };
    let nextCalled = false;

    middleware.use(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.locale).toBe("tr");
    expect(req.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect(res["Content-Language"]).toBe("tr");
  });

  it("I18nInterceptor resolves the locale before the handler runs", async () => {
    const service = new I18nService({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });
    let release!: () => void;
    service.waitForScan = () => new Promise<void>((resolve) => (release = resolve));

    const req: any = { headers: { "accept-language": "tr" } };
    const res: any = { setHeader: (name: string, val: string) => (res[name] = val) };
    const context: any = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    };
    let seenLocale: string | undefined;
    const next: any = {
      handle: () => {
        seenLocale = req.locale;
        return of("ok");
      },
    };

    const result = lastValueFrom(new I18nInterceptor(service).intercept(context, next));
    await Promise.resolve();
    expect(seenLocale).toBeUndefined();

    release();
    expect(await result).toBe("ok");
    expect(seenLocale).toBe("tr");
    expect(req.getDictionary("home").title).toBe("Hoş Geldiniz");
    expect(res["Content-Language"]).toBe("tr");
  });

  it("I18nInterceptor surfaces setup failures as observable errors", async () => {
    const service = new I18nService({ dictionaries: [homeDict] });
    service.waitForScan = () => Promise.reject(new Error("scan failed"));
    const context: any = {
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    };
    let handled = false;
    const next: any = {
      handle: () => {
        handled = true;
        return throwError(() => new Error("unreachable"));
      },
    };

    await expect(
      lastValueFrom(new I18nInterceptor(service).intercept(context, next)),
    ).rejects.toThrow("scan failed");
    expect(handled).toBe(false);
  });
});
