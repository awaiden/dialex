import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  analyzeProject,
  readStaticConfig,
  loadStaticProject,
  loadDictionaryFile,
  saveDictionaryFile,
  listLeaves,
  getString,
  setString,
  copyLeaf,
  scanReferences,
  generateDictionaries,
  TODO_PREFIX,
  hasPath,
  listLocales,
} from "@dialexjs/cli/api";
import { DOC_TOPICS } from "./docs.js";

export function createDialexMcpServer(options: { root?: string } = {}) {
  const getRoot = () => path.resolve(options.root || process.cwd());

  const server = new Server(
    {
      name: "dialex",
      version: "0.2.2",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: Object.keys(DOC_TOPICS).map((topic) => ({
        uri: `dialex://docs/${topic}`,
        name: `Dialex Documentation: ${topic}`,
        mimeType: "text/markdown",
        description: `Reference documentation for Dialex ${topic}`,
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const match = /^dialex:\/\/docs\/([a-zA-Z0-9_-]+)$/.exec(uri);
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }
    const topic = match[1];
    const content = DOC_TOPICS[topic];
    if (!content) {
      throw new Error(`Documentation topic not found: ${topic}`);
    }
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content,
        },
      ],
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
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
        },
        {
          name: "dialex_list_dictionaries",
          description:
            "List all discovered content dictionaries, their files, and supported locales.",
          inputSchema: {
            type: "object",
            properties: {
              config: {
                type: "string",
                description: "Optional custom path to config file relative to project root.",
              },
            },
          },
        },
        {
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
                description:
                  "Locale to retrieve (e.g. 'en' or 'tr'). If omitted, returns all locales.",
              },
              config: {
                type: "string",
                description: "Optional custom path to config file.",
              },
            },
          },
        },
        {
          name: "dialex_check",
          description:
            "Analyze project statically to verify dictionary key parity, ICU arguments, and source code references without executing project code.",
          inputSchema: {
            type: "object",
            properties: {
              src: {
                type: "array",
                items: { type: "string" },
                description: "Optional source file globs to scan for dictionary references.",
              },
              config: {
                type: "string",
                description: "Optional custom path to config file.",
              },
            },
          },
        },
        {
          name: "dialex_find_usages",
          description:
            "Scan source files for dictionary usages (e.g. getDictionary('home') or t('home.title')).",
          inputSchema: {
            type: "object",
            properties: {
              file: {
                type: "string",
                description: "Relative or absolute file path to scan for references.",
              },
            },
            required: ["file"],
          },
        },
        {
          name: "dialex_missing",
          description:
            "List all missing keys or keys marked with [TODO] placeholders across locales.",
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
        },
        {
          name: "dialex_set_key",
          description:
            "Safely set or update a translation string in a dictionary file using AST manipulation without executing project code or destroying comments/formatting. Refuses to overwrite non-[TODO] values unless overwrite is explicitly true.",
          inputSchema: {
            type: "object",
            properties: {
              file: {
                type: "string",
                description: "Dictionary file path (e.g. 'src/home.content.ts' or absolute path).",
              },
              locale: {
                type: "string",
                description: "Locale to update (e.g. 'tr').",
              },
              path: {
                type: "array",
                items: { type: "string" },
                description: "Key path segments (e.g. ['nav', 'about'] or ['title']).",
              },
              value: {
                type: "string",
                description: "The translated string value to set.",
              },
              overwrite: {
                type: "boolean",
                description:
                  "Must be set to true to overwrite an existing translated value that is not marked [TODO]. Defaults to false.",
              },
            },
            required: ["file", "locale", "path", "value"],
          },
        },
        {
          name: "dialex_add_missing",
          description:
            "Automatically insert missing keys across all locales as [TODO] placeholders copied from default locale values (AST safe edits).",
          inputSchema: {
            type: "object",
            properties: {
              config: {
                type: "string",
                description: "Optional custom path to config file.",
              },
            },
          },
        },
        {
          name: "dialex_generate",
          description:
            "Run code generation to build standalone dictionary registry and TypeScript declarations.",
          inputSchema: {
            type: "object",
            properties: {
              output: {
                type: "string",
                description: "Optional custom output path for dialex.generated.ts.",
              },
              config: {
                type: "string",
                description: "Optional custom path to config file.",
              },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const root = getRoot();
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "dialex_config": {
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
        }

        case "dialex_list_dictionaries": {
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
        }

        case "dialex_get_dictionary": {
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
        }

        case "dialex_check": {
          const schema = z.object({
            src: z.array(z.string()).optional(),
            config: z.string().optional(),
          });
          const parsed = schema.parse(args);
          const staticConf = readStaticConfig(root, parsed.config);
          const analysis = await analyzeProject({
            root,
            config: staticConf.config,
            src: parsed.src,
            runtime: false,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    issues: analysis.issues.map((i) => ({
                      ...i,
                      file: path.relative(root, i.file),
                    })),
                    totalIssues: analysis.issues.filter((i) => i.level === "error").length,
                    totalWarnings: analysis.issues.filter((i) => i.level === "warning").length,
                    filesScanned: analysis.sourceFilesScanned,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "dialex_find_usages": {
          const schema = z.object({ file: z.string() });
          const parsed = schema.parse(args);
          const filePath = path.isAbsolute(parsed.file)
            ? parsed.file
            : path.resolve(root, parsed.file);
          const fs = await import("node:fs");
          if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${parsed.file}`);
          }
          const text = fs.readFileSync(filePath, "utf-8");
          const refs = scanReferences(text);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { file: path.relative(root, filePath), references: refs },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "dialex_missing": {
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
            status: "missing" | "todo";
            currentValue?: string;
            defaultValue?: string;
          }> = [];

          const configuredLocales = new Set(project.config.locales || []);

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
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { missingCount: missingItems.length, items: missingItems },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "dialex_set_key": {
          const schema = z.object({
            file: z.string(),
            locale: z.string(),
            path: z.array(z.string()),
            value: z.string(),
            overwrite: z.boolean().optional(),
          });
          const parsed = schema.parse(args);
          const filePath = path.isAbsolute(parsed.file)
            ? parsed.file
            : path.resolve(root, parsed.file);

          const df = await loadDictionaryFile(filePath);
          if (!df) {
            throw new Error(
              `Cannot load dictionary file at ${parsed.file} (unsupported shape or syntax error)`,
            );
          }

          const existingVal = getString(df, parsed.locale, parsed.path);
          const isTodo = existingVal?.startsWith(TODO_PREFIX);

          if (existingVal !== undefined && !isTodo && !parsed.overwrite) {
            throw new Error(
              `Key "${parsed.path.join(".")}" in locale "${parsed.locale}" already has a translated value (${JSON.stringify(existingVal)}). Set overwrite: true to overwrite.`,
            );
          }

          const res = setString(df, parsed.locale, parsed.path, parsed.value);
          if (res === "skipped") {
            throw new Error(
              `Cannot set string at "${parsed.path.join(".")}" in "${parsed.locale}": target is a function or non-string node.`,
            );
          }

          await saveDictionaryFile(df);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    action: res,
                    file: path.relative(root, filePath),
                    locale: parsed.locale,
                    path: parsed.path,
                    value: parsed.value,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "dialex_add_missing": {
          const schema = z.object({ config: z.string().optional() });
          const parsed = schema.parse(args);
          const project = await loadStaticProject(root, parsed.config);
          const defaultLocale = project.config.defaultLocale || "en";
          const configuredLocales = project.config.locales || [];

          let totalFixed = 0;

          for (const d of project.dictionaries) {
            if (!d.df.complete) continue;
            const present = listLocales(d.df);
            const targets = Array.from(new Set([...present, ...configuredLocales]));
            const sourceOrder = [
              defaultLocale,
              ...present.filter((l) => l !== defaultLocale),
            ].filter((l) => present.includes(l));

            const allPaths = new Map<string, string[]>();
            for (const locale of present) {
              for (const leaf of listLeaves(d.df, locale))
                allPaths.set(leaf.path.join("\u0000"), leaf.path);
            }

            let changed = false;
            for (const target of targets) {
              for (const leafPath of allPaths.values()) {
                if (hasPath(d.df, target, leafPath)) continue;
                const source = sourceOrder.find((l) => l !== target && hasPath(d.df, l, leafPath));
                if (
                  source &&
                  copyLeaf(d.df, source, target, leafPath, (v) => `${TODO_PREFIX}${v}`)
                ) {
                  totalFixed++;
                  changed = true;
                }
              }
            }

            if (changed) {
              await saveDictionaryFile(d.df);
            }
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: true, fixed: totalFixed }, null, 2),
              },
            ],
          };
        }

        case "dialex_generate": {
          const schema = z.object({
            output: z.string().optional(),
            config: z.string().optional(),
          });
          const parsed = schema.parse(args);
          const res = generateDictionaries(root, { output: parsed.output, config: parsed.config });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    files: res.files.map((f) => path.relative(root, f)),
                    outputPath: path.relative(root, res.outputPath),
                    dtsPath: path.relative(root, res.dtsPath),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
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
