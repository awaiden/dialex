import type { Rule } from "eslint";

import { projectFor, settingOf } from "../project.js";
import { callKind, filenameOf, isDialexModule, staticString } from "../references.js";

export const noDynamicKey: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow dictionary names and keys that Dialex cannot check statically",
      url: "https://github.com/awaiden/dialex/blob/main/apps/docs/docs/guide/linting.md#no-dynamic-key",
    },
    schema: [],
    messages: {
      dynamic: "This {{what}} is computed, so Dialex cannot check it. Use a string literal.",
    },
  },
  create(context) {
    const project = projectFor(filenameOf(context));
    if (project && settingOf(project.config, "dynamic-key").level === "off") return {};

    // A bare `t` is only ours when the file imports Dialex: i18next and others use the name too.
    let importsDialex = false;
    return {
      ImportDeclaration(node) {
        if (isDialexModule(node.source.value)) importsDialex = true;
      },
      CallExpression(node) {
        const kind = callKind(node);
        if (!kind) return;
        if (kind === "path" && !importsDialex) return;
        const argument = node.arguments[0];
        if (!argument || argument.type === "SpreadElement") return;
        if (staticString(argument) !== undefined) return;
        context.report({
          node: argument,
          messageId: "dynamic",
          data: { what: kind === "dictionary" ? "dictionary name" : "key" },
        });
      },
    };
  },
};
