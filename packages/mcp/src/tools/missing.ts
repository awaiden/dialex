import {
  TODO_PREFIX,
  isStale,
  listLeaves,
  listLocales,
  loadStaticProject,
  readLock,
} from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const missing: McpTool = {
  name: "dialex_missing",
  description:
    "List missing keys, keys marked with [TODO] placeholders, and stale translations (the source text changed after they were translated, per dialex.lock.json) across locales.",
  inputSchema: {
    type: "object",
    properties: {
      locale: {
        type: "string",
        description: "Filter missing keys to a specific target locale.",
      },
      config: {
        type: "string",
        description: "Optional custom path to config file.",
      },
    },
  },

  async handler(root, args) {
    const schema = z.object({
      locale: z.string().optional(),
      config: z.string().optional(),
    });
    const parsed = schema.parse(args);
    const project = await loadStaticProject(root, parsed.config);
    const defaultLocale = project.config.defaultLocale || "en";

    const missingItems: Array<{
      dictionary: string;
      file: string;
      locale: string;
      path: string[];
      key: string;
      status: "missing" | "todo" | "stale";
      currentValue?: string;
      defaultValue?: string;
    }> = [];

    const configuredLocales = new Set(project.config.locales || []);
    const lock = readLock(root);

    for (const d of project.dictionaries) {
      const localesInDict = new Set(listLocales(d.df));
      const allLocales = new Set([...localesInDict, ...configuredLocales]);
      const defaultLeaves = listLeaves(d.df, defaultLocale);
      const defaultMap = new Map(defaultLeaves.map((l) => [l.path.join("."), l.value]));

      for (const loc of allLocales) {
        if (loc === defaultLocale) continue;
        if (parsed.locale && loc !== parsed.locale) continue;

        const leaves = listLeaves(d.df, loc);
        const leafMap = new Map(leaves.map((l) => [l.path.join("."), l]));

        for (const defLeaf of defaultLeaves) {
          const pathKey = defLeaf.path.join(".");
          const curr = leafMap.get(pathKey);
          if (!curr) {
            missingItems.push({
              dictionary: d.name,
              file: d.rel,
              locale: loc,
              path: defLeaf.path,
              key: `${d.name}.${pathKey}`,
              status: "missing",
              defaultValue: defLeaf.value,
            });
          } else if (curr.kind === "string" && curr.value?.startsWith(TODO_PREFIX)) {
            missingItems.push({
              dictionary: d.name,
              file: d.rel,
              locale: loc,
              path: defLeaf.path,
              key: `${d.name}.${pathKey}`,
              status: "todo",
              currentValue: curr.value,
              defaultValue: defaultMap.get(pathKey),
            });
          }
        }
      }

      // Translations whose source text changed since they were translated
      if (lock?.sourceLocale) {
        const sourceLeaves = new Map(
          listLeaves(d.df, lock.sourceLocale).map((l) => [l.path.join("."), l]),
        );
        for (const loc of allLocales) {
          if (loc === lock.sourceLocale) continue;
          if (parsed.locale && loc !== parsed.locale) continue;
          for (const leaf of listLeaves(d.df, loc)) {
            if (leaf.kind !== "string" || leaf.value === undefined) continue;
            if (leaf.value.startsWith(TODO_PREFIX)) continue;
            const pathKey = leaf.path.join(".");
            const source = sourceLeaves.get(pathKey);
            if (source?.kind !== "string" || source.value === undefined) continue;
            const key = `${d.name}.${pathKey}`;
            if (!isStale(lock, loc, key, source.value)) continue;
            missingItems.push({
              dictionary: d.name,
              file: d.rel,
              locale: loc,
              path: leaf.path,
              key,
              status: "stale",
              currentValue: leaf.value,
              defaultValue: source.value,
            });
          }
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ missingCount: missingItems.length, items: missingItems }, null, 2),
        },
      ],
    };
  },
};
