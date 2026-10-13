import path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import pkg from "../package.json" with { type: "json" };
import { listDocResources, readDocResource } from "./resources.js";
import { TOOLS } from "./tools/index.js";

export function createDialexMcpServer(options: { root?: string } = {}) {
  const getRoot = () => path.resolve(options.root || process.cwd());

  const server = new Server(
    {
      name: "dialex",
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => listDocResources());

  server.setRequestHandler(ReadResourceRequestSchema, async (request) =>
    readDocResource(request.params.uri),
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const root = getRoot();
    const { name, arguments: args = {} } = request.params;

    try {
      const tool = TOOLS.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      return await tool.handler(root, args);
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing ${name}: ${err.message || String(err)}`,
          },
        ],
      };
    }
  });

  return server;
}
