import { fileURLToPath, pathToFileURL } from "node:url";

import {
  analyzeProject,
  clearGitignore,
  createAnalysisCache,
  readStaticConfig,
  type AnalysisIssue,
} from "@dialexjs/cli/api";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  DiagnosticSeverity,
  DiagnosticTag,
  DidChangeWatchedFilesNotification,
  FileChangeType,
  TextDocumentSyncKind,
  TextDocuments,
  type Connection,
  type Diagnostic,
  type Hover,
  type InitializeParams,
  type InitializeResult,
} from "vscode-languageserver/node.js";

import {
  buildHover,
  buildModel,
  discoverProjects,
  findReferenceAt,
  modelForFile,
  type ProjectModel,
  type ProjectRoot,
} from "./features.js";

/** What the client can configure under the `dialex` section. */
export interface Settings {
  /** Turn diagnostics, hover and the other features off. */
  enable: boolean;
  /** Fade out keys and dictionaries that no source file seems to use. */
  unusedKeys: boolean;
  /** Path to the Dialex config file, relative to each project root. */
  configPath?: string;
}

const DEFAULT_SETTINGS: Settings = { enable: true, unusedKeys: false };

/** Files whose creation or removal can change the set of Dialex projects or what is scanned. */
const WATCHED_GLOBS = [
  "**/*.content.ts",
  "**/dialex.config.*",
  "**/i18n.config.*",
  "**/.gitignore",
];

interface ProjectState {
  model: ProjectModel;
  issues: AnalysisIssue[];
}

export interface DialexServer {
  /** Re-analyze every project now and publish diagnostics. */
  refresh(): Promise<void>;
}

function severityOf(issue: AnalysisIssue): DiagnosticSeverity {
  if (issue.code === "unused-key" || issue.code === "unused-dictionary") {
    return DiagnosticSeverity.Hint;
  }
  switch (issue.level) {
    case "error":
      return DiagnosticSeverity.Error;
    case "warning":
      return DiagnosticSeverity.Warning;
    default:
      return DiagnosticSeverity.Information;
  }
}

