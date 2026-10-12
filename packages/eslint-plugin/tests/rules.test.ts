import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Linter } from "eslint";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import plugin from "../src/index.js";
import { resetProjects } from "../src/project.js";

const home = `export default {
  name: "home",
  dictionary: {
    en: { title: "Welcome", nav: { about: "About" } },
    tr: { title: "Hoş Geldiniz" },
  },
};
`;

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-eslint-"));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  write("dialex.config.ts", `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`);
  write("src/home.content.ts", home);
  write(
    "src/server.ts",
    `createDialexServer({ dictionaries: { bench: { en: { lookup: "x" } } } });\n`,
  );
  resetProjects();
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function lint(code: string, rules: Linter.RulesRecord, file = "src/app.tsx") {
  const linter = new Linter({ configType: "flat", cwd: dir });
  return linter
    .verify(
      code,
      [
        {
          files: ["**/*.ts", "**/*.tsx"],
          plugins: { dialex: plugin },
          languageOptions: {
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          rules,
        },
      ],
      { filename: path.join(dir, file) },
    )
    .map((m) => `${m.ruleId}: ${m.message}`);
}

describe("no-unknown-dictionary", () => {
  const rules = { "dialex/no-unknown-dictionary": "error" } as const;

  it("reports names that are neither files nor registered inline", () => {
    expect(
      lint(`getDictionary("nope"); getDictionary("home"); getDictionary("bench");`, rules),
    ).toEqual(['dialex/no-unknown-dictionary: Unknown dictionary "nope"']);
  });

  it("ignores comments, method calls and computed names", () => {
    expect(
      lint(
        `// getDictionary("nope")\nobj.getDictionary("nope");\ngetDictionary(name);\nuseDictionary(\`nope\`);`,
        rules,
      ),
    ).toEqual(['dialex/no-unknown-dictionary: Unknown dictionary "nope"']);
  });

  it("does nothing outside a Dialex project", () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-eslint-none-"));
    try {
      const linter = new Linter({ configType: "flat", cwd: other });
      const messages = linter.verify(
        `getDictionary("nope");`,
        [{ files: ["**/*.ts"], plugins: { dialex: plugin }, rules }],
        { filename: path.join(other, "a.ts") },
      );
      expect(messages).toEqual([]);
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });
});

describe("no-unknown-path", () => {
  const rules = { "dialex/no-unknown-path": "error" } as const;

  it("reports missing keys of known dictionaries only", () => {
    expect(
      lint(
        `t("home.title"); t("home.nav"); t("home.nav.nope"); t("other.x.y"); i18n.t("home.zzz");`,
        rules,
      ),
    ).toEqual(['dialex/no-unknown-path: Unknown translation path "home.nav.nope"']);
  });
});

describe("no-dynamic-key", () => {
  const rules = { "dialex/no-dynamic-key": "warn" } as const;

  it("flags computed dictionary names", () => {
    expect(lint(`getDictionary(name); getDictionary("home");`, rules)).toEqual([
      "dialex/no-dynamic-key: This dictionary name is computed, so Dialex cannot check it. Use a string literal.",
    ]);
  });

  it("flags a bare t() only when the file imports Dialex", () => {
    expect(lint(`t(key);`, rules)).toEqual([]);
    expect(
      lint(`import { t } from "dialexjs/react";\nt(key);\nt(\`home.\${x}\`);`, rules),
    ).toHaveLength(2);
  });
});

describe("no-literal-string", () => {
  const rules = { "dialex/no-literal-string": "warn" } as const;

  it("flags text and chosen attributes, skipping symbols and ignored components", () => {
    expect(
      lint(
        `const a = <div title="Close">Hello world<span>·</span><code>raw text</code>{t("home.title")}</div>;`,
        rules,
      ),
    ).toEqual([
      'dialex/no-literal-string: Move "Close" into a dictionary',
      'dialex/no-literal-string: Move "Hello world" into a dictionary',
    ]);
  });
});

describe("valid-dictionary", () => {
  const rules = { "dialex/valid-dictionary": "error" } as const;

  it("reports what dialex check finds, from the unsaved buffer", () => {
    expect(lint(home, rules, "src/home.content.ts")).toEqual([
      'dialex/valid-dictionary: Locale "tr" is missing key "nav.about" (missing-key)',
    ]);
    const fixed = home.replace(
      'tr: { title: "Hoş Geldiniz" }',
      'tr: { title: "Hoş Geldiniz", nav: { about: "Hakkında" } }',
    );
    expect(lint(fixed, rules, "src/home.content.ts")).toEqual([]);
  });

  it("skips files that are not dictionaries", () => {
    expect(lint(home, rules, "src/other.ts")).toEqual([]);
  });

  it("honours the ignore option", () => {
    const messages = lint(
      home,
      { "dialex/valid-dictionary": ["error", { ignore: ["missing-key"] }] },
      "src/home.content.ts",
    );
    expect(messages).toEqual([]);
  });
});

it("exposes recommended and all configs", () => {
  expect(plugin.configs.recommended.rules).toMatchObject({ "dialex/no-unknown-path": "error" });
  expect(plugin.configs.all.rules).toMatchObject({ "dialex/no-literal-string": "warn" });
  expect(Object.keys(plugin.rules).sort()).toEqual([
    "no-dynamic-key",
    "no-literal-string",
    "no-unknown-dictionary",
    "no-unknown-path",
    "valid-dictionary",
  ]);
});

describe("lint.rules in dialex.config.ts", () => {
  let configured: string;
  beforeAll(() => {
    configured = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-eslint-lint-"));
    const write = (rel: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(configured, rel)), { recursive: true });
      fs.writeFileSync(path.join(configured, rel), text);
    };
    write(
      "dialex.config.ts",
      `export default {
        defaultLocale: "en",
        locales: ["en", "tr"],
        lint: { rules: {
          "unknown-dictionary": "off",
          "missing-key": "warn",
          "no-dynamic-key": "off",
          "dynamic-key": "off",
          "literal-string": ["warn", { ignore: ["^Skip"] }],
        } },
      };\n`,
    );
    write("src/home.content.ts", home);
    resetProjects();
  });
  afterAll(() => fs.rmSync(configured, { recursive: true, force: true }));

  const run = (code: string, rules: Linter.RulesRecord, file = "src/app.tsx") =>
    new Linter({ configType: "flat", cwd: configured })
      .verify(
        code,
        [
          {
            files: ["**/*.ts", "**/*.tsx"],
            plugins: { dialex: plugin },
            languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
            rules,
          },
        ],
        { filename: path.join(configured, file) },
      )
      .map((m) => `${m.ruleId}: ${m.message}`);

  it("silences a rule the config turns off", () => {
    expect(run(`getDictionary("nope");`, { "dialex/no-unknown-dictionary": "error" })).toEqual([]);
    expect(run(`getDictionary(name);`, { "dialex/no-dynamic-key": "warn" })).toEqual([]);
  });

  it("takes rule options from the config, letting the rule's own options win", () => {
    const code = `const a = <p>Skip this</p>; const b = <p>Show this</p>;`;
    expect(run(code, { "dialex/no-literal-string": "warn" })).toEqual([
      'dialex/no-literal-string: Move "Show this" into a dictionary',
    ]);
    expect(run(code, { "dialex/no-literal-string": ["warn", { ignore: ["^Show"] }] })).toEqual([
      'dialex/no-literal-string: Move "Skip this" into a dictionary',
    ]);
  });

  it("still reports dictionary issues the config sets to warn", () => {
    const messages = run(home, { "dialex/valid-dictionary": "error" }, "src/home.content.ts");
    expect(messages).toEqual([
      'dialex/valid-dictionary: Locale "tr" is missing key "nav.about" (missing-key)',
    ]);
  });
});
