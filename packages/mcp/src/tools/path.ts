import fs from "node:fs";
import path from "node:path";

function realpathNearest(targetPath: string): string {
  let current = path.resolve(targetPath);
  const trailing: string[] = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    trailing.unshift(path.basename(current));
    current = parent;
  }
  const baseReal = fs.existsSync(current) ? fs.realpathSync(current) : current;
  return trailing.length > 0 ? path.join(baseReal, ...trailing) : baseReal;
}

/**
 * Resolves `target` relative to `root` and verifies that its realpath (or nearest existing
 * ancestor's realpath) stays within `root`. Throws if the path escapes `root`.
 */
export function resolveInRoot(root: string, target: string): string {
  const rootResolved = path.resolve(root);
  const rootReal = fs.existsSync(rootResolved) ? fs.realpathSync(rootResolved) : rootResolved;
  const resolved = path.resolve(rootResolved, target);
  const realResolved = realpathNearest(resolved);
  const rel = path.relative(rootReal, realResolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`Path "${target}" escapes the project root.`);
  }
  return resolved;
}
