import type { Rule } from "eslint";

import { projectFor, settingOf } from "../project.js";
import { filenameOf } from "../references.js";

interface Options {
  attributes?: string[];
  ignore?: string[];
  ignoreComponents?: string[];
}

const DEFAULT_ATTRIBUTES = ["title", "alt", "placeholder", "aria-label", "label"];
const DEFAULT_IGNORED_COMPONENTS = ["Trans", "code", "pre", "script", "style"];

const HAS_LETTER = /\p{L}/u;

export const noLiteralString: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow user-facing text written directly in JSX instead of a dictionary",
      url: "https://github.com/awaiden/dialex/blob/main/apps/docs/docs/guide/linting.md#no-literal-string",
    },
    schema: [
      {
        type: "object",
        properties: {
          attributes: { type: "array", items: { type: "string" } },
          ignore: { type: "array", items: { type: "string" } },
          ignoreComponents: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: { literal: 'Move "{{text}}" into a dictionary' },
  },
  create(context) {
    // Only in Dialex projects: elsewhere this would flag every string of an unrelated app.
    const project = projectFor(filenameOf(context));
    if (!project) return {};
    const setting = settingOf(project.config, "literal-string");
    if (setting.level === "off") return {};

    // `dialex.config.ts` is the shared source; options given to the rule itself win
    const options: Options = { ...setting.options, ...context.options[0] };
    const attributes = new Set(options.attributes ?? DEFAULT_ATTRIBUTES);
    const ignoredComponents = new Set(options.ignoreComponents ?? DEFAULT_IGNORED_COMPONENTS);
    const ignored = (options.ignore ?? []).map((pattern) => new RegExp(pattern, "u"));

    const reportable = (text: string) => {
      const trimmed = text.trim();
      return HAS_LETTER.test(trimmed) && !ignored.some((pattern) => pattern.test(trimmed));
    };
    const elementName = (element: any): string | undefined => {
      const name = element?.openingElement?.name;
      if (name?.type === "JSXIdentifier") return name.name;
      if (name?.type === "JSXMemberExpression") return name.property?.name;
      return undefined;
    };
    const insideIgnored = (node: any): boolean => {
      for (let at = node.parent; at; at = at.parent) {
        if (at.type === "JSXElement") {
          const name = elementName(at);
          if (name && ignoredComponents.has(name)) return true;
        }
      }
      return false;
    };
    const show = (text: string) => {
      const trimmed = text.trim().replace(/\s+/g, " ");
      return trimmed.length > 30 ? `${trimmed.slice(0, 29)}…` : trimmed;
    };

    return {
      JSXText(node: any) {
        if (!reportable(node.value) || insideIgnored(node)) return;
        context.report({ node, messageId: "literal", data: { text: show(node.value) } });
      },
      JSXAttribute(node: any) {
        const name = node.name?.type === "JSXIdentifier" ? node.name.name : undefined;
        if (!name || !attributes.has(name)) return;
        const value = node.value;
        if (value?.type !== "Literal" || typeof value.value !== "string") return;
        if (!reportable(value.value) || insideIgnored(node)) return;
        context.report({ node: value, messageId: "literal", data: { text: show(value.value) } });
      },
    } as Rule.RuleListener;
  },
};
