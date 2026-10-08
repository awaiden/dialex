import type { IcuNode } from "./parse.js";

export type IcuArgumentType =
  | "argument"
  | "number"
  | "date"
  | "time"
  | "plural"
  | "selectordinal"
  | "select";

export interface IcuArgument {
  name: string;
  type: IcuArgumentType;
  /** Selectors of a plural/select, in source order (`one`, `other`, `=0`, ...). */
  selectors?: string[];
}

/** Lists the distinct arguments of a parsed message, including those in nested branches. */
export function getArguments(nodes: IcuNode[]): IcuArgument[] {
  const found = new Map<string, IcuArgument>();

  const walk = (list: IcuNode[]) => {
    for (const node of list) {
      if (node.type === "literal" || node.type === "pound") continue;

      const type: IcuArgumentType =
        node.type === "plural" ? (node.ordinal ? "selectordinal" : "plural") : node.type;
      const key = `${node.name}:${type}`;
      if (!found.has(key)) {
        found.set(key, {
          name: node.name,
          type,
          ...("options" in node ? { selectors: Object.keys(node.options) } : {}),
        });
      }
      if ("options" in node) Object.values(node.options).forEach(walk);
    }
  };
  walk(nodes);

  return [...found.values()];
}

/** A comparable description of a message's arguments, ignoring plural/select branch text. */
export function argumentSignature(nodes: IcuNode[]): string {
  return getArguments(nodes)
    .map((a) => `${a.name}:${a.type === "argument" ? "any" : a.type}`)
    .sort()
    .join(",");
}

/**
 * Whether a message uses plural/select/number/date/time arguments, as opposed to simple
 * `{name}` placeholders. Used to decide how strictly to treat parse errors.
 */
export function isIcuStructured(message: string): boolean {
  return /\{\s*[^\s,{}]+\s*,\s*(plural|selectordinal|select|number|date|time)\b/.test(message);
}

/** Every plural/selectordinal in a parsed message, including nested ones. */
export function findPlurals(nodes: IcuNode[]): Extract<IcuNode, { type: "plural" }>[] {
  const plurals: Extract<IcuNode, { type: "plural" }>[] = [];
  const walk = (list: IcuNode[]) => {
    for (const node of list) {
      if (node.type === "plural") plurals.push(node);
      if ("options" in node) Object.values(node.options).forEach(walk);
    }
  };
  walk(nodes);
  return plurals;
}
