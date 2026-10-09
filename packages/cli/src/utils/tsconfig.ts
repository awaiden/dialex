import fs from "node:fs";
import path from "node:path";

/** Parses tsconfig-style JSON: comments and trailing commas are allowed. */
export function parseJsonc(text: string): any {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else {
      out += c;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

interface Resolved {
  moduleResolution?: string;
  include?: string[];
  references: string[];
}

function configFile(from: string): string | undefined {
  if (fs.existsSync(from) && fs.statSync(from).isFile()) return from;
  for (const candidate of [`${from}.json`, path.join(from, "tsconfig.json")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

/** `moduleResolution` and `include` of a tsconfig, following relative `extends`. */
function read(file: string, depth = 0): Resolved {
  const result: Resolved = { references: [] };
  let json: any;
  try {
    json = parseJsonc(fs.readFileSync(file, "utf-8"));
  } catch {
    return result;
  }
  const dir = path.dirname(file);

  const parent =
    typeof json.extends === "string" && json.extends.startsWith(".") && depth < 5
      ? configFile(path.resolve(dir, json.extends))
      : undefined;
  if (parent) Object.assign(result, read(parent, depth + 1));

  const options = json.compilerOptions ?? {};
  const module = typeof options.module === "string" ? options.module.toLowerCase() : undefined;
  const resolution =
    typeof options.moduleResolution === "string"
      ? options.moduleResolution.toLowerCase()
      : module === "node16" || module === "nodenext"
        ? module
        : undefined;
  if (resolution) result.moduleResolution = resolution;
  if (Array.isArray(json.include)) result.include = json.include;
  result.references = (json.references ?? [])
    .map((ref: any) =>
      typeof ref?.path === "string" ? configFile(path.resolve(dir, ref.path)) : undefined,
    )
    .filter(Boolean) as string[];
  return result;
}

/**
 * The extension for relative imports in generated files. TypeScript's `node16`/`nodenext` need
 * `./x.js`; bundlers (webpack, Vite) resolve extensionless imports, and webpack cannot map `.js`
 * to a `.ts` file. Without any tsconfig it is plain Node ESM, which needs the extension.
 */
export function relativeImportExtension(root: string): ".js" | "" {
  const file = configFile(path.join(root, "tsconfig.json"));
  if (!file) return ".js";

  let resolved = read(file);
  if (!resolved.moduleResolution && resolved.references.length > 0) {
    // A "solution" tsconfig: use the referenced project that covers src/.
    const projects = resolved.references.map((ref) => read(ref));
    resolved =
      projects.find((p) => p.include?.some((entry) => /^(\.\/)?src(\/|$)/.test(entry))) ??
      projects[0] ??
      resolved;
  }
  const resolution = resolved.moduleResolution;
  return resolution === "node16" || resolution === "nodenext" ? ".js" : "";
}
