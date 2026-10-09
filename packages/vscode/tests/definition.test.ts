import { afterEach, describe, expect, it } from "vite-plus/test";

import { definitionFor } from "../src/definition.js";
import { HOME, analyze, cleanup } from "./helpers.js";

afterEach(cleanup);

const ref = (value: string, kind: "dictionary" | "path" = "path") =>
  ({ kind, value, start: 0, end: 0 }) as const;
const lineOf = (source: string, needle: string) =>
  source.split("\n").findIndex((l) => l.includes(needle));

describe("definitionFor", () => {
  it("points at the key in the default locale", async () => {
    const { model, dir } = await analyze({ "src/home.content.ts": HOME });
    const target = definitionFor(model, ref("home.title"))!;
    expect(target.file).toBe(`${dir}/src/home.content.ts`);
    expect(target.range.start.line).toBe(lineOf(HOME, 'title: "Welcome"'));
  });

  it("falls back to another locale when the default locale lacks the key", async () => {
    const source = HOME.replace('    note: "Pipes | and *stars*\\nsecond line",\n', "").replace(
      'title: "Hoş Geldiniz",',
      'title: "Hoş Geldiniz",\n    onlyTr: "Yalnızca",',
    );
    const { model } = await analyze({ "src/home.content.ts": source });
    expect(definitionFor(model, ref("home.onlyTr"))!.range.start.line).toBe(
      lineOf(source, "onlyTr"),
    );
  });

  it("points at groups and at the dictionary", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    expect(definitionFor(model, ref("home.nav"))!.range.start.line).toBe(lineOf(HOME, "nav: {"));
    expect(definitionFor(model, ref("home", "dictionary"))!.range.start.line).toBe(
      lineOf(HOME, 'defineDictionary("home"'),
    );
  });

  it("returns nothing for unknown references", async () => {
    const { model } = await analyze({ "src/home.content.ts": HOME });
    expect(definitionFor(model, ref("home.nope"))).toBeUndefined();
    expect(definitionFor(model, ref("nope.x"))).toBeUndefined();
  });
});
