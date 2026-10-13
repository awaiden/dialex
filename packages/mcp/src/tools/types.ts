/** What a tool returns: text content, which is all Dialex tools produce. */
export type ToolResult = {
  content: { type: "text"; text: string }[];
};

/** One MCP tool: how it is listed and what it does when called. */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** `root` is the project root; `args` are the call arguments, not yet validated. */
  handler(root: string, args: Record<string, unknown>): Promise<ToolResult>;
}
