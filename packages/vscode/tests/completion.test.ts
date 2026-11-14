import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("vscode", async () => await import("./fake-vscode.js"));
vi.mock("@dialexjs/language-server/features", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dialexjs/language-server/features")>();
  return {
    ...actual,
    completionContextAt: () => ({ kind: "path", dictionary: "home", typed: "", length: 0 }),
    completionEntries: () => [
      {
        label: "title",
        kind: "leaf",
        detail: "Home",
        insertText: "title",
        retrigger: false,
        documentation: "Full translation preview",
      },
      {
        label: "nav",
        kind: "group",
        detail: "keys…",
        insertText: "nav.",
        retrigger: true,
      },
    ],
  };
});

import { completionProvider } from "../src/providers/completion.js";
import * as fake from "./fake-vscode.js";

describe("completionProvider", () => {
  it("attaches documentation when present on a completion entry", () => {
    const provider = completionProvider({
      modelFor: () => ({}) as any,
    } as any);
    const doc = fake.createDocument("/project/app.ts", 't("home.') as any;
    const items = provider.provideCompletionItems(
      doc,
      new fake.Position(0, 8) as any,
      {} as any,
      {} as any,
    ) as fake.CompletionItem[];

    expect(items).toHaveLength(2);
    expect(items[0].documentation).toBe("Full translation preview");
    expect(items[1].documentation).toBeUndefined();
  });
});
