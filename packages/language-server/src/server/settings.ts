/** What the client can configure under the `dialex` section. */
export interface Settings {
  /** Turn diagnostics, hover and the other features off. */
  enable: boolean;
  /**
   * Publish problems. Turn off when the ESLint or oxlint plugin reports them, to avoid showing
   * each twice; hover, completion and quick fixes keep working.
   */
  diagnostics: boolean;
  /** Fade out keys and dictionaries that no source file seems to use. */
  unusedKeys: boolean;
  /**
   * Regenerate `dialex.generated.ts` and `dialex-env.d.ts` when a dictionary or config file
   * changes, in projects that already have a generated file.
   */
  autoGenerate: boolean;
  /** Path to the Dialex config file, relative to each project root. */
  configPath?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enable: true,
  diagnostics: true,
  unusedKeys: false,
  autoGenerate: true,
};

/** Files whose creation or removal can change the set of Dialex projects or what is scanned. */
export const WATCHED_GLOBS = [
  "**/*.content.ts",
  "**/dialex.config.*",
  "**/i18n.config.*",
  "**/.gitignore",
];

/** Copies the values the client sent for the `dialex` section onto `settings`. */
export function applyClientSettings(settings: Settings, value: unknown): void {
  const sent = value as Partial<Settings> | null | undefined;
  if (sent && typeof sent === "object") {
    if (typeof sent.enable === "boolean") settings.enable = sent.enable;
    if (typeof sent.diagnostics === "boolean") settings.diagnostics = sent.diagnostics;
    if (typeof sent.unusedKeys === "boolean") settings.unusedKeys = sent.unusedKeys;
    if (typeof sent.autoGenerate === "boolean") settings.autoGenerate = sent.autoGenerate;
    if (typeof sent.configPath === "string" && sent.configPath) {
      settings.configPath = sent.configPath;
    }
  }
}
