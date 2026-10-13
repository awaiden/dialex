import { listLocales, loadStaticProject } from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const listDictionaries: McpTool = {
  name: "dialex_list_dictionaries",
  description: "List all discovered content dictionaries, their files, and supported locales.",
  inputSchema: {
    type: "object",
    properties: {
      config: {
        type: "string",
        description: "Optional custom path to config file relative to project root.",
      },
    },
  },

  async handler(root, args) {
    const schema = z.object({ config: z.string().optional() });
    const parsed = schema.parse(args);
    const project = await loadStaticProject(root, parsed.config);
    const dicts = project.dictionaries.map((d) => ({
      name: d.name,
      file: d.rel,
      locales: listLocales(d.df),
      complete: d.df.complete,
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              dictionaries: dicts,
              unsupported: project.unsupported,
              notes: project.notes,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
