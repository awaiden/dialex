import { describe, expect, it, vi } from "vite-plus/test";
import { i18n } from "../src/express.js";

describe("Express integration", () => {
  const homeDict = {
    name: "home",
    dictionary: {
      en: { title: "Welcome" },
      tr: { title: "Hoş Geldiniz" },
    },
  };

  it("attaches locale and getDictionary to req and res.locals", () => {
    const middleware = i18n({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    const req: any = {
      headers: { "accept-language": "tr-TR,tr;q=0.9" },
      query: {},
    };
    const res: any = {
      locals: {},
      setHeader: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.locale).toBe("tr");
    expect(res.locals.locale).toBe("tr");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Language", "tr");

    const dict = req.getDictionary("home");
    expect(dict.title).toBe("Hoş Geldiniz");

    const localsDict = res.locals.getDictionary("home");
    expect(localsDict.title).toBe("Hoş Geldiniz");
  });

  it("detects locale from cookie", () => {
    const middleware = i18n({
      defaultLocale: "en",
      locales: ["en", "tr"],
      dictionaries: [homeDict],
    });

    const req: any = {
      headers: { cookie: "user=123; locale=tr" },
      query: {},
    };
    const res: any = {
      locals: {},
      setHeader: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.locale).toBe("tr");
    expect(req.getDictionary("home").title).toBe("Hoş Geldiniz");
  });
});
