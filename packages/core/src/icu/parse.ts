export type IcuNode =
  | { type: "literal"; value: string }
  | { type: "argument"; name: string }
  | { type: "number"; name: string; style?: string }
  | { type: "date"; name: string; style?: string }
  | { type: "time"; name: string; style?: string }
  | {
      type: "plural";
      name: string;
      ordinal: boolean;
      offset: number;
      /** Keys are selectors: `=0`, `one`, `other`, ... */
      options: Record<string, IcuNode[]>;
    }
  | { type: "select"; name: string; options: Record<string, IcuNode[]> }
  /** `#` inside a plural branch. */
  | { type: "pound" };

export class IcuSyntaxError extends Error {
  constructor(
    message: string,
    /** Zero-based character offset into the message. */
    public readonly position: number,
  ) {
    super(`ICU syntax error at ${position}: ${message}`);
    this.name = "IcuSyntaxError";
  }
}

const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);
const WHITESPACE = /\s/;

class Parser {
  private pos = 0;

  constructor(private readonly source: string) {}

  parse(): IcuNode[] {
    const nodes = this.parseNodes(false, false);
    if (this.pos < this.source.length) throw this.error("Unexpected }");
    return nodes;
  }

  private error(message: string, at = this.pos): IcuSyntaxError {
    return new IcuSyntaxError(message, at);
  }

  private peek(): string | undefined {
    return this.source[this.pos];
  }

  private skipWhitespace() {
    while (this.pos < this.source.length && WHITESPACE.test(this.source[this.pos])) this.pos++;
  }

  private expect(char: string) {
    this.skipWhitespace();
    if (this.peek() !== char) {
      throw this.error(
        this.peek() === undefined ? `Expected ${char} but the message ended` : `Expected ${char}`,
      );
    }
    this.pos++;
  }

  /**
   * Parses literal text and arguments until the end of the message, or until the `}` that closes
   * a branch when `inBranch` is set (that `}` is left for the caller).
   */
  private parseNodes(inBranch: boolean, inPlural: boolean): IcuNode[] {
    const nodes: IcuNode[] = [];
    let text = "";
    const flush = () => {
      if (text) nodes.push({ type: "literal", value: text });
      text = "";
    };

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (char === "'") {
        const next = this.source[this.pos + 1];
        if (next === "'") {
          text += "'";
          this.pos += 2;
        } else if (next === "{" || next === "}" || (inPlural && next === "#")) {
          // Quoted literal text runs until the next lone apostrophe; '' inside is an apostrophe.
          this.pos++;
          for (;;) {
            if (this.pos >= this.source.length) break;
            const c = this.source[this.pos];
            if (c === "'") {
              if (this.source[this.pos + 1] === "'") {
                text += "'";
                this.pos += 2;
                continue;
              }
              this.pos++;
              break;
            }
            text += c;
            this.pos++;
          }
        } else {
          text += "'";
          this.pos++;
        }
      } else if (char === "{") {
        flush();
        nodes.push(this.parseArgument(inPlural));
      } else if (char === "}") {
        if (inBranch) break;
        throw this.error("Unexpected }");
      } else if (char === "#" && inPlural) {
        flush();
        nodes.push({ type: "pound" });
        this.pos++;
      } else {
        text += char;
        this.pos++;
      }
    }

    flush();
    return nodes;
  }

  private readName(what: string): string {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.source.length && !/[\s,{}]/.test(this.source[this.pos])) this.pos++;
    if (this.pos === start) throw this.error(`Expected ${what}`);
    return this.source.slice(start, this.pos);
  }

  private parseArgument(inPlural: boolean): IcuNode {
    const open = this.pos;
    this.pos++; // {
    const name = this.readName("an argument name");
    this.skipWhitespace();

    if (this.peek() === "}") {
      this.pos++;
      return { type: "argument", name };
    }
    if (this.peek() !== ",") {
      throw this.error(this.peek() === undefined ? `Unclosed { at ${open}` : "Expected , or }");
    }
    this.pos++;

    const type = this.readName("an argument type");
    switch (type) {
      case "number":
      case "date":
      case "time": {
        this.skipWhitespace();
        let style: string | undefined;
        if (this.peek() === ",") {
          this.pos++;
          const start = this.pos;
          while (this.pos < this.source.length && this.source[this.pos] !== "}") this.pos++;
          style = this.source.slice(start, this.pos).trim() || undefined;
        }
        this.expect("}");
        return { type, name, style };
      }
      case "plural":
      case "selectordinal": {
        this.expect(",");
        const offset = this.parseOffset();
        const options = this.parseOptions(true);
        return { type: "plural", name, ordinal: type === "selectordinal", offset, options };
      }
      case "select": {
        this.expect(",");
        const options = this.parseOptions(false, inPlural);
        return { type: "select", name, options };
      }
      default:
        throw this.error(`Unknown argument type "${type}"`, this.pos - type.length);
    }
  }

  private parseOffset(): number {
    this.skipWhitespace();
    if (!this.source.startsWith("offset:", this.pos)) return 0;
    this.pos += "offset:".length;
    this.skipWhitespace();
    const match = /^\d+/.exec(this.source.slice(this.pos));
    if (!match) throw this.error("Expected a number after offset:");
    this.pos += match[0].length;
    return Number(match[0]);
  }

  private parseOptions(plural: boolean, inPlural = false): Record<string, IcuNode[]> {
    const options: Record<string, IcuNode[]> = {};

    for (;;) {
      this.skipWhitespace();
      if (this.peek() === "}") break;
      if (this.peek() === undefined) throw this.error("Expected } but the message ended");

      const start = this.pos;
      while (this.pos < this.source.length && !/[\s{}]/.test(this.source[this.pos])) this.pos++;
      const selector = this.source.slice(start, this.pos);
      if (!selector) throw this.error("Expected a selector");

      if (plural && !/^=\d+$/.test(selector) && !PLURAL_CATEGORIES.has(selector)) {
        throw this.error(`Invalid plural selector "${selector}"`, start);
      }
      if (selector in options) throw this.error(`Duplicate selector "${selector}"`, start);

      this.expect("{");
      options[selector] = this.parseNodes(true, plural || inPlural);
      this.expect("}");
    }

    this.pos++; // closing } of the argument
    if (!("other" in options)) {
      throw this.error('Missing required "other" option', this.pos - 1);
    }
    return options;
  }
}

/** Parses an ICU message. Throws `IcuSyntaxError` with the offending position. */
export function parseMessage(message: string): IcuNode[] {
  return new Parser(message).parse();
}
