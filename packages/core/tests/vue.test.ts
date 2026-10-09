import { describe, expect, it, vi } from "vite-plus/test";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

vi.mock("virtual:dialex-dictionaries", () => ({
  default: {
    home: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  },
  lazy: false,
  loadDictionary: async () => undefined,
}));
vi.mock("virtual:dialex-config", () => ({ default: { defaultLocale: "en" } }));

const { createDialex, useDialex, useDictionary, useT } = await import("../src/vue.js");

const render = async (dialex: ReturnType<typeof createDialex>, name = "home") => {
  const Comp = defineComponent({
    setup() {
      const { locale } = useDialex();
      const dict = useDictionary(name);
      return () => h("p", `${locale.value}:${(dict.value as any).title ?? "none"}`);
    },
  });
  const app = createSSRApp(Comp).use(dialex);
  return renderToString(app);
};

describe("Vue integration", () => {
  it("renders the default locale dictionary", async () => {
    expect(await render(createDialex())).toBe("<p>en:Welcome</p>");
  });

  it("uses the configured initial locale and reacts to setLocale", async () => {
    const dialex = createDialex({ defaultLocale: "tr" });
    expect(await render(dialex)).toBe("<p>tr:Hoş Geldiniz</p>");

    dialex.setLocale("en");
    expect(await render(dialex)).toBe("<p>en:Welcome</p>");
  });

  it("calls onLocaleChange", () => {
    const seen: string[] = [];
    createDialex({ onLocaleChange: (l) => seen.push(l) }).setLocale("tr");
    expect(seen).toEqual(["tr"]);
  });

  it("falls back to the default locale for unknown locales", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await render(createDialex({ defaultLocale: "fr" }))).toBe("<p>fr:Welcome</p>");
    warn.mockRestore();
  });

  it("throws when the plugin is not installed", () => {
    const Comp = defineComponent({
      setup() {
        useDialex();
        return () => h("p");
      },
    });
    return expect(renderToString(createSSRApp(Comp))).rejects.toThrow(/createDialex/);
  });

  it("useT resolves dot paths against the current locale", async () => {
    const Comp = defineComponent({
      setup() {
        const t = useT() as any;
        return () => h("p", t("home.title"));
      },
    });
    const dialex = createDialex({ defaultLocale: "tr" });
    expect(await renderToString(createSSRApp(Comp).use(dialex))).toBe("<p>Hoş Geldiniz</p>");
    dialex.setLocale("en");
    expect(await renderToString(createSSRApp(Comp).use(dialex))).toBe("<p>Welcome</p>");
  });
});
