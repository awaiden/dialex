import fs from "node:fs";
import path from "node:path";

import { logger } from "../../utils/logger.js";

/** Writes `.agents/skills/dialex/SKILL.md`, merges `.mcp.json` and adds a note to AGENTS.md. */
export function setupAiSupport(root: string): void {
  try {
    // 6a. Copy or create skill in .agents/skills/dialex/SKILL.md
    const skillDir = path.join(root, ".agents/skills/dialex");
    fs.mkdirSync(skillDir, { recursive: true });
    const skillContent = `---
name: dialex
description: Guide for internationalizing JavaScript and TypeScript apps with Dialex. Use when adding translations, creating content dictionaries, configuring locales, or using Dialex with frameworks like Next.js, React, Express, Hono, Fastify, SvelteKit, and Nuxt.
---

# Dialex Internationalization

Dialex is a high-performance, type-safe internationalization toolchain for JavaScript and TypeScript.

## Core Concepts
- Dictionaries are defined with \`defineDictionary("name", { ... })\` in \`*.content.ts\` files.
- Keys must match across all locales.
- ICU message syntax is supported for plurals and selects.
- Parity is validated at compile time with \`dialex check\`.

## Useful Commands
- \`dialex check --json\`: Check dictionary parity and references.
- \`dialex check --fix\`: Automatically insert missing keys marked with [TODO].
- \`dialex generate\`: Rebuild standalone dictionary bundle and types.
- \`dialex translate --locale <locale>\`: Automatically translate missing keys.
`;
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillContent, "utf-8");

    // 6b. Merge .mcp.json
    const mcpConfigPath = path.join(root, ".mcp.json");
    let mcpConfig: Record<string, any> = {};
    if (fs.existsSync(mcpConfigPath)) {
      try {
        mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
      } catch {
        mcpConfig = {};
      }
    }
    mcpConfig.mcpServers = mcpConfig.mcpServers || {};
    mcpConfig.mcpServers.dialex = mcpConfig.mcpServers.dialex || {
      command: "npx",
      args: ["@dialexjs/mcp"],
    };
    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + "\n", "utf-8");

    // 6c. Add snippet to AGENTS.md if absent
    const agentsMdPath = path.join(root, "AGENTS.md");
    const dialexAgentSnippet = `
## Internationalization (Dialex)

This project uses [Dialex](https://github.com/awaiden/dialex) for type-safe internationalization.
- Dictionaries are in \`*.content.ts\` files using \`defineDictionary\`.
- Run \`dialex check --json\` to verify parity.
- Run \`dialex check --fix\` to insert missing keys marked with \`[TODO]\`.
- Run \`dx generate\` (alias of \`dialex\`) or \`npm run dx:generate\` to compile dictionary bundles and update types.
`;
    if (!fs.existsSync(agentsMdPath)) {
      fs.writeFileSync(agentsMdPath, dialexAgentSnippet.trimStart(), "utf-8");
    } else {
      const existing = fs.readFileSync(agentsMdPath, "utf-8");
      if (!existing.includes("Dialex")) {
        fs.writeFileSync(agentsMdPath, existing.trimEnd() + "\n" + dialexAgentSnippet, "utf-8");
      }
    }

    logger.success("Configured AI assistant support (.agents/skills, .mcp.json, AGENTS.md)");
  } catch (err: any) {
    logger.warn(`Could not finish AI configuration: ${err.message || String(err)}`);
  }
}
