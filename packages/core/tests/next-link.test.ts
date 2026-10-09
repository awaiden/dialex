import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

let params: Record<string, string> | null = null;
let config: Record<string, unknown> = {};

vi.mock("next/navigation.js", () => ({ useParams: () => params }));
const { DialexLink } = await import("../src/next/link.js");
const { DialexProvider } = await import("../src/react.js");

const html = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(
      DialexProvider as any,
      { config, dictionaries: {} },
      createElement(DialexLink as any, props, "Go"),
    ),
  );

describe("DialexLink", () => {
  beforeEach(() => {
    params = { locale: "tr" };
    config = { locales: ["en", "tr"], defaultLocale: "en" };
  });

  it("prefixes the href with the locale from the route params", () => {
    expect(html({ href: "/about" })).toContain('href="/tr/about"');
  });

  it("lets the locale prop override the route", () => {
    expect(html({ href: "/about", locale: "en" })).toContain('href="/en/about"');
  });

  it("falls back to the default locale outside a [locale] route", () => {
    params = null;
    expect(html({ href: "/about" })).toContain('href="/en/about"');
  });

  it("omits the default locale prefix when prefixDefault is false", () => {
    config = { ...config, prefixDefault: false };
    expect(html({ href: "/about", locale: "en" })).toContain('href="/about"');
    expect(html({ href: "/about", locale: "tr" })).toContain('href="/tr/about"');
  });

  it("supports UrlObject hrefs and leaves external links alone", () => {
    expect(html({ href: { pathname: "/about", query: { a: "1" } } })).toContain(
      'href="/tr/about?a=1"',
    );
    expect(html({ href: "https://example.com/x" })).toContain('href="https://example.com/x"');
  });

  it("passes other props through", () => {
    expect(html({ href: "/about", className: "nav" })).toContain('class="nav"');
  });
});

describe("DialexLink without a provider", () => {
  it("says what is missing", () => {
    expect(() =>
      renderToStaticMarkup(createElement(DialexLink as any, { href: "/about" }, "Go")),
    ).toThrow(/DialexProvider/);
  });
});
