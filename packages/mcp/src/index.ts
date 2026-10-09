#!/usr/bin/env node

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createDialexMcpServer } from "./server.js";

export { createDialexMcpServer } from "./server.js";

/**
 * True when this module is the script node was started with. `npx` and package managers start
 * bins through a symlink, so `argv[1]` must be resolved before comparing it with the module path.
 */
export function isEntrypoint(argv1: string | undefined, moduleUrl: string): boolean {
  if (!argv1) return false;
  try {
    return fs.realpathSync(argv1) === fs.realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--root" && args[i + 1]) {
      root = args[i + 1];
      i++;
    } else if (args[i].startsWith("--root=")) {
      root = args[i].slice("--root=".length);
    }
  }

  const server = createDialexMcpServer({ root });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (isEntrypoint(process.argv[1], import.meta.url)) {
  main().catch((err) => {
    console.error("Dialex MCP Server Error:", err);
    process.exit(1);
  });
}
