import { parseExpression } from "magicast";

import {
  findProperty as findProp,
  isObjectNode as isObject,
  propertyKeyName as keyName,
  unwrapNode as unwrap,
} from "../ast.js";
import type { AstNode as Node } from "../ast.js";
import type { LeafKind } from "./types.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export const isPropLike = (p: Node) =>
  p?.type === "ObjectProperty" || p?.type === "Property" || p?.type === "ObjectMethod";

export function stringValue(node: Node): string | undefined {
  node = unwrap(node);
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? undefined;
  }
  return undefined;
}

export function leafKind(node: Node): LeafKind {
  node = unwrap(node);
  if (stringValue(node) !== undefined) return "string";
  if (
    node?.type === "ArrowFunctionExpression" ||
    node?.type === "FunctionExpression" ||
    node?.type === "ObjectMethod"
  ) {
    return "function";
  }
  return "other";
}

export function dictionaryProp(obj: Node): Node | undefined {
  const prop = findProp(obj, "dictionary");
  const value = unwrap(prop?.value);
  return isObject(value) ? value : undefined;
}

export function locateName(declaration: Node): string | undefined {
  const decl = unwrap(declaration);
  if (decl?.type === "CallExpression") {
    const first = unwrap(decl.arguments[0]);
    if (isObject(first)) return stringValue(findProp(first, "name")?.value);
    return stringValue(first);
  }
  if (isObject(decl)) return stringValue(findProp(decl, "name")?.value);
  return undefined;
}

export function locateLocalesObject(declaration: Node): Node | undefined {
  const decl = unwrap(declaration);
  if (decl?.type === "CallExpression") {
    const first = unwrap(decl.arguments[0]);
    const second = unwrap(decl.arguments[1]);
    if (isObject(second)) return second;
    if (isObject(first)) return dictionaryProp(first);
    return undefined;
  }
  if (isObject(decl)) return dictionaryProp(decl);
  return undefined;
}

/** Quotes a property key only when it is not a valid identifier. */
export function keyCode(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

/** Builds a detached `key: <value>` property node from source text. */
export function makeProp(key: string, valueCode: string): Node {
  const expr: Node = parseExpression(`({ ${keyCode(key)}: ${valueCode} })`);
  return expr.$ast.properties[0];
}

export function makeStringNode(value: string): Node {
  return makeProp("_", JSON.stringify(value)).value;
}

/**
 * A dictionary is statically readable when every locale is an object literal and no object on the
 * way down uses spreads or computed keys.
 */
export function isStaticallyComplete(localesObj: Node): boolean {
  const walk = (obj: Node): boolean =>
    obj.properties.every((prop: Node) => {
      if (!isPropLike(prop) || keyName(prop) === undefined) return false;
      if (prop.type === "ObjectMethod") return true;
      const value = unwrap(prop.value);
      return isObject(value) ? walk(value) : true;
    });

  return localesObj.properties.every((prop: Node) => {
    if (!isPropLike(prop) || keyName(prop) === undefined || prop.type === "ObjectMethod")
      return false;
    const value = unwrap(prop.value);
    return isObject(value) && walk(value);
  });
}
