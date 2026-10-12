import type { Rule } from "eslint";

import { projectFor, settingOf } from "../project.js";
import { KEY_PATH, callKind, filenameOf, staticString } from "../references.js";

export const noUnknownPath: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `t()` keys that the dictionary does not have",
      url: "https://github.com/awaiden/dialex/blob/main/apps/docs/docs/guide/linting.md#no-unknown-path",
    },
    schema: [],
    messages: { unknown: 'Unknown translation path "{{path}}"' },
  },
  create(context) {
    const project = projectFor(filenameOf(context));
    if (!project || settingOf(project.config, "unknown-path").level === "off") return {};
    return {
      CallExpression(node) {
        if (callKind(node) !== "path") return;
        const argument = node.arguments[0];
        const value = staticString(argument);
        if (!value || !argument || !KEY_PATH.test(value)) return;

        const [name, ...rest] = value.split(".");
        const dictionary = project.dictionaries.get(name);
        if (!dictionary) return; // `t(...)` may belong to another library
        const keyPath = rest.join(".");
        const exists = dictionary.paths.some((p) => p === keyPath || p.startsWith(`${keyPath}.`));
        if (!exists)
          context.report({ node: argument, messageId: "unknown", data: { path: value } });
      },
    };
  },
};
