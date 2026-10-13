import {
  analyzeProject,
  clearGitignore,
  createAnalysisCache,
  readStaticConfig,
  type AnalysisIssue,
} from "@dialexjs/cli/api";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  CodeActionKind,
  DidChangeWatchedFilesNotification,
  FileChangeType,
  TextDocumentSyncKind,
  TextDocuments,
  type Connection,
  type InitializeParams,
  type InitializeResult,
} from "vscode-languageserver/node.js";

import {
  buildModel,
  discoverProjects,
  modelForFile,
  type ProjectModel,
  type ProjectRoot,
} from "./features.js";
import { uriToPath } from "./server/convert.js";
import { createPublisher } from "./server/diagnostics.js";
import { createGeneration } from "./server/generation.js";
import {
  codeActionHandler,
  completionHandler,
  definitionHandler,
  hoverHandler,
} from "./server/handlers.js";
import {
  applyClientSettings,
  DEFAULT_SETTINGS,
  WATCHED_GLOBS,
  type Settings,
} from "./server/settings.js";

export type { Settings } from "./server/settings.js";

interface ProjectState {
  model: ProjectModel;
  issues: AnalysisIssue[];
}

export interface DialexServer {
  /** Re-analyze every project now and publish diagnostics. */
  refresh(): Promise<void>;
  /** Regenerate the generated files of every project that has them, now. */
  regenerate(): Promise<void>;
  /** Stop file watchers and timers. */
  dispose(): Promise<void>;
}

/**
 * Wires Dialex's editor features to an LSP connection. Nothing in the project is executed:
 * dictionaries and configs are read from the syntax tree (`runtime: false`).
 */
export function createServer(connection: Connection): DialexServer {
  const documents = new TextDocuments(TextDocument);
  const cache = createAnalysisCache();
  const states = new Map<string, ProjectState>();
  const projectCache = new Map<string, ProjectRoot[]>();
  const publish = createPublisher(connection);

  let folders: string[] = [];
  let canConfigure = false;
  let settings: Settings = { ...DEFAULT_SETTINGS };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generateTimer: ReturnType<typeof setTimeout> | undefined;
  /** True when the client sends file events itself; otherwise the server watches the disk. */
  let clientWatches = false;

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

  const generation = createGeneration({
    connection,
    folders: () => folders,
    projectsIn,
    settings: () => settings,
    clientWatches: () => clientWatches,
    afterWatchRegenerate: () => schedule(),
  });

  async function loadSettings(): Promise<void> {
    settings = { ...DEFAULT_SETTINGS };
    if (!canConfigure) return;
    try {
      applyClientSettings(settings, await connection.workspace.getConfiguration("dialex"));
    } catch {
      // the client does not answer configuration requests; keep the defaults
    }
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
    publish(settings.diagnostics ? allIssues() : []);
    await generation.syncWatchers();
  }

  function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 300);
  }

  function scheduleGenerate(): void {
    if (generateTimer) clearTimeout(generateTimer);
    generateTimer = setTimeout(() => void generation.regenerate(), 250);
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
    clientWatches =
      params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration === true;

    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          save: { includeText: false },
        },
        hoverProvider: true,
        definitionProvider: true,
        completionProvider: { triggerCharacters: ['"', "'", "`", "."] },
        codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
      },
      serverInfo: { name: "dialex-language-server" },
    };
  });

  connection.onInitialized(async () => {
    if (clientWatches) {
      try {
        await connection.client.register(DidChangeWatchedFilesNotification.type, {
          watchers: WATCHED_GLOBS.map((globPattern) => ({ globPattern })),
        });
      } catch {
        // the client refused; the server watches the disk itself
        clientWatches = false;
      }
    }
    schedule();
    scheduleGenerate();
  });

  connection.onDidChangeConfiguration(() => schedule());

  connection.onDidChangeWatchedFiles(({ changes }) => {
    // An edit cannot change which projects exist; a file appearing or disappearing can.
    if (changes.some((change) => change.type !== FileChangeType.Changed)) projectCache.clear();
    if (changes.some((change) => change.uri.endsWith(".gitignore"))) forgetLayout();
    schedule();
    scheduleGenerate();
  });

  documents.onDidSave(() => {
    schedule();
    scheduleGenerate();
  });

  connection.onShutdown(() => dispose());

  /** The project model for a file, unless the features are turned off. */
  const modelFor = (file: string): ProjectModel | undefined =>
    settings.enable
      ? modelForFile(
          [...states.values()].map((state) => state.model),
          file,
        )
      : undefined;

  /** The issues of every project, in project order. */
  const allIssues = (): AnalysisIssue[] => [...states.values()].flatMap((state) => state.issues);

  const handlers = { documents, modelFor, issues: allIssues, enabled: () => settings.enable };
  connection.onHover(hoverHandler(handlers));
  connection.onDefinition(definitionHandler(handlers));
  connection.onCompletion(completionHandler(handlers));
  connection.onCodeAction(codeActionHandler(handlers));

  documents.listen(connection);

  async function dispose(): Promise<void> {
    if (timer) clearTimeout(timer);
    if (generateTimer) clearTimeout(generateTimer);
    await generation.dispose();
  }

  return { refresh, regenerate: generation.regenerate, dispose };
}
