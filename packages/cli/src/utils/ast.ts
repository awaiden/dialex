/** A syntax-tree node as magicast (recast/babel) and oxc-style ESTree nodes both look. */
export type AstNode = { type: string; [key: string]: any };

/** Strips `as`, `satisfies` and parentheses around an expression. */
export function unwrapNode(node: AstNode): AstNode {
  while (
    node &&
    (node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "ParenthesizedExpression")
  ) {
    node = node.expression;
  }
  return node;
}

export const isObjectNode = (node: AstNode) => node?.type === "ObjectExpression";

/** The static name of a property key, or `undefined` when it is computed. */
export function propertyKeyName(prop: AstNode): string | undefined {
  const key = prop?.key;
  if (!key || prop.computed) return undefined;
  if (key.type === "Identifier") return key.name;
  if (key.type === "StringLiteral" || (key.type === "Literal" && typeof key.value === "string")) {
    return key.value;
  }
  if (key.type === "NumericLiteral") return String(key.value);
  return undefined;
}

const isPropLike = (p: AstNode) =>
  p?.type === "ObjectProperty" || p?.type === "Property" || p?.type === "ObjectMethod";

/** The first property of `obj` with the static name `key`. */
export function findProperty(obj: AstNode, key: string): AstNode | undefined {
  return obj.properties.find((p: AstNode) => isPropLike(p) && propertyKeyName(p) === key);
}
