import fs from "node:fs";
import path from "node:path";

import { LOCALES_DIR, renderGenerated } from "./render.js";
import type { GenerateOptions } from "./types.js";

function writeIfChanged(file: string, content: string) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  if (existing === content) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf-8");
}

export function generateDictionaries(
  root: string,
  options: GenerateOptions = {},
): {
  files: string[];
  outputPath: string;
  dtsPath: string;
  configFile?: string;
  notes: string[];
} {
  const rendered = renderGenerated(root, options);
  if (rendered.dtsContent !== undefined) writeIfChanged(rendered.dtsPath, rendered.dtsContent);
  writeIfChanged(rendered.outputPath, rendered.content);

  // Per-locale modules, and no leftovers from dictionaries or locales that are gone
  const dir = path.join(path.dirname(rendered.outputPath), LOCALES_DIR);
  const wanted = new Set(rendered.extraFiles.map((f) => f.path));
  for (const file of rendered.extraFiles) writeIfChanged(file.path, file.content);
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (entry.endsWith(".ts") && !wanted.has(full)) fs.rmSync(full);
    }
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }

  return {
    files: rendered.files,
    outputPath: rendered.outputPath,
    dtsPath: rendered.dtsPath,
    configFile: rendered.configFile,
    notes: rendered.notes,
  };
}
