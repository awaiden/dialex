import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Version of this CLI, which the other Dialex packages share. Read from the nearest package.json. */
export function cliVersion(): string | undefined {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
      if (pkg.name === "@dialexjs/cli") return pkg.version;
    } catch {
      // keep walking up
    }
    dir = path.dirname(dir);
  }
  return undefined;
}

/** The install command for the package manager a project uses, judged by its lockfile. */
export function installCommand(root: string): string {
  const has = (file: string) => fs.existsSync(path.join(root, file));
  if (has("bun.lock") || has("bun.lockb")) return "bun install";
  if (has("pnpm-lock.yaml")) return "pnpm install";
  if (has("yarn.lock")) return "yarn install";
  return "npm install";
}

type Dependencies = Record<string, string>;

const sorted = (deps: Dependencies): Dependencies =>
  Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Adds the packages a Dialex project needs: `dialexjs` as a dependency and the CLI as a dev
 * dependency (the `dx:generate` script runs it). Packages already listed anywhere are left alone.
 * Returns the names it added.
 */
export function addRequiredPackages(pkg: Record<string, any>, version = cliVersion()): string[] {
  const range = version ? `^${version}` : "latest";
  const listed = (name: string) =>
    [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies].some(
      (deps) => deps && name in deps,
    );
  const added: string[] = [];

  if (!listed("dialexjs")) {
    pkg.dependencies = sorted({ ...pkg.dependencies, dialexjs: range });
    added.push("dialexjs");
  }
  if (!listed("@dialexjs/cli")) {
    pkg.devDependencies = sorted({ ...pkg.devDependencies, "@dialexjs/cli": range });
    added.push("@dialexjs/cli");
  }
  return added;
}
