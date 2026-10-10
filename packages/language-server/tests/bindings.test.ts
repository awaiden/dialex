import { afterEach, describe, expect, it } from "vite-plus/test";

import { findBindings } from "../src/features/bindings.js";
import { completionContextAt, completionEntries } from "../src/features/completion.js";
import { findReferenceAt, resolveReference } from "../src/features/references.js";
import { HOME, analyze, cleanup } from "./helpers.js";

afterEach(cleanup);

describe("findBindings", () => {
  it("finds variables that hold a dictionary", () => {
    const bindings = findBindings(`
      const s = useDictionary("showcase");
      const home = await getDictionary("home", locale);
      let nav: Nav = injectDictionary<Nav>("nav");
      const other = somethingElse("x");
      const spread = React.useDictionary('quoted');
    `);
    expect(Object.fromEntries(bindings)).toEqual({
      s: "showcase",
      home: "home",
      nav: "nav",
      spread: "quoted",
    });
  });

  it("ignores dynamic names", () => {
    expect([...findBindings("const d = getDictionary(name);")]).toEqual([]);
    expect([...findBindings("const d = getDictionary(`home-${x}`);")]).toEqual([]);
  });
});

describe("references through a variable", () => {
  const line = "  {s.nav.features} {s.title} {other.nav}";
  const bindings = new Map([["s", "showcase"]]);

  it("resolves each member of the chain", () => {
    const features = findReferenceAt(line, line.indexOf("features") + 2, bindings);
    expect(features).toMatchObject({ kind: "path", value: "showcase.nav.features" });
    expect(line.slice(features!.start, features!.end)).toBe("features");

    const nav = findReferenceAt(line, line.indexOf("nav") + 1, bindings);
    expect(nav).toMatchObject({ kind: "path", value: "showcase.nav" });

    const title = findReferenceAt(line, line.indexOf("title") + 1, bindings);
    expect(title).toMatchObject({ kind: "path", value: "showcase.title" });
  });

  it("resolves the variable itself to the dictionary", () => {
    expect(findReferenceAt(line, 3, bindings)).toMatchObject({
      kind: "dictionary",
      value: "showcase",
    });
  });

  it("leaves other variables and unbound code alone", () => {
    expect(findReferenceAt(line, line.indexOf("other") + 8, bindings)).toBeUndefined();
    expect(findReferenceAt(line, line.indexOf("features") + 2)).toBeUndefined();
  });

  it("does not match a longer identifier that starts with the variable name", () => {
    expect(findReferenceAt("assets.nav.x", 8, new Map([["s", "showcase"]]))).toBeUndefined();
    expect(findReferenceAt("s2.nav.x", 5, new Map([["s", "showcase"]]))).toBeUndefined();
  });

  it("resolves against a real dictionary", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    const ref = findReferenceAt("home.nav.about", 10, new Map([["home", "home"]]));
    const resolved = ref && resolveReference(model, ref);
    expect(resolved?.dictionary.name).toBe("home");
    expect(resolved?.keyPath).toEqual(["nav", "about"]);
  });
});

describe("completion through a variable", () => {
  const bindings = new Map([["home", "home"]]);

  it("completes the members under a variable", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });

    const top = completionContextAt("  home.", bindings);
    expect(top).toMatchObject({ kind: "path", dictionary: "home", parent: [], typed: "" });
    expect(completionEntries(model, top!).map((e) => e.label)).toEqual(
      expect.arrayContaining(["title", "nav"]),
    );

    const nested = completionContextAt("  {home.nav.co", bindings);
    expect(nested).toMatchObject({ parent: ["nav"], typed: "co", length: 2 });
    expect(completionEntries(model, nested!).map((e) => e.label)).toEqual(["contact"]);
  });

  it("offers nothing for code that is not a bound variable", () => {
    expect(completionContextAt("  other.", bindings)).toBeUndefined();
    expect(completionContextAt("  home.nav.", undefined)).toBeUndefined();
  });
});
