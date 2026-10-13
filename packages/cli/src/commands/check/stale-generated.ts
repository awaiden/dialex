import fs from "node:fs";
import path from "node:path";

import { renderGenerated } from "../generate/index.js";
import type { CheckOptions } from "./types.js";

/**
 * What a formatter (Prettier, Biome, oxfmt) can change without changing the code: whitespace,
 * quote style, quoted object keys and trailing commas. Comparing this form keeps `check` quiet
 * when your pre-commit hook formats the generated files.
 */
export function normalizeGenerated(text: string): string {
  return text
    .replace(/'/g, '"')
    .replace(/"([A-Za-z_$][\w$]*)"\s*:/g, "$1:")
    .replace(/\s+/g, "")
    .replace(/,(?=[\]})])/g, "");
}

/**
 * Generated files that exist but no longer match the dictionaries and config. Nothing builds them
 * for you any more, so a stale `dialex.generated.ts` would otherwise fail silently at runtime.
 * With `fix` they are rewritten.
 */
export function staleGeneratedFiles(
  root: string,
  options: CheckOptions,
): { stale: { file: string; message: string }[]; rewritten: number } {
  let rendered;
  try {
    rendered = renderGenerated(root, { config: options.config });
  } catch {
    return { stale: [], rewritten: 0 }; // not renderable (for example lazy mode with an unreadable name); `generate` reports it
  }
  const stale: { file: string; message: string }[] = [];
  let rewritten = 0;
  const targets: [string, string | undefined][] = [
    [rendered.outputPath, rendered.content],
    [rendered.dtsPath, rendered.dtsContent],
  ];
  // Per-locale modules belong to the same generation: once the generated file exists they must too
  if (fs.existsSync(rendered.outputPath)) {
    for (const extra of rendered.extraFiles) targets.push([extra.path, extra.content]);
  }
  for (const [file, content] of targets) {
    if (content === undefined) continue;
    const isExtra = rendered.extraFiles.some((f) => f.path === file);
    if (!fs.existsSync(file)) {
      if (!isExtra) continue;
      if (options.fix) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content, "utf-8");
        rewritten++;
      } else {
        stale.push({
          file: path.relative(root, file),
          message: "Missing. Run `dx generate` (or `dx check --fix`).",
        });
      }
      continue;
    }
    if (normalizeGenerated(fs.readFileSync(file, "utf-8")) === normalizeGenerated(content))
      continue;
    if (options.fix) {
      fs.writeFileSync(file, content, "utf-8");
      rewritten++;
    } else {
      stale.push({
        file: path.relative(root, file),
        message:
          "Out of date with your dictionaries or config. Run `dx generate` (or `dx check --fix`).",
      });
    }
  }
  return { stale, rewritten };
}
