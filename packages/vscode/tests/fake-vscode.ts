import fs from "node:fs";

/**
 * A minimal in-memory stand-in for the `vscode` module: just enough surface to run the
 * extension's activation and call its providers. It records what gets registered.
 * It is not VS Code, so it can only show that the wiring matches how this code uses the API.
 */

export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
}

export class Range {
  start: Position;
  end: Position;
  constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
    if (typeof a === "number") {
      this.start = new Position(a, b as number);
      this.end = new Position(c as number, d as number);
    } else {
      this.start = a;
      this.end = b as Position;
    }
  }
}

export const Uri = {
  file: (fsPath: string) => ({ fsPath, scheme: "file", toString: () => `file://${fsPath}` }),
};

export const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };
export const DiagnosticTag = { Unnecessary: 1, Deprecated: 2 };
export const CompletionItemKind = { Text: 0, Module: 8, Folder: 18 };
export const CodeActionKind = { QuickFix: "quickfix" };

export class Diagnostic {
  source?: string;
  code?: string | number;
  tags?: number[];
  constructor(
    public range: Range,
    public message: string,
    public severity: number,
  ) {}
}

export class MarkdownString {
  supportHtml = false;
  constructor(public value: string) {}
}

export class Hover {
  constructor(
    public contents: MarkdownString,
    public range: Range,
  ) {}
}

export class Location {
  constructor(
    public uri: ReturnType<typeof Uri.file>,
    public range: Range,
  ) {}
}

export class CompletionItem {
  detail?: string;
  insertText?: string;
  range?: Range;
  command?: { command: string; title: string };
  constructor(
    public label: string,
    public kind: number,
  ) {}
}

export class CodeAction {
  diagnostics?: Diagnostic[];
  edit?: WorkspaceEdit;
  isPreferred?: boolean;
  constructor(
    public title: string,
    public kind: string,
  ) {}
}

export class WorkspaceEdit {
  edits: { uri: ReturnType<typeof Uri.file>; range: Range; text: string }[] = [];
  replace(uri: ReturnType<typeof Uri.file>, range: Range, text: string) {
    this.edits.push({ uri, range, text });
  }
}

export interface FakeDocument {
  uri: ReturnType<typeof Uri.file>;
  lineCount: number;
  getText(): string;
  lineAt(line: number): { text: string };
  positionAt(offset: number): Position;
}

export function createDocument(
  fsPath: string,
  text = fs.readFileSync(fsPath, "utf-8"),
): FakeDocument {
  const lines = text.split("\n");
  return {
    uri: Uri.file(fsPath),
    lineCount: lines.length,
    getText: () => text,
    lineAt: (line) => ({ text: lines[line] ?? "" }),
    positionAt: (offset) => {
      const before = text.slice(0, offset).split("\n");
      return new Position(before.length - 1, before[before.length - 1].length);
    },
  };
}

type Handler = (...args: any[]) => unknown;

/** What the extension registered and what the "editor" holds. */
export const state = {
  folders: [] as { uri: ReturnType<typeof Uri.file> }[],
  settings: {} as Record<string, unknown>,
  hover: undefined as { selector: any; provider: any } | undefined,
  definition: undefined as { selector: any; provider: any } | undefined,
  completion: undefined as { selector: any; provider: any; triggers: string[] } | undefined,
  codeActions: undefined as { selector: any; provider: any; metadata: any } | undefined,
  commands: new Map<string, Handler>(),
  watchers: [] as {
    pattern: string;
    fire: { create: Handler; change: Handler; delete: Handler };
  }[],
  saveHandlers: [] as Handler[],
  configHandlers: [] as Handler[],
  collection: { entries: new Map<string, Diagnostic[]>(), cleared: 0, disposed: false },
  output: [] as string[],
  status: [] as string[],
};

export function resetState() {
  Object.assign(state, {
    folders: [],
    settings: {},
    hover: undefined,
    definition: undefined,
    completion: undefined,
    codeActions: undefined,
    commands: new Map(),
    watchers: [],
    saveHandlers: [],
    configHandlers: [],
    output: [],
    status: [],
  });
  state.collection = { entries: new Map(), cleared: 0, disposed: false };
}

const disposable = () => ({ dispose() {} });

export const languages = {
  createDiagnosticCollection: () => ({
    set: (uri: { fsPath: string }, diagnostics: Diagnostic[]) =>
      void state.collection.entries.set(uri.fsPath, diagnostics),
    clear: () => {
      state.collection.entries.clear();
      state.collection.cleared++;
    },
    dispose: () => void (state.collection.disposed = true),
  }),
  registerHoverProvider: (selector: any, provider: any) => {
    state.hover = { selector, provider };
    return disposable();
  },
  registerDefinitionProvider: (selector: any, provider: any) => {
    state.definition = { selector, provider };
    return disposable();
  },
  registerCompletionItemProvider: (selector: any, provider: any, ...triggers: string[]) => {
    state.completion = { selector, provider, triggers };
    return disposable();
  },
  registerCodeActionsProvider: (selector: any, provider: any, metadata: any) => {
    state.codeActions = { selector, provider, metadata };
    return disposable();
  },
};

export const window = {
  createOutputChannel: () => ({
    appendLine: (line: string) => void state.output.push(line),
    dispose() {},
  }),
  setStatusBarMessage: (message: string) => void state.status.push(message),
};

export const commands = {
  registerCommand: (id: string, handler: Handler) => {
    state.commands.set(id, handler);
    return disposable();
  },
};

export const workspace = {
  get workspaceFolders() {
    return state.folders;
  },
  getConfiguration: () => ({
    get: (key: string, fallback?: unknown) =>
      key in state.settings ? state.settings[key] : fallback,
  }),
  createFileSystemWatcher: (pattern: string) => {
    const fire = { create: () => {}, change: () => {}, delete: () => {} };
    state.watchers.push({ pattern, fire });
    return {
      onDidCreate: (h: Handler) => void (fire.create = h),
      onDidChange: (h: Handler) => void (fire.change = h),
      onDidDelete: (h: Handler) => void (fire.delete = h),
      dispose() {},
    };
  },
  onDidSaveTextDocument: (h: Handler) => {
    state.saveHandlers.push(h);
    return disposable();
  },
  onDidChangeWorkspaceFolders: () => disposable(),
  onDidChangeConfiguration: (h: Handler) => {
    state.configHandlers.push(h);
    return disposable();
  },
  openTextDocument: async (uri: { fsPath: string }) => createDocument(uri.fsPath),
};
