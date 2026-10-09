import { afterEach, describe, expect, it } from "vite-plus/test";

import { buildHover, escapeMarkdown } from "../src/hover.js";
import { HOME, analyze, cleanup } from "./helpers.js";

afterEach(cleanup);

const ref = (value: string, kind: "dictionary" | "path" = "path") =>
  ({ kind, value, start: 0, end: 0 }) as const;

describe("buildHover", () => {
  it("shows every locale's text for a key, default locale first", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    expect(buildHover(model, ref("home.title"))).toBe(
      [
        "**home.title** · home.content.ts",
        "",
        "| Locale | Text |",
        "| --- | --- |",
        "| en | Welcome |",
        "| tr | Hoş Geldiniz |",
      ].join("\n"),
    );
  });

  it("marks locales that lack the key and shows function sources", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    const missing = buildHover(model, ref("home.nav.contact"))!;
    expect(missing).toContain("| en | Contact |");
    expect(missing).toContain("| tr | _missing_ |");

    const fn = buildHover(model, ref("home.greeting"))!;
    expect(fn).toContain(
      "`(name: string) => `Hello, ${name}!``".replace("`Hello", "'Hello").replace("!``", "!'`"),
    );
  });

  it("escapes Markdown and flattens newlines in translation text", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    const note = buildHover(model, ref("home.note"))!;
    expect(note).toContain("Pipes \\| and \\*stars\\*<br>second line");
    expect(escapeMarkdown("a_b [c](d) <e>")).toBe("a\\_b \\[c\\]\\(d\\) \\<e\\>");
    expect(escapeMarkdown("x".repeat(500))).toHaveLength(400);
  });

  it("summarizes dictionaries and groups, and ignores unknown references", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    expect(buildHover(model, ref("home", "dictionary"))).toBe(
      "**home** · home.content.ts\n\n5 keys · locales: en, tr",
    );
    expect(buildHover(model, ref("home.nav"))).toContain("2 keys: `about`, `contact`");
    expect(buildHover(model, ref("home.nope"))).toBeUndefined();
    expect(buildHover(model, ref("nope.title"))).toBeUndefined();
    expect(buildHover(model, ref("nope", "dictionary"))).toBeUndefined();
  });
});
