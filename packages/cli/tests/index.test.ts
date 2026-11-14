import { CommanderError } from "commander";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import pkg from "../package.json" with { type: "json" };

const mocks = vi.hoisted(() => ({
  runGenerate: vi.fn(),
  runInit: vi.fn(),
  runCheck: vi.fn(),
  runExport: vi.fn(),
  runImport: vi.fn(),
  runTranslate: vi.fn(),
  runLock: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../src/commands/generate/index.js", () => ({ runGenerate: mocks.runGenerate }));
vi.mock("../src/commands/init/index.js", () => ({ runInit: mocks.runInit }));
vi.mock("../src/commands/check/index.js", () => ({ runCheck: mocks.runCheck }));
vi.mock("../src/commands/export.js", () => ({ runExport: mocks.runExport }));
vi.mock("../src/commands/import/index.js", () => ({ runImport: mocks.runImport }));
vi.mock("../src/commands/translate.js", () => ({ runTranslate: mocks.runTranslate }));
vi.mock("../src/commands/lock.js", () => ({ runLock: mocks.runLock }));
vi.mock("../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
    log: vi.fn(),
  },
}));

import { createProgram } from "../src/index.js";

function runCli(args: string[]) {
  let stdout = "";
  let stderr = "";
  const program = createProgram();
  const outputConfig = {
    writeOut: (str: string) => {
      stdout += str;
    },
    writeErr: (str: string) => {
      stderr += str;
    },
  };
  program.exitOverride();
  program.configureOutput(outputConfig);
  for (const cmd of program.commands) {
    cmd.exitOverride();
    cmd.configureOutput(outputConfig);
  }
  return {
    stdout: () => stdout,
    stderr: () => stderr,
    exec: () => program.parseAsync(["node", "dialex", ...args]),
  };
}

describe("CLI entrypoint (src/index.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prints help and exits with code 0 on --help", async () => {
    const cli = runCli(["--help"]);
    let err: unknown;
    try {
      await cli.exec();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CommanderError);
    expect((err as CommanderError).exitCode).toBe(0);
    expect(cli.stdout()).toContain("Dialex CLI");
    expect(cli.stdout()).toContain("generate");
    expect(cli.stdout()).toContain("check");
  });

  it("prints package version and exits with code 0 on --version", async () => {
    const cli = runCli(["--version"]);
    let err: unknown;
    try {
      await cli.exec();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CommanderError);
    expect((err as CommanderError).exitCode).toBe(0);
    expect(cli.stdout().trim()).toBe(pkg.version);
  });

  it("exits with code 1 on unknown command", async () => {
    const cli = runCli(["nonexistent"]);
    let err: unknown;
    try {
      await cli.exec();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CommanderError);
    expect((err as CommanderError).exitCode).toBe(1);
    expect(cli.stderr()).toContain("unknown command");
  });

  it("exits with code 1 on unknown option", async () => {
    const cli = runCli(["check", "--bogus-flag"]);
    let err: unknown;
    try {
      await cli.exec();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CommanderError);
    expect((err as CommanderError).exitCode).toBe(1);
    expect(cli.stderr()).toContain("unknown option");
  });

  it("dispatches generate (and gen alias) with parsed options", async () => {
    await runCli(["gen", "-w", "-o", "dist/out.ts", "-c", "custom.config.ts", "--json"]).exec();
    expect(mocks.runGenerate).toHaveBeenCalledWith({
      watch: true,
      output: "dist/out.ts",
      config: "custom.config.ts",
      json: true,
    });
  });

  it("dispatches init with parsed options including --no-ai", async () => {
    await runCli(["init", "-f", "hono", "-d", "en", "-l", "en,tr", "-y", "--no-ai"]).exec();
    expect(mocks.runInit).toHaveBeenCalledWith({
      framework: "hono",
      defaultLocale: "en",
      locales: "en,tr",
      yes: true,
      ai: false,
    });
  });

  it("dispatches check (and lint alias) with parsed options", async () => {
    await runCli([
      "lint",
      "--json",
      "--github",
      "--fix",
      "--fail-on-stale",
      "--src",
      "src/**/*.ts",
    ]).exec();
    expect(mocks.runCheck).toHaveBeenCalledWith({
      json: true,
      github: true,
      fix: true,
      failOnStale: true,
      src: ["src/**/*.ts"],
    });
  });

  it("dispatches export and import subcommands with parsed options", async () => {
    await runCli(["export", "-f", "csv", "-o", "out", "-l", "en", "tr", "--json"]).exec();
    expect(mocks.runExport).toHaveBeenCalledWith({
      format: "csv",
      out: "out",
      locale: ["en", "tr"],
      json: true,
    });

    await runCli(["import", "tr.json", "-f", "json", "-l", "tr", "--allow-new"]).exec();
    expect(mocks.runImport).toHaveBeenCalledWith({
      file: "tr.json",
      format: "json",
      locale: "tr",
      allowNew: true,
    });
  });

  it("handles translate errors with process.exit(1) in human and --json modes", async () => {
    mocks.runTranslate.mockRejectedValue(new Error("Missing API key"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`EXIT:${code}`);
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(runCli(["translate"]).exec()).rejects.toThrow("EXIT:1");
      expect(mocks.loggerError).toHaveBeenCalledWith("Missing API key");

      await expect(runCli(["translate", "--json"]).exec()).rejects.toThrow("EXIT:1");
      expect(JSON.parse(logSpy.mock.calls[0][0] as string)).toEqual({
        success: false,
        error: "Missing API key",
      });
    } finally {
      exitSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("handles lock errors with process.exit(1)", async () => {
    mocks.runLock.mockRejectedValue(new Error("Lock failed"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`EXIT:${code}`);
    });
    try {
      await expect(runCli(["lock", "--all"]).exec()).rejects.toThrow("EXIT:1");
      expect(mocks.runLock).toHaveBeenCalledWith({ all: true });
      expect(mocks.loggerError).toHaveBeenCalledWith("Lock failed");
    } finally {
      exitSpy.mockRestore();
    }
  });
});
