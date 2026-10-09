// @vitest-environment jsdom
import "@angular/compiler";
import { InjectionToken, computed, inject, runInInjectionContext } from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  injectDictionary,
  injectDialex,
  injectT,
  provideDialex,
  type AngularDialexOptions,
} from "../src/angular.js";

const dictionaries = [
  {
    name: "home",
    dictionary: {
      en: {
        title: "Welcome",
        items: "{count, plural, one {# item} other {# items}}",
        greet: (n: string) => `Hi ${n}`,
      },
      tr: {
        title: "Hoş Geldiniz",
        items: "{count, plural, other {# ürün}}",
        greet: (n: string) => `Selam ${n}`,
      },
      es: {
        title: "Bienvenido",
        items: "{count, plural, one {# artículo} other {# artículos}}",
        greet: (n: string) => `Hola ${n}`,
      },
    },
  },
];

type App = Awaited<ReturnType<typeof createApplication>>;
const apps: App[] = [];

const start = async (options: Partial<AngularDialexOptions> = {}, extra: any[] = []) => {
  const app = await createApplication({
    providers: [
      provideDialex({ dictionaries, defaultLocale: "en", persist: false, ...options }),
      ...extra,
    ],
  });
  apps.push(app);
  return app;
};
const inContext = <T>(app: App, fn: () => T) => runInInjectionContext(app.injector, fn);

/** Runs the application's render cycle so `afterNextRender` callbacks fire. */
const render = async (app: App) => {
  app.tick();
  await new Promise((resolve) => setTimeout(resolve, 20));
};

const clearStorage = () => {
  document.cookie = "locale=; max-age=0; path=/";
  document.cookie = "lng=; max-age=0; path=/";
  localStorage.clear();
  document.documentElement.lang = "";
};
beforeEach(clearStorage);
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy();
  clearStorage();
});

describe("provideDialex", () => {
  it("exposes the locale, dictionary, and t as signals and functions", async () => {
    const app = await start();
    const dialex = inContext(app, () => injectDialex());

    expect(dialex.locale()).toBe("en");
    expect(dialex.dictionary("home")().title).toBe("Welcome");
    expect((dialex.t as any)("home.title")).toBe("Welcome");
    expect((dialex.t as any)("home.greet", "Ada")).toBe("Hi Ada");
    expect((dialex.t as any)("home.items", { count: 3 })).toBe("3 items");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches locale: signals, t, ICU formatting, <html lang>", async () => {
    const app = await start();
    const { store, title, t } = inContext(app, () => ({
      store: injectDialex(),
      title: injectDictionary("home"),
      t: injectT() as any,
    }));
    const label = computed(() => t("home.items", { count: 3 })); // like a template binding

    expect(title().title).toBe("Welcome");
    expect(label()).toBe("3 items");

    store.setLocale("tr");
    expect(store.locale()).toBe("tr");
    expect(title().title).toBe("Hoş Geldiniz");
    expect(label()).toBe("3 ürün");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("follows fallback chains and region truncation", async () => {
    const app = await start({ fallbacks: { pt: ["es"] } });
    const { store, title } = inContext(app, () => ({
      store: injectDialex(),
      title: injectDictionary("home"),
    }));

    store.setLocale("pt");
    expect(title().title).toBe("Bienvenido");
    store.setLocale("tr-TR");
    expect(title().title).toBe("Hoş Geldiniz");
  });

  it("throws a helpful error when Dialex is not configured", async () => {
    const app = await createApplication({ providers: [] });
    apps.push(app);
    expect(() => inContext(app, () => injectDialex())).toThrow(/provideDialex/);
  });
});

describe("initial and remembered locale", () => {
  it("applies a remembered locale only after the first render", async () => {
    document.cookie = "locale=tr; path=/";
    const app = await start({ persist: "cookie", locales: ["en", "tr"] });
    const dialex = inContext(app, () => injectDialex());

    expect(dialex.locale()).toBe("en"); // matches server-rendered markup
    await render(app);
    expect(dialex.locale()).toBe("tr");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("ignores a remembered locale that is not supported", async () => {
    document.cookie = "locale=fr; path=/";
    const app = await start({ persist: "cookie", locales: ["en", "tr"] });
    const dialex = inContext(app, () => injectDialex());
    await render(app);
    expect(dialex.locale()).toBe("en");
  });

  it("uses initialLocale and then skips the remembered locale", async () => {
    document.cookie = "locale=tr; path=/";
    const app = await start({ persist: "cookie", initialLocale: "es" });
    const dialex = inContext(app, () => injectDialex());
    await render(app);
    expect(dialex.locale()).toBe("es");
  });

  it("evaluates initialLocale functions in the injection context", async () => {
    const REQUEST_LOCALE = new InjectionToken<string>("REQUEST_LOCALE");
    const app = await start({ initialLocale: () => inject(REQUEST_LOCALE) }, [
      { provide: REQUEST_LOCALE, useValue: "tr" },
    ]);
    expect(inContext(app, () => injectDialex()).locale()).toBe("tr");
  });

  it("remembers changes in a cookie, localStorage, or nowhere", async () => {
    const cookieApp = await start({ persist: "cookie" });
    inContext(cookieApp, () => injectDialex()).setLocale("tr");
    expect(document.cookie).toContain("locale=tr");

    const storageApp = await start({ persist: "localStorage", storageKey: "lng" });
    inContext(storageApp, () => injectDialex()).setLocale("es");
    expect(localStorage.getItem("lng")).toBe("es");

    clearStorage();
    const offApp = await start({ persist: false });
    inContext(offApp, () => injectDialex()).setLocale("tr");
    expect(document.cookie).toBe("");
    expect(localStorage.length).toBe(0);
  });
});