function toDiagnostic(issue: AnalysisIssue): Diagnostic {
  const severity = severityOf(issue);
  return {
    range: issue.range
      ? {
          start: { line: issue.range.start.line, character: issue.range.start.column },
          end: { line: issue.range.end.line, character: issue.range.end.column },
        }
      : { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    message: issue.message,
    severity,
    source: "dialex",
    code: issue.code,
    tags: severity === DiagnosticSeverity.Hint ? [DiagnosticTag.Unnecessary] : undefined,
  };
}

const uriToPath = (uri: string) => (uri.startsWith("file:") ? fileURLToPath(uri) : undefined);

/**
 * Wires Dialex's editor features to an LSP connection. Nothing in the project is executed:
 * dictionaries and configs are read from the syntax tree (`runtime: false`).
 */
export function createServer(connection: Connection): DialexServer {
  const documents = new TextDocuments(TextDocument);
  const cache = createAnalysisCache();
  const states = new Map<string, ProjectState>();
  const projectCache = new Map<string, ProjectRoot[]>();

  let folders: string[] = [];
  let canConfigure = false;
  let settings: Settings = { ...DEFAULT_SETTINGS };
  let published = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const projectsIn = (folder: string): ProjectRoot[] => {
    let projects = projectCache.get(folder);
    if (!projects) {
      projects = discoverProjects(folder);
      projectCache.set(folder, projects);
    }
    return projects;
  };

  const forgetLayout = () => {
    projectCache.clear();
    clearGitignore(cache);
  };

  async function loadSettings(): Promise<void> {
    settings = { ...DEFAULT_SETTINGS };
    if (!canConfigure) return;
    try {
      const value = (await connection.workspace.getConfiguration("dialex")) as
        | Partial<Settings>
        | null
        | undefined;
      if (value && typeof value === "object") {
        if (typeof value.enable === "boolean") settings.enable = value.enable;
        if (typeof value.unusedKeys === "boolean") settings.unusedKeys = value.unusedKeys;
        if (typeof value.configPath === "string" && value.configPath) {
          settings.configPath = value.configPath;
        }
      }
    } catch {
      // the client does not answer configuration requests; keep the defaults
    }
  }

  function publish(): void {
    const byFile = new Map<string, Diagnostic[]>();
    for (const { issues } of states.values()) {
      for (const issue of issues) {
        const list = byFile.get(issue.file) ?? [];
        list.push(toDiagnostic(issue));
        byFile.set(issue.file, list);
      }
    }

    const next = new Set<string>();
    for (const [file, diagnostics] of byFile) {
      const uri = pathToFileURL(file).href;
      next.add(uri);
      void connection.sendDiagnostics({ uri, diagnostics });
    }
    // Files that had problems before and have none now need an explicit empty list.
    for (const uri of published) {
      if (!next.has(uri)) void connection.sendDiagnostics({ uri, diagnostics: [] });
    }
    published = next;
  }

  async function refresh(): Promise<void> {
    await loadSettings();
    states.clear();

    if (settings.enable) {
      for (const folder of folders) {
        for (const { root, ignore } of projectsIn(folder)) {
          try {
            const { config, notes } = readStaticConfig(root, settings.configPath);
            for (const note of notes) connection.console.info(`[${root}] ${note}`);

            const result = await analyzeProject({
              root,
              config,
              runtime: false,
              ignore,
              unused: settings.unusedKeys,
              cache,
            });
            states.set(root, {
              model: buildModel(root, config.defaultLocale, result),
              issues: result.issues,
            });
          } catch (error) {
            connection.console.error(`[${root}] analysis failed: ${(error as Error).message}`);
          }
        }
      }
    }
    publish();
  }

  function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 300);
  }

  connection.onInitialize((params: InitializeParams): InitializeResult => {
    folders = (params.workspaceFolders ?? [])
      .map((folder) => uriToPath(folder.uri))
      .filter((path): path is string => path !== undefined);
    if (folders.length === 0 && params.rootUri) {
      const root = uriToPath(params.rootUri);
      if (root) folders = [root];
    }
    canConfigure = params.capabilities.workspace?.configuration === true;

    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          save: { includeText: false },
        },
        hoverProvider: true,
      },
      serverInfo: { name: "dialex-language-server" },
    };
  });

  connection.onInitialized(async () => {
    try {
      await connection.client.register(DidChangeWatchedFilesNotification.type, {
        watchers: WATCHED_GLOBS.map((globPattern) => ({ globPattern })),
      });
    } catch {
      // the client does not support dynamic watcher registration; saves still refresh
    }
    schedule();
  });

  connection.onDidChangeConfiguration(() => schedule());

  connection.onDidChangeWatchedFiles(({ changes }) => {
    // An edit cannot change which projects exist; a file appearing or disappearing can.
    if (changes.some((change) => change.type !== FileChangeType.Changed)) projectCache.clear();
    if (changes.some((change) => change.uri.endsWith(".gitignore"))) forgetLayout();
    schedule();
  });

  documents.onDidSave(() => schedule());

  connection.onHover((params): Hover | null => {
    if (!settings.enable) return null;
    const document = documents.get(params.textDocument.uri);
    const file = uriToPath(params.textDocument.uri);
    if (!document || !file) return null;

    const model = modelForFile(
      [...states.values()].map((state) => state.model),
      file,
    );
    if (!model) return null;

    const lineText = document
      .getText({
        start: { line: params.position.line, character: 0 },
        end: { line: params.position.line + 1, character: 0 },
      })
      .replace(/\r?\n$/, "");
    const ref = findReferenceAt(lineText, params.position.character);
    const markdown = ref ? buildHover(model, ref) : undefined;
    if (!ref || !markdown) return null;

    return {
      contents: { kind: "markdown", value: markdown },
      range: {
        start: { line: params.position.line, character: ref.start },
        end: { line: params.position.line, character: ref.end },
      },
    };
  });

  documents.listen(connection);

  return { refresh };
}
