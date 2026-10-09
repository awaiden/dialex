import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { isEntrypoint } from "../src/index.js";

describe("isEntrypoint", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-mcp-entry-"));
  const real = path.join(dir, "index.mjs");
  const link = path.join(dir, "dialex-mcp");
  fs.writeFileSync(real, "");
  fs.symlinkSync(real, link);
  const url = pathToFileURL(real).href;

  it("matches the file itself", () => {
    expect(isEntrypoint(real, url)).toBe(true);
  });

  it("matches when started through a bin symlink (npx, node_modules/.bin)", () => {
    expect(isEntrypoint(link, url)).toBe(true);
  });

  it("does not match another script, a missing path or no argument", () => {
    expect(isEntrypoint(path.join(dir, "other.mjs"), url)).toBe(false);
    expect(isEntrypoint(undefined, url)).toBe(false);
  });
});
