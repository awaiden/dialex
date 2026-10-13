import { listLeaves, listLocales, loadStaticProject } from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const getDictionary: McpTool = {
  name: "dialex_get_dictionary",
  description:
    "Get leaf keys and values for a specific dictionary or all dictionaries, optionally filtered by locale.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Dictionary name (e.g. 'home' or 'auth'). If omitted, returns all dictionaries.",
      },
      locale: {
        type: "string",
        description: "Locale to retrieve (e.g. 'en' or 'tr'). If omitted, returns all locales.",
      },
      config: {
        type: "string",
        description: "Optional custom path to config file.",
      },
    },
  },

  async handler(root, args) {
    const schema = z.object({
      name: z.string().optional(),
      locale: z.string().optional(),
      config: z.string().optional(),
    });
    const parsed = schema.parse(args);
    const project = await loadStaticProject(root, parsed.config);

    const result: Record<
      string,
      Record<string, Array<{ path: string[]; kind: string; value?: string }>>
    > = {};

    for (const d of project.dictionaries) {
      if (parsed.name && d.name !== parsed.name) continue;
      result[d.name] = {};
      const locales = listLocales(d.df);
      for (const loc of locales) {
        if (parsed.locale && loc !== parsed.locale) continue;
        result[d.name][loc] = listLeaves(d.df, loc);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
