import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDialexMcpServer } from "../src/server.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

function createTestProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-mcp-test-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });

  fs.writeFileSync(
    path.join(dir, "dialex.config.ts"),
    `export default {
  defaultLocale: "en",
  locales: ["en", "tr"],
};
`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(dir, "src/home.content.ts"),
    `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    greeting: (name: string) => \`Hi \${name}\`,
    nav: {
      about: "About",
    },
  },
  tr: {
    title: "Hoş Geldiniz",
    greeting: (name: string) => \`Selam \${name}\`,
    nav: {
      about: "[TODO] About",
    },
  },
});
`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(dir, "src/app.ts"),
    `import { getDictionary } from "dialexjs";
const dict = getDictionary("home");
console.log(dict.title);
`,
    "utf-8",
  );

  return dir;
}

async function setupClientAndServer(root: string) {
  const server = createDialexMcpServer({ root });
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return { client, server };
}

describe("Dialex MCP Server", () => {
  it("lists and reads documentation resources", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const resources = await client.listResources();
    expect(resources.resources.length).toBeGreaterThan(0);
    expect(resources.resources.some((r) => r.uri === "dialex://docs/guide")).toBe(true);

    const doc = await client.readResource({ uri: "dialex://docs/guide" });
    expect((doc.contents[0] as any).text).toContain("Dialex Internationalization");
  });

  it("lists all registered tools", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name);

    expect(toolNames).toContain("dialex_config");
    expect(toolNames).toContain("dialex_list_dictionaries");
    expect(toolNames).toContain("dialex_get_dictionary");
    expect(toolNames).toContain("dialex_check");
    expect(toolNames).toContain("dialex_find_usages");
    expect(toolNames).toContain("dialex_missing");
    expect(toolNames).toContain("dialex_set_key");
    expect(toolNames).toContain("dialex_add_missing");
    expect(toolNames).toContain("dialex_generate");
  });

  it("tool: dialex_config", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const res = await client.callTool({ name: "dialex_config", arguments: {} });
    expect(res.isError).toBeFalsy();
    const text = (res.content as any)[0].text;
    const config = JSON.parse(text);
    expect(config.config.defaultLocale).toBe("en");
    expect(config.config.locales).toEqual(["en", "tr"]);
  });

  it("tool: dialex_list_dictionaries", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const res = await client.callTool({ name: "dialex_list_dictionaries", arguments: {} });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse((res.content as any)[0].text);
    expect(parsed.dictionaries.length).toBe(1);
    expect(parsed.dictionaries[0].name).toBe("home");
    expect(parsed.dictionaries[0].locales).toEqual(["en", "tr"]);
  });

  it("tool: dialex_get_dictionary", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const res = await client.callTool({
      name: "dialex_get_dictionary",
      arguments: { name: "home", locale: "en" },
    });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse((res.content as any)[0].text);
    expect(parsed.home.en.some((l: any) => l.path.join(".") === "title")).toBe(true);
  });

  it("tool: dialex_check and dialex_find_usages", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const checkRes = await client.callTool({ name: "dialex_check", arguments: {} });
    expect(checkRes.isError).toBeFalsy();
    const checkParsed = JSON.parse((checkRes.content as any)[0].text);
    expect(checkParsed.totalIssues).toBe(0);

    const usagesRes = await client.callTool({
      name: "dialex_find_usages",
      arguments: { file: "src/app.ts" },
    });
    expect(usagesRes.isError).toBeFalsy();
    const usagesParsed = JSON.parse((usagesRes.content as any)[0].text);
    expect(usagesParsed.references.some((r: any) => r.value === "home")).toBe(true);
  });

  it("tool: dialex_missing", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    const res = await client.callTool({ name: "dialex_missing", arguments: { locale: "tr" } });
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse((res.content as any)[0].text);
    expect(parsed.missingCount).toBe(1);
    expect(parsed.items[0].key).toBe("home.nav.about");
    expect(parsed.items[0].status).toBe("todo");
  });

  it("tool: dialex_set_key safe edits and overwrite protection", async () => {
    const root = createTestProject();
    const { client } = await setupClientAndServer(root);

    // 1. Setting a [TODO] value should succeed without overwrite: true
    const todoUpdate = await client.callTool({
      name: "dialex_set_key",
      arguments: {
        file: "src/home.content.ts",
        locale: "tr",
        path: ["nav", "about"],
        value: "Hakkımızda",
      },
    });
    expect(todoUpdate.isError).toBeFalsy();

    const contentAfterTodo = fs.readFileSync(path.join(root, "src/home.content.ts"), "utf-8");
    expect(contentAfterTodo).toContain('"Hakkımızda"');

    // 2. Setting an already translated key without overwrite: true should error
    const blockedUpdate = await client.callTool({
      name: "dialex_set_key",
      arguments: {
        file: "src/home.content.ts",
        locale: "tr",
        path: ["nav", "about"],
        value: "Yeni Hakkımızda",
      },
    });
    expect(blockedUpdate.isError).toBe(true);

    // 3. Setting with overwrite: true should succeed
    const allowedUpdate = await client.callTool({
      name: "dialex_set_key",
      arguments: {
        file: "src/home.content.ts",
        locale: "tr",
        path: ["nav", "about"],
        value: "Yeni Hakkımızda",
        overwrite: true,
      },
    });
    expect(allowedUpdate.isError).toBeFalsy();
    const finalContent = fs.readFileSync(path.join(root, "src/home.content.ts"), "utf-8");
    expect(finalContent).toContain('"Yeni Hakkımızda"');
  });

  it("tool: dialex_add_missing and dialex_generate", async () => {
    const root = createTestProject();
    // Remove the tr nav.about key entirely to test add_missing
    const homePath = path.join(root, "src/home.content.ts");
    const raw = fs.readFileSync(homePath, "utf-8");
    fs.writeFileSync(homePath, raw.replace('about: "[TODO] About",', ""));

    const { client } = await setupClientAndServer(root);

    const addRes = await client.callTool({ name: "dialex_add_missing", arguments: {} });
    expect(addRes.isError).toBeFalsy();
    const addParsed = JSON.parse((addRes.content as any)[0].text);
    expect(addParsed.fixed).toBeGreaterThan(0);

    const recheckContent = fs.readFileSync(homePath, "utf-8");
    expect(recheckContent).toContain('"[TODO] About"');

    const genRes = await client.callTool({ name: "dialex_generate", arguments: {} });
    expect(genRes.isError).toBeFalsy();
    expect(fs.existsSync(path.join(root, "src/dialex.generated.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/dialex-env.d.ts"))).toBe(true);
  });
});
