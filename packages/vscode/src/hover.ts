import path from "node:path";
import { getLeafSource, type AnalyzedDictionary, type Reference } from "@dialexjs/cli/api";
import { orderedLocales, type ProjectModel } from "./model.js";
import { classifyPath, resolveReference } from "./references.js";

/** Escapes Markdown so translation text cannot change the hover's formatting. */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/[\\`*_{}[\]()#+!|<>~]/g, "\\$&")
    .replace(/\r?\n/g, "<br>")
    .slice(0, 400);
}

function cell(dictionary: AnalyzedDictionary, locale: string, keyPath: string[]): string {
  const leaf = dictionary.leaves.get(locale)?.get(keyPath.join("."));
  if (!leaf) return "_missing_";
  if (leaf.kind === "string") return escapeMarkdown(leaf.value ?? "");
  if (leaf.kind === "function") {
    const source = dictionary.df ? getLeafSource(dictionary.df, locale, keyPath) : undefined;
    return source
      ? `\`${source.replace(/`/g, "'").replace(/\s+/g, " ").slice(0, 160)}\``
      : "_function_";
  }
  return "_value_";
}

/**
 * Markdown for a hover over a Dialex reference: every locale's text for a key, or a summary of a
 * dictionary. Returns `undefined` for unknown references (diagnostics already flag those).
 */
export function buildHover(model: ProjectModel, ref: Reference): string | undefined {
  const resolved = resolveReference(model, ref);
  if (!resolved) return undefined;
  const { dictionary, keyPath } = resolved;
  const file = path.basename(dictionary.file);

  if (keyPath.length === 0) {
    return [
      `**${dictionary.name}** · ${file}`,
      "",
      `${dictionary.paths.length} key${dictionary.paths.length === 1 ? "" : "s"} · locales: ${dictionary.locales.join(", ")}`,
    ].join("\n");
  }

  const kind = classifyPath(dictionary, keyPath);
  const title = `**${dictionary.name}.${keyPath.join(".")}** · ${file}`;

  if (kind === "missing") return undefined;

  if (kind === "group") {
    const prefix = `${keyPath.join(".")}.`;
    const children = new Set(
      dictionary.paths
        .filter((p) => p.startsWith(prefix))
        .map((p) => p.slice(prefix.length).split(".")[0]),
    );
    return `${title}\n\n${children.size} key${children.size === 1 ? "" : "s"}: ${[...children].map((c) => `\`${c}\``).join(", ")}`;
  }

  const rows = orderedLocales(model, dictionary).map(
    (locale) => `| ${locale} | ${cell(dictionary, locale, keyPath)} |`,
  );
  return [title, "", "| Locale | Text |", "| --- | --- |", ...rows].join("\n");
}
