import { readStaticConfig } from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const dialexConfig: McpTool = {
  name: "dialex_config",
  description:
    "Read static Dialex configuration (locales, defaultLocale, include pattern) from dialex.config.ts or i18n.config.ts without executing project code.",
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
    const staticConf = readStaticConfig(root, parsed.config);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(staticConf, null, 2),
        },
      ],
    };
  },
};
