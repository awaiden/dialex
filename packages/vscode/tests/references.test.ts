import { afterEach, describe, expect, it } from "vite-plus/test";
import { buildModel } from "../src/model.js";
import { classifyPath, findReferenceAt, resolveReference } from "../src/references.js";
import { HOME, analyze, cleanup } from "./helpers.js";

afterEach(cleanup);

describe("findReferenceAt", () => {
  const line = `const a = t("home.nav.about"); const d = getDictionary("home");`;

  it("finds t() paths and dictionary names under the cursor", () => {
    const path = findReferenceAt(line, line.indexOf("nav") + 1);
    expect(path).toMatchObject({ kind: "path", value: "home.nav.about" });
    expect(line.slice(path!.start, path!.end)).toBe("home.nav.about");

    expect(findReferenceAt(line, line.lastIndexOf("home") + 2)).toMatchObject({
      kind: "dictionary",
      value: "home",
    });
  });

  it("accepts the cursor at either edge of the string and rejects other places", () => {
    const start = line.indexOf("home.nav");
    expect(findReferenceAt(line, start)).toBeDefined();
    expect(findReferenceAt(line, start + "home.nav.about".length)).toBeDefined();
    expect(findReferenceAt(line, 0)).toBeUndefined();
    expect(findReferenceAt(line, line.indexOf(";") + 2)).toBeUndefined();
  });

  it("treats members of getDictionary(...) as paths", () => {
    const code = `const title = getDictionary("home").nav.about;`;
    const at = (needle: string) => findReferenceAt(code, code.indexOf(needle) + 1);

    expect(at("nav")).toMatchObject({ kind: "path", value: "home.nav" });
    expect(at("about")).toMatchObject({ kind: "path", value: "home.nav.about" });
    expect(code.slice(at("about")!.start, at("about")!.end)).toBe("about");
  });

  it("supports optional chaining and arguments in the call", () => {
    const code = `useDictionary("home", locale)?.title`;
    expect(findReferenceAt(code, code.indexOf("title") + 1)).toMatchObject({ value: "home.title" });
  });
});

describe("resolveReference and classifyPath", () => {
  it("resolves against the model", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    const home = model.dictionaries.get("home")!;

    expect(
      resolveReference(model, { kind: "dictionary", value: "home", start: 0, end: 0 }),
    ).toEqual({ dictionary: home, keyPath: [] });
    expect(
      resolveReference(model, { kind: "path", value: "home.nav.about", start: 0, end: 0 })?.keyPath,
    ).toEqual(["nav", "about"]);
    expect(
      resolveReference(model, { kind: "path", value: "other.x", start: 0, end: 0 }),
    ).toBeUndefined();

    expect(classifyPath(home, ["nav", "about"])).toBe("leaf");
    expect(classifyPath(home, ["nav"])).toBe("group");
    expect(classifyPath(home, ["nope"])).toBe("missing");
    expect(buildModel("/x", "en", { dictionaries: [] }).dictionaries.size).toBe(0);
  });
});
