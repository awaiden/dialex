import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeProject, type AnalysisIssue } from "@dialex/cli/api";
import { buildModel, type ProjectModel } from "../src/model.js";

export const HOME = `import { defineDictionary } from "dialex";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    greeting: (name: string) => \`Hello, \${name}!\`,
    note: "Pipes | and *stars*\\nsecond line",
    nav: { about: "About", contact: "Contact" },
  },
  tr: {
    title: "Hoş Geldiniz",
    greeting: (name: string) => \`Merhaba, \${name}!\`,
    nav: { about: "Hakkında" },
  },
});
`;

const dirs: string[] = [];

export function cleanup() {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
}

export function writeProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-vscode-"));
  dirs.push(dir);
  for (const [rel, code] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), code);
  }
  return dir;
}

export async function analyze(
  files: Record<string, string>,
  config = { defaultLocale: "en", locales: ["en", "tr"] },
): Promise<{ dir: string; model: ProjectModel; issues: AnalysisIssue[] }> {
  const dir = writeProject(files);
  const result = await analyzeProject({ root: dir, config, src: [] });
  return { dir, model: buildModel(dir, config.defaultLocale, result), issues: result.issues };
}
