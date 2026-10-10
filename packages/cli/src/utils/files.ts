import fs from "node:fs";
import path from "node:path";

import fg from "fast-glob";
import ignore, { type Ignore } from "ignore";

/** Folders that never hold project dictionaries or sources, in every scanner. */
export const BUILTIN_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/dialex.locales/**",
];

/** What the source scan skips on top: other tools' output, declarations, generated and config files. */
export const SOURCE_BUILTIN_IGNORE = [
  ...BUILTIN_IGNORE,
  "**/.nuxt/**",
  "**/.output/**",
  "**/.svelte-kit/**",
  "**/.astro/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/graphify-out/**",
  "**/*.d.ts",
  "**/dialex.generated.*",
  "**/dialex.config.*",
  "**/i18n.config.*",
];

interface GitignoreScope {
  /** Absolute directory the file's patterns are relative to. */
  dir: string;
  matcher: Ignore;
}

/** The nearest directory at or above `root` that contains `.git`, or `root` itself. */
function repositoryRoot(root: string): string {
  for (let dir = root; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    if (path.dirname(dir) === dir) return root;
  }
}

function readScope(dir: string): GitignoreScope | undefined {
  try {
    const text = fs.readFileSync(path.join(dir, ".gitignore"), "utf-8");
    return { dir, matcher: ignore().add(text) };
  } catch {
    return undefined;
  }
}

/**
 * A function that says whether an absolute path is ignored by Git. It reads the `.gitignore`
 * files of the project folder, of every folder above it up to the repository root (monorepo
 * packages inherit the root's rules), and of nested folders.
 */
export function createGitignoreFilter(root: string): (absolutePath: string) => boolean {
  const base = path.resolve(root);
  const top = repositoryRoot(base);

  const scopes: GitignoreScope[] = [];
  for (let dir = base; ; dir = path.dirname(dir)) {
    const scope = readScope(dir);
    if (scope) scopes.push(scope);
    if (dir === top || path.dirname(dir) === dir) break;
  }

  const nested = fg.sync("**/.gitignore", {
    cwd: base,
    absolute: true,
    dot: true,
    ignore: ["**/node_modules/**", "**/.git/**"],
  });
  for (const file of nested) {
    const dir = path.dirname(file);
    if (dir === base) continue; // already read above
    const scope = readScope(dir);
    if (scope) scopes.push(scope);
  }

  if (scopes.length === 0) return () => false;

  return (absolutePath) => {
    for (const { dir, matcher } of scopes) {
      const relative = path.relative(dir, absolutePath);
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) continue;
      if (matcher.ignores(relative.split(path.sep).join("/"))) return true;
    }
    return false;
  };
}

export interface ScanOptions {
  /** Which built-in ignore list applies. @default "dictionary" */
  kind?: "dictionary" | "source";
  /** `exclude` from the config: extra globs, relative to `root`. */
  exclude?: string[];
  /** More ignore globs, relative to `root` (nested projects, for example). */
  ignore?: string[];
  /** Skip what `.gitignore` files ignore. @default true */
  gitignore?: boolean;
  /** A filter from {@link createGitignoreFilter} to reuse instead of reading `.gitignore` again. */
  gitignoreFilter?: (absolutePath: string) => boolean;
}

/** Finds files under `root`, skipping build output, configured excludes and Git-ignored paths. */
export function scanFiles(
  root: string,
  patterns: string | string[],
  options: ScanOptions = {},
): string[] {
  const builtin = options.kind === "source" ? SOURCE_BUILTIN_IGNORE : BUILTIN_IGNORE;
  const files = fg.sync(patterns, {
    cwd: root,
    absolute: true,
    ignore: [...builtin, ...(options.exclude ?? []), ...(options.ignore ?? [])],
  });
  if (options.gitignore === false) return files;
  const ignored = options.gitignoreFilter ?? createGitignoreFilter(root);
  return files.filter((file) => !ignored(file));
}
