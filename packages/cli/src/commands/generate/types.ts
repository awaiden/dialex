export interface GenerateOptions {
  cwd?: string;
  watch?: boolean;
  output?: string;
  config?: string;
  json?: boolean;
  /**
   * Read `dialex.config.*` from its syntax tree instead of running it, so no project code
   * executes (used by the editor extension). Settings that are not literals fall back to defaults.
   */
  static?: boolean;
}

export interface RenderedGenerate {
  /** Absolute paths of the dictionary files, sorted. */
  files: string[];
  /** Where `dialex.generated.ts` goes, and what it should contain. */
  outputPath: string;
  content: string;
  /** Where `dialex-env.d.ts` goes, and what it should contain (absent without dictionaries). */
  dtsPath: string;
  dtsContent?: string;
  /** The config file that was read, if there is one. Without it every default applies. */
  configFile?: string;
  /** Per-locale modules for `lazy: "locale"`, written next to the generated file. */
  extraFiles: { path: string; content: string }[];
  /** Things worth telling the user, such as a dictionary that could not be split by locale. */
  notes: string[];
}
