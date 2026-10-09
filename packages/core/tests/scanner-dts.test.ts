import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { REGISTRY_ADAPTERS, detectAdapters, generateDts } from "../src/scanner.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function project(dependencies?: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-dts-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src"));
  if (dependencies)
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies }));
  const file = path.join(dir, "src/home.content.ts");
  fs.writeFileSync(file, "export default {};\n");
  return { dir, file };
}

const modulesIn = (dir: string) =>
  [
    ...fs
      .readFileSync(path.join(dir, "src/dialex-env.d.ts"), "utf-8")
      .matchAll(/declare module '([^']+)'/g),
  ].map((m) => m[1]);

describe("generateDts adapters", () => {
  it("augments the base module and only the adapter an Express project uses", () => {
    const { dir, file } = project({ express: "^5.0.0", dialexjs: "^0.2.0" });
    generateDts(dir, [file], ["en", "tr"]);
    expect(modulesIn(dir)).toEqual(["dialexjs", "dialexjs/express"]);
  });

  it("covers React, and Next.js with its server entry", () => {
    const react = project({ react: "^19.0.0" });
    generateDts(react.dir, [react.file]);
    expect(modulesIn(react.dir)).toEqual(["dialexjs", "dialexjs/react"]);

    const next = project({ next: "^15.0.0", react: "^19.0.0" });
    generateDts(next.dir, [next.file]);
    expect(modulesIn(next.dir)).toEqual(["dialexjs", "dialexjs/react", "dialexjs/server"]);
  });

  it("maps Nuxt to Vue and h3, and Remix-style frameworks to the web entry", () => {
    expect(detectAdapters(project({ nuxt: "^4.0.0" }).dir)).toEqual(["vue", "h3"]);
    expect(detectAdapters(project({ "react-router": "^7.0.0", react: "^19.0.0" }).dir)).toEqual([
      "react",
      "web",
    ]);
  });

  it("falls back to every adapter when nothing is recognised or there is no package.json", () => {
    expect(detectAdapters(project({ lodash: "^4.0.0" }).dir)).toEqual([...REGISTRY_ADAPTERS]);
    expect(detectAdapters(project().dir)).toEqual([...REGISTRY_ADAPTERS]);
  });

  it("keeps the locales type and the dictionary imports", () => {
    const { dir, file } = project({ hono: "^4.0.0" });
    generateDts(dir, [file], ["en", "tr"]);
    const text = fs.readFileSync(path.join(dir, "src/dialex-env.d.ts"), "utf-8");
    expect(text).toContain(`locales: "en" | "tr";`);
    expect(text).toContain("import dict0 from './home.content';");
    expect(text).not.toContain("dialexjs/express");
  });
});
