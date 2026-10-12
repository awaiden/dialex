import type { Rule } from "eslint";

import { projectFor, settingOf } from "../project.js";
import { callKind, filenameOf, staticString } from "../references.js";

export const noUnknownDictionary: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow reading a dictionary that does not exist",
      url: "https://github.com/awaiden/dialex/blob/main/apps/docs/docs/guide/linting.md#no-unknown-dictionary",
    },
    schema: [],
    messages: { unknown: 'Unknown dictionary "{{name}}"' },
  },
  create(context) {
    const project = projectFor(filenameOf(context));
    if (!project || settingOf(project.config, "unknown-dictionary").level === "off") return {};
    return {
      CallExpression(node) {
        if (callKind(node) !== "dictionary") return;
        const argument = node.arguments[0];
        const name = staticString(argument);
        if (!name || !argument) return;
        if (project.dictionaries.has(name) || project.inline.has(name)) return;
        context.report({ node: argument, messageId: "unknown", data: { name } });
      },
    };
  },
};
