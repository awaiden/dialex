import type { AnalysisIssue } from "@dialexjs/cli/api";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("vscode", async () => await import("./fake-vscode.js"));

import {
  COMPLETION_KINDS,
  SOURCE_LANGUAGES,
  fullRange,
  severityOf,
  toDiagnostic,
} from "../src/convert.js";
import * as fake from "./fake-vscode.js";

function makeIssue(overrides: Partial<AnalysisIssue> = {}): AnalysisIssue {
  return {
    code: "missing-key",
    level: "error",
    message: "Missing key",
    file: "/project/src/home.content.ts",
    ...overrides,
  };
}

describe("convert", () => {
  it("lists supported source languages and completion kinds", () => {
    expect(SOURCE_LANGUAGES).toContain("typescript");
    expect(SOURCE_LANGUAGES).toContain("vue");
    expect(COMPLETION_KINDS).toEqual({
      dictionary: fake.CompletionItemKind.Module,
      group: fake.CompletionItemKind.Folder,
      leaf: fake.CompletionItemKind.Text,
    });
  });

  it("computes fullRange from start to end of document", () => {
    const empty = fake.createDocument("/project/a.ts", "");
    expect(fullRange(empty as any)).toMatchObject({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    });

    const multi = fake.createDocument("/project/b.ts", "first\nsecond");
    expect(fullRange(multi as any)).toMatchObject({
      start: { line: 0, character: 0 },
      end: { line: 1, character: 6 },
    });
  });

  it("maps issue codes and levels to VS Code diagnostic severities", () => {
    expect(severityOf(makeIssue({ code: "unused-key", level: "warning" }))).toBe(
      fake.DiagnosticSeverity.Hint,
    );
    expect(severityOf(makeIssue({ code: "unused-dictionary", level: "error" }))).toBe(
      fake.DiagnosticSeverity.Hint,
    );
    expect(severityOf(makeIssue({ code: "missing-key", level: "error" }))).toBe(
      fake.DiagnosticSeverity.Error,
    );
    expect(severityOf(makeIssue({ code: "missing-key", level: "warning" }))).toBe(
      fake.DiagnosticSeverity.Warning,
    );
    expect(severityOf(makeIssue({ code: "missing-key", level: "info" }))).toBe(
      fake.DiagnosticSeverity.Information,
    );
  });

  it("converts an AnalysisIssue with a range into a VS Code Diagnostic", () => {
    const diagnostic = toDiagnostic(
      makeIssue({
        code: "unknown-path",
        level: "warning",
        message: 'Unknown path "a.b"',
        range: {
          start: { line: 2, column: 4 },
          end: { line: 2, column: 9 },
        },
      }),
    );

    expect(diagnostic.range).toMatchObject({
      start: { line: 2, character: 4 },
      end: { line: 2, character: 9 },
    });
    expect(diagnostic.message).toBe('Unknown path "a.b"');
    expect(diagnostic.severity).toBe(fake.DiagnosticSeverity.Warning);
    expect(diagnostic.source).toBe("dialex");
    expect(diagnostic.code).toBe("unknown-path");
    expect(diagnostic.tags).toBeUndefined();
  });

  it("defaults to zero range when issue has no range and tags unused issues as Unnecessary", () => {
    const diagnostic = toDiagnostic(
      makeIssue({
        code: "unused-key",
        level: "warning",
        message: "Unused key",
        range: undefined,
      }),
    );

    expect(diagnostic.range).toMatchObject({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    });
    expect(diagnostic.severity).toBe(fake.DiagnosticSeverity.Hint);
    expect(diagnostic.tags).toEqual([fake.DiagnosticTag.Unnecessary]);
  });
});
