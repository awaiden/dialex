export interface CheckOptions {
  cwd?: string;
  config?: string;
  exitOnError?: boolean;
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
  /** Also print GitHub Actions workflow annotations. */
  github?: boolean;
  /** Insert missing keys (marked with `[TODO]`) before checking. */
  fix?: boolean;
  /** Globs of source files to scan for dictionary references. */
  src?: string[];
  /** Report translations whose source text changed since they were translated as errors. */
  failOnStale?: boolean;
}

export interface CheckAnnotation {
  level: "error" | "warning";
  message: string;
  line?: number;
}

export interface CheckDiagnostic {
  file: string;
  name?: string;
  errors: string[];
  warnings: string[];
  annotations: CheckAnnotation[];
}

export interface CheckResult {
  success: boolean;
  diagnostics: CheckDiagnostic[];
  totalIssues: number;
  totalWarnings: number;
  /** Number of missing keys inserted by `--fix`, plus generated files it rewrote. */
  fixed: number;
}
