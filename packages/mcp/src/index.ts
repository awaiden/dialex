#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDialexMcpServer } from "./server.js";

export { createDialexMcpServer } from "./server.js";

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Dialex MCP Server Error:", err);
    process.exit(1);
  });
}
