import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { renderGenerated } from "../src/commands/generate.js";
import { parseJsonc, relativeImportExtension } from "../src/utils/tsconfig.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function project(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-tsconfig-"));
  dirs.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

describe("parseJsonc", () => {
  it("accepts comments, trailing commas and slashes inside strings", () => {
    expect(
      parseJsonc(`{
        // line comment
        "a": "http://example.com/*not a comment*/", /* block */
        "b": [1, 2,],
      }`),
    ).toEqual({ a: "http://example.com/*not a comment*/", b: [1, 2] });
  });
});

describe("relativeImportExtension", () => {
  it("uses .js for node16/nodenext, either through module or moduleResolution", () => {
    expect(
      relativeImportExtension(
        project({ "tsconfig.json": `{ "compilerOptions": { "module": "NodeNext" } }` }),
      ),
    ).toBe(".js");
    expect(
      relativeImportExtension(
        project({ "tsconfig.json": `{ "compilerOptions": { "moduleResolution": "node16" } }` }),
      ),
    ).toBe(".js");
  });

  it("uses no extension for bundler resolution (webpack cannot map .js to .ts)", () => {
    expect(
      relativeImportExtension(
        project({ "tsconfig.json": `{ "compilerOptions": { "moduleResolution": "bundler" } }` }),
      ),
    ).toBe("");
    // module nodenext with an explicit bundler resolution: the explicit setting wins
    expect(
      relativeImportExtension(
        project({
          "tsconfig.json": `{ "compilerOptions": { "module": "nodenext", "moduleResolution": "bundler" } }`,
        }),
      ),
    ).toBe("");
  });

  it("uses .js when there is no tsconfig (plain Node ESM) and none when it sets nothing", () => {
    expect(relativeImportExtension(project({}))).toBe(".js");
    expect(relativeImportExtension(project({ "tsconfig.json": `{ "compilerOptions": {} }` }))).toBe(
      "",
    );
  });

  it("follows extends", () => {
    const dir = project({
      "tsconfig.base.json": `{ "compilerOptions": { "moduleResolution": "nodenext" } }`,
      "tsconfig.json": `{ "extends": "./tsconfig.base" }`,
    });
    expect(relativeImportExtension(dir)).toBe(".js");
  });

  it("follows the project reference that covers src in a solution tsconfig (Vite templates)", () => {
    const dir = project({
      "tsconfig.json": `{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }`,
      "tsconfig.app.json": `{ "compilerOptions": { "moduleResolution": "bundler" }, "include": ["src"] }`,
      "tsconfig.node.json": `{ "compilerOptions": { "module": "nodenext" }, "include": ["vite.config.ts"] }`,
    });
    expect(relativeImportExtension(dir)).toBe("");
  });
});

describe("generated import paths", () => {
  const content = `export default { name: "home", dictionary: { en: { a: "x" } } };\n`;

  it("match the project's resolution", () => {
    const bundler = project({
      "src/home.content.ts": content,
      "tsconfig.json": `{ "compilerOptions": { "moduleResolution": "bundler" } }`,
    });
    expect(renderGenerated(bundler).content).toContain('from "./home.content";');

    const nodenext = project({
      "src/home.content.ts": content,
      "tsconfig.json": `{ "compilerOptions": { "module": "nodenext" } }`,
    });
    expect(renderGenerated(nodenext).content).toContain('from "./home.content.js";');
  });
});
