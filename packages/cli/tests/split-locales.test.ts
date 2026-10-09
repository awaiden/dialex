import { describe, expect, it } from "vite-plus/test";

import { parseDictionaryText } from "../src/utils/dictionary-edit.js";
import { splitLocales } from "../src/utils/split-locales.js";

const split = (source: string) => splitLocales(parseDictionaryText("home.content.ts", source)!);

describe("splitLocales", () => {
  it("cuts a plain dictionary into one piece per locale, keeping functions and nesting", () => {
    const result = split(`import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Welcome", nav: { about: "About" }, greet: (name: string) => \`Hi \${name}\` },
  tr: { title: "Selam", nav: { about: "Hakkında" }, greet: (name: string) => \`Selam \${name}\` },
});
`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slices.map((s) => s.locale)).toEqual(["en", "tr"]);
    expect(result.slices[0].code).toContain('title: "Welcome"');
    expect(result.slices[0].code).toContain("greet: (name: string) =>");
    expect(result.slices[0].code).not.toContain("Selam");
    expect(result.slices[1].code).toContain('about: "Hakkında"');
  });

  it("works with the object form and a plain exported object", () => {
    expect(
      split(`export default { name: "a", dictionary: { en: { x: "1" }, tr: { x: "2" } } };`).ok,
    ).toBe(true);
    expect(
      split(`import { defineDictionary } from "dialexjs";
export default defineDictionary({ name: "a", dictionary: { en: { x: "1" } } });`).ok,
    ).toBe(true);
  });

  it("keeps a file whole when a locale uses something imported or declared in the file", () => {
    const imported = split(`import { plural } from "dialexjs";
import { defineDictionary } from "dialexjs";
export default defineDictionary("cart", {
  en: { items: (n: number) => plural(n, { one: "item", other: "items" }) },
  tr: { items: (n: number) => \`\${n} ürün\` },
});`);
    expect(imported).toEqual({
      ok: false,
      reason: '"en" uses "plural", which is defined elsewhere in the file',
    });

    const declared = split(`const BRAND = "Dialex";
export default { name: "a", dictionary: { en: { x: BRAND }, tr: { x: "y" } } };`);
    expect(declared.ok).toBe(false);
    expect(declared.ok === false && declared.reason).toContain('"BRAND"');

    const typed = split(`interface Row { a: string }
export default { name: "a", dictionary: { en: { x: (r: Row) => r.a }, tr: { x: (r: Row) => r.a } } };`);
    expect(typed.ok).toBe(false);
  });

  it("ignores names that only appear as property keys or member names", () => {
    const result = split(`const title = 1;
export default { name: "a", dictionary: { en: { title: "T", n: (x: { title: string }) => x.title }, tr: { title: "U" } } };`);
    // `title` is declared at the top level, but here it is only a key and a member, never a variable
    // (the typed parameter's type literal has a property named title, which is also not a reference).
    expect(result.ok).toBe(true);
  });

  it("does not split what it cannot read statically", () => {
    expect(
      split(`const en = { x: "1" };
export default { name: "a", dictionary: { en, tr: { x: "2" } } };`).ok,
    ).toBe(false);
    expect(split(`export default { name: "a", dictionary: { ...base, en: { x: "1" } } };`).ok).toBe(
      false,
    );
    expect(
      split(`export default { name: "a", dictionary: { en: { ...shared, x: "1" } } };`).ok,
    ).toBe(false);
  });
});
