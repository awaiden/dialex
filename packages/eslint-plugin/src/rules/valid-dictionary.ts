import type { Rule } from "eslint";

import { dictionaryIssues, projectFor } from "../project.js";
import { filenameOf, sourceTextOf } from "../references.js";

interface Options {
  ignore?: string[];
}

export const validDictionary: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Report what `dialex check` finds in a dictionary file: missing keys and locales, ICU errors, placeholders",
      url: "https://github.com/awaiden/dialex/blob/main/apps/docs/docs/guide/linting.md#valid-dictionary",
    },
    schema: [
      {
        type: "object",
        properties: { ignore: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: { issue: "{{message}} ({{code}})" },
  },
  create(context) {
    const filename = filenameOf(context);
    const project = projectFor(filename);
    // Only dictionary files: `files` of the project says which those are
    if (!project || !project.result.files.includes(filename)) return {};

    const ignore = new Set((context.options[0] as Options | undefined)?.ignore ?? []);
    return {
      Program() {
        for (const issue of dictionaryIssues(filename, sourceTextOf(context))) {
          if (ignore.has(issue.code)) continue;
          // Hints (`info`) are for editors: a lint warning would only be noise
          if (issue.level === "info") continue;
          const range = issue.range ?? {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 },
          };
          context.report({
            loc: {
              start: { line: range.start.line + 1, column: range.start.column },
              end: { line: range.end.line + 1, column: range.end.column },
            },
            messageId: "issue",
            data: { message: issue.message, code: issue.code },
          });
        }
      },
    };
  },
};
