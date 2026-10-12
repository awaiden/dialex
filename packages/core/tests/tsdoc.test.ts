import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

// Everything these files export is public API, reachable from a `dialexjs/*` entry point. Editors
// show a doc comment on hover, so an export without one is a question the reader has to ask.
const SRC = path.resolve(import.meta.dirname, "../src");

/** Files whose exports are internal (shared between entry points, not part of the package API). */
const INTERNAL = new Set(["intl.ts", "store.ts", "persist.ts"]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts") ? [full] : [];
  });
}

describe("public exports are documented", () => {
  it("has a doc comment on every exported declaration", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(SRC)) {
      // an overloaded function is documented on its overload signatures, not on the implementation
      const documentedFunctions = new Set<string>();
      if (INTERNAL.has(path.basename(file))) continue;
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!/^export (async )?(function|const|class|interface|type|enum) /.test(line)) return;
        let above = index - 1;
        // decorators and line comments sit between the doc comment and the declaration
        while (above >= 0 && /^\s*(\/\/|@)/.test(lines[above])) above--;
        const documented = (lines[above] ?? "").trim().endsWith("*/");
        const name = /^export (?:async )?function (\w+)/.exec(line)?.[1];
        if (documented && name) documentedFunctions.add(name);
        if (!documented && !(name && documentedFunctions.has(name))) {
          missing.push(`${path.relative(SRC, file)}:${index + 1} ${line.slice(0, 80)}`);
        }
      });
    }
    expect(missing).toEqual([]);
  });
});
