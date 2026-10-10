import fs from "node:fs";
import path from "node:path";

import { scanFiles } from "@dialexjs/cli/api";

export interface ProjectRoot {
  root: string;
  /** Globs (relative to `root`) for nested projects that belong to someone else. */
  ignore: string[];
}

// On top of the CLI's built-in list and the project's `.gitignore` files.
const IGNORE = ["**/.git/**", "**/.nuxt/**"];

/** The nearest folder at or above `dir` (but inside `folder`) that has a package.json. */
function packageRoot(folder: string, dir: string): string {
  for (let current = dir; current.startsWith(folder); current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    if (current === folder) break;
  }
  return folder;
}

/**
 * Finds the Dialex projects inside a workspace folder.
 *
 * - Every directory with a `dialex.config.*` or `i18n.config.*` is a project.
 * - A `*.content.ts` file that no such project contains belongs to the nearest folder with a
 *   `package.json` (or the workspace folder), which then uses the default settings. This covers
 *   monorepos where only some packages have a config file.
 * - A project excludes the projects nested inside it, so one dictionary is never reported twice.
 */
export function discoverProjects(folder: string): ProjectRoot[] {
  const configs = scanFiles(folder, ["**/dialex.config.*", "**/i18n.config.*"], {
    ignore: IGNORE,
  });
  const configured = [...new Set(configs.map((f) => path.dirname(f)))];
  const roots = new Set(configured);

  // Judge coverage against the configured projects only; a fallback root must not hide others.
  const dictionaries = scanFiles(folder, "**/*.content.ts", { ignore: IGNORE });
  for (const file of dictionaries) {
    if (!configured.some((root) => file.startsWith(root + path.sep))) {
      roots.add(packageRoot(folder, path.dirname(file)));
    }
  }

  const all = [...roots].sort((a, b) => a.length - b.length);
  return all.map((root) => ({
    root,
    ignore: all
      .filter((other) => other !== root && other.startsWith(root + path.sep))
      .map((other) => `${path.relative(root, other).split(path.sep).join("/")}/**`),
  }));
}
