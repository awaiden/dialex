import { afterEach, describe, expect, it } from "vite-plus/test";

import { completionContextAt, completionEntries } from "../src/completion.js";
import { HOME, analyze, cleanup } from "./helpers.js";

afterEach(cleanup);

describe("completionContextAt", () => {
  it("detects dictionary names for getDictionary-style calls", () => {
    expect(completionContextAt(`const d = getDictionary("ho`)).toEqual({
      kind: "dictionary",
      call: "getDictionary",
      typed: "ho",
      length: 2,
    });
    expect(completionContextAt(`useDictionary('`)).toMatchObject({ kind: "dictionary", typed: "" });
    expect(completionContextAt("@DialexDictionary(`h")).toMatchObject({
      kind: "dictionary",
      call: "DialexDictionary",
    });
  });

  it("detects dictionary names and key paths for t()", () => {
    expect(completionContextAt(`t("ho`)).toEqual({
      kind: "dictionary",
      call: "t",
      typed: "ho",
      length: 2,
    });
    expect(completionContextAt(`t("home.`)).toEqual({
      kind: "path",
      dictionary: "home",
      parent: [],
      typed: "",
      length: 0,
    });
    expect(completionContextAt(`t("home.nav.ab`)).toEqual({
      kind: "path",
      dictionary: "home",
      parent: ["nav"],
      typed: "ab",
      length: 2,
    });
  });

  it("ignores everything else", () => {
    for (const text of [
      `t(`,
      `t("home")`,
      `foo.t("ho`,
      `sort("ho`,
      `const x = "ho`,
      `getDictionary("home", locale`,
    ]) {
      expect(completionContextAt(text)).toBeUndefined();
    }
  });
});

describe("completionEntries", () => {
  it("lists dictionaries, continuing with a dot for t()", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });

    const forT = completionEntries(model, completionContextAt(`t("ho`)!);
    expect(forT).toEqual([
      {
        label: "home",
        kind: "dictionary",
        detail: "5 keys · en, tr",
        insertText: "home.",
        retrigger: true,
      },
    ]);

    const forGet = completionEntries(model, completionContextAt(`getDictionary("`)!);
    expect(forGet[0]).toMatchObject({ insertText: "home", retrigger: false });
    expect(completionEntries(model, completionContextAt(`getDictionary("zzz`)!)).toEqual([]);
  });

  it("lists the next level of keys with previews from the default locale", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    const entries = completionEntries(model, completionContextAt(`t("home.`)!);

    expect(entries.map((e) => [e.label, e.kind, e.insertText])).toEqual([
      ["title", "leaf", "title"],
      ["greeting", "leaf", "greeting"],
      ["note", "leaf", "note"],
      ["nav", "group", "nav."],
    ]);
    expect(entries.find((e) => e.label === "title")!.detail).toBe("Welcome");
    expect(entries.find((e) => e.label === "greeting")!.detail).toBe("(function)");
    expect(entries.find((e) => e.label === "nav")).toMatchObject({
      retrigger: true,
      detail: "keys…",
    });
  });

  it("completes nested levels and filters by what is typed", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    expect(
      completionEntries(model, completionContextAt(`t("home.nav.`)!).map((e) => e.label),
    ).toEqual(["about", "contact"]);
    expect(
      completionEntries(model, completionContextAt(`t("home.nav.co`)!).map((e) => e.label),
    ).toEqual(["contact"]);
    expect(completionEntries(model, completionContextAt(`t("nope.`)!)).toEqual([]);
  });
});
