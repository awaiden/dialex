import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { createGitignoreFilter, scanFiles } from "../src/utils/files.js";

const dirs: string[] = [];

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-files-"));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
}

const rel = (root: string, files: string[]) =>
  files.map((f) => path.relative(root, f).split(path.sep).join("/")).sort();

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("scanFiles", () => {
  it("skips node_modules, dist and the other built-in folders", () => {
    const root = project({
      "src/a.content.ts": "",
      "node_modules/x/b.content.ts": "",
      "dist/c.content.ts": "",
      "src/dialex.locales/d.content.ts": "",
    });
    expect(rel(root, scanFiles(root, "**/*.content.ts"))).toEqual(["src/a.content.ts"]);
  });

  it("skips what .gitignore ignores", () => {
    const root = project({
      ".gitignore": "build/\n*.generated.content.ts\n",
      "src/a.content.ts": "",
      "build/b.content.ts": "",
      "src/x.generated.content.ts": "",
    });
    expect(rel(root, scanFiles(root, "**/*.content.ts"))).toEqual(["src/a.content.ts"]);
  });

  it("honours negations in .gitignore", () => {
    const root = project({
      ".gitignore": "*.content.ts\n!keep.content.ts\n",
      "a.content.ts": "",
      "keep.content.ts": "",
    });
    expect(rel(root, scanFiles(root, "**/*.content.ts"))).toEqual(["keep.content.ts"]);
  });

  it("reads nested .gitignore files relative to their folder", () => {
    const root = project({
      "packages/a/.gitignore": "generated/\n",
      "packages/a/generated/x.content.ts": "",
      "packages/a/src/y.content.ts": "",
      "packages/b/generated/z.content.ts": "",
    });
    expect(rel(root, scanFiles(root, "**/*.content.ts"))).toEqual([
      "packages/a/src/y.content.ts",
      "packages/b/generated/z.content.ts",
    ]);
  });

  it("applies the repository's .gitignore to a package inside a monorepo", () => {
    const repo = project({
      ".git/HEAD": "ref: refs/heads/main\n",
      ".gitignore": "vendor/\n",
      "packages/app/src/a.content.ts": "",
      "packages/app/vendor/b.content.ts": "",
    });
    const root = path.join(repo, "packages/app");
    expect(rel(root, scanFiles(root, "**/*.content.ts"))).toEqual(["src/a.content.ts"]);
  });

  it("applies the exclude globs from the config", () => {
    const root = project({
      "src/a.content.ts": "",
      "legacy/b.content.ts": "",
    });
    expect(rel(root, scanFiles(root, "**/*.content.ts", { exclude: ["legacy/**"] }))).toEqual([
      "src/a.content.ts",
    ]);
  });

  it("can ignore .gitignore with gitignore: false", () => {
    const root = project({ ".gitignore": "build/\n", "build/a.content.ts": "" });
    expect(rel(root, scanFiles(root, "**/*.content.ts", { gitignore: false }))).toEqual([
      "build/a.content.ts",
    ]);
  });

  it("skips declaration files only for sources", () => {
    const root = project({ "src/a.ts": "", "src/a.d.ts": "", ".nuxt/b.ts": "" });
    expect(rel(root, scanFiles(root, "**/*.ts", { kind: "source" }))).toEqual(["src/a.ts"]);
    expect(rel(root, scanFiles(root, "**/*.ts"))).toEqual(["src/a.d.ts", "src/a.ts"]);
  });
});

describe("createGitignoreFilter", () => {
  it("returns a filter that ignores nothing when there is no .gitignore", () => {
    const root = project({ "a.ts": "" });
    expect(createGitignoreFilter(root)(path.join(root, "a.ts"))).toBe(false);
  });
});
