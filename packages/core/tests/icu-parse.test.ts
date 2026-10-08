import { describe, expect, it } from "vite-plus/test";
import { IcuSyntaxError, parseMessage } from "../src/icu/parse.js";
import { argumentSignature, getArguments, isIcuStructured } from "../src/icu/introspect.js";

const err = (message: string): IcuSyntaxError => {
  try {
    parseMessage(message);
  } catch (e) {
    return e as IcuSyntaxError;
  }
  throw new Error(`expected "${message}" to fail`);
};

describe("parseMessage", () => {
  it("parses literals and simple arguments", () => {
    expect(parseMessage("Hello, {name}!")).toEqual([
      { type: "literal", value: "Hello, " },
      { type: "argument", name: "name" },
      { type: "literal", value: "!" },
    ]);
    expect(parseMessage("")).toEqual([]);
    expect(parseMessage("{ spaced }")).toEqual([{ type: "argument", name: "spaced" }]);
  });

  it("parses number, date, and time arguments with styles", () => {
    expect(parseMessage("{n, number}")).toEqual([{ type: "number", name: "n", style: undefined }]);
    expect(parseMessage("{n, number, percent}")).toEqual([
      { type: "number", name: "n", style: "percent" },
    ]);
    expect(parseMessage("{p, number, ::currency/USD}")[0]).toMatchObject({
      style: "::currency/USD",
    });
    expect(parseMessage("{d, date, long}")[0]).toMatchObject({ type: "date", style: "long" });
    expect(parseMessage("{t, time, short}")[0]).toMatchObject({ type: "time", style: "short" });
  });

  it("parses plurals with exact matches, categories, # and offset", () => {
    const [node] = parseMessage(
      "{count, plural, offset:1 =0 {none} =1 {just you} one {# other} other {# others}}",
    );
    expect(node).toMatchObject({ type: "plural", name: "count", ordinal: false, offset: 1 });
    expect(Object.keys((node as any).options)).toEqual(["=0", "=1", "one", "other"]);
    expect((node as any).options.one).toEqual([
      { type: "pound" },
      { type: "literal", value: " other" },
    ]);
  });

  it("parses selectordinal and select, including nesting", () => {
    expect(parseMessage("{n, selectordinal, one {#st} other {#th}}")[0]).toMatchObject({
      type: "plural",
      ordinal: true,
    });

    const [select] = parseMessage(
      "{gender, select, female {{n, plural, one {She has # item} other {She has # items}}} other {They}}",
    );
    const nested = (select as any).options.female[0];
    expect(nested).toMatchObject({ type: "plural", name: "n" });
    // # belongs to the innermost plural
    expect(nested.options.one[0]).toEqual({ type: "literal", value: "She has " });
    expect(nested.options.one[1]).toEqual({ type: "pound" });
  });

  it("treats # inside a select nested in a plural as the plural's number", () => {
    const [plural] = parseMessage("{n, plural, other {{g, select, a {# a} other {# x}}}}");
    const select = (plural as any).options.other[0];
    expect(select.options.a[0]).toEqual({ type: "pound" });
  });

  it("keeps # literal outside plurals", () => {
    expect(parseMessage("Item #1")).toEqual([{ type: "literal", value: "Item #1" }]);
    expect(parseMessage("{g, select, a {#1} other {x}}")[0]).toMatchObject({ type: "select" });
  });

  it("handles apostrophe quoting", () => {
    expect(parseMessage("It''s '{'literal'}'")).toEqual([
      { type: "literal", value: "It's {literal}" },
    ]);
    expect(parseMessage("don't")).toEqual([{ type: "literal", value: "don't" }]);
    expect(parseMessage("'{a''b}'")).toEqual([{ type: "literal", value: "{a'b}" }]);
    expect(parseMessage("{n, plural, other {'#' is # }}")[0]).toMatchObject({
      options: {
        other: [
          { type: "literal", value: "# is " },
          { type: "pound" },
          { type: "literal", value: " " },
        ],
      },
    });
  });

  it("reports syntax errors with positions", () => {
    expect(err("Hello {name").message).toMatch(/Unclosed \{ at 6/);
    expect(err("a } b").position).toBe(2);
    expect(err("{n, plural, one {x}}").message).toMatch(/Missing required "other"/);
    expect(err("{n, plural, few {x} few {y} other {z}}").message).toMatch(
      /Duplicate selector "few"/,
    );
    expect(err("{n, plural, several {x} other {z}}").message).toMatch(
      /Invalid plural selector "several"/,
    );
    expect(err("{n, plurl, other {x}}").message).toMatch(/Unknown argument type "plurl"/);
    expect(err("{}").message).toMatch(/Expected an argument name/);
    expect(err("{n, select, a {x}}").message).toMatch(/Missing required "other"/);
    expect(err("{n, plural, other {x}").message).toMatch(/Expected \}/);
    expect(err("{n, plural, offset:x other {x}}").message).toMatch(
      /Expected a number after offset:/,
    );
  });
});

describe("introspection", () => {
  it("lists distinct arguments, including nested ones, without branch text", () => {
    const args = getArguments(
      parseMessage(
        "{g, select, f {{n, plural, one {# of {name}} other {# of {name}}}} other {{name}}}",
      ),
    );
    expect(args).toEqual([
      { name: "g", type: "select", selectors: ["f", "other"] },
      { name: "n", type: "plural", selectors: ["one", "other"] },
      { name: "name", type: "argument" },
    ]);
  });

  it("builds a signature that ignores order and branch text", () => {
    const a = argumentSignature(
      parseMessage("{count, plural, one {# thing} other {# things}} for {user}"),
    );
    const b = argumentSignature(
      parseMessage("{user} için {count, plural, one {# şey} other {# şey}}"),
    );
    expect(a).toBe(b);
    expect(argumentSignature(parseMessage("{count} for {user}"))).not.toBe(a);
  });

  it("detects structured ICU", () => {
    expect(isIcuStructured("{n, plural, other {x}}")).toBe(true);
    expect(isIcuStructured("{ n , select, a {x} other {y}}")).toBe(true);
    expect(isIcuStructured("{n, number, percent}")).toBe(true);
    expect(isIcuStructured("Hello {name}")).toBe(false);
    expect(isIcuStructured("{{mustache}}")).toBe(false);
  });
});
