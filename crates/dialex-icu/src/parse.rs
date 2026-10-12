use std::fmt;

/// The branches of a plural or select, in source order.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Options(pub Vec<(String, Vec<Node>)>);

impl Options {
    pub fn get(&self, selector: &str) -> Option<&Vec<Node>> {
        self.0
            .iter()
            .find(|(key, _)| key == selector)
            .map(|(_, nodes)| nodes)
    }

    pub fn contains(&self, selector: &str) -> bool {
        self.0.iter().any(|(key, _)| key == selector)
    }

    pub fn keys(&self) -> Vec<String> {
        self.0.iter().map(|(key, _)| key.clone()).collect()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Node {
    Literal(String),
    Argument {
        name: String,
    },
    Number {
        name: String,
        style: Option<String>,
    },
    Date {
        name: String,
        style: Option<String>,
    },
    Time {
        name: String,
        style: Option<String>,
    },
    Plural {
        name: String,
        ordinal: bool,
        offset: u64,
        options: Options,
    },
    Select {
        name: String,
        options: Options,
    },
    Pound,
}

/// A syntax error with the zero-based UTF-16 offset of the problem.
#[derive(Debug, Clone, PartialEq)]
pub struct SyntaxError {
    pub message: String,
    pub position: usize,
}

impl fmt::Display for SyntaxError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "ICU syntax error at {}: {}", self.position, self.message)
    }
}

impl std::error::Error for SyntaxError {}

const PLURAL_CATEGORIES: [&str; 6] = ["zero", "one", "two", "few", "many", "other"];

/// JavaScript's `\s`.
fn is_space(unit: u16) -> bool {
    matches!(
        unit,
        0x09 | 0x0a | 0x0b | 0x0c | 0x0d | 0x20 | 0xa0 | 0x1680 | 0x2000
            ..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff
    )
}

struct Parser {
    source: Vec<u16>,
    pos: usize,
}

type Result<T> = std::result::Result<T, SyntaxError>;

const QUOTE: u16 = b'\'' as u16;
const OPEN: u16 = b'{' as u16;
const CLOSE: u16 = b'}' as u16;
const COMMA: u16 = b',' as u16;
const POUND: u16 = b'#' as u16;

impl Parser {
    fn error<T>(&self, message: impl Into<String>, at: usize) -> Result<T> {
        Err(SyntaxError {
            message: message.into(),
            position: at,
        })
    }

    fn peek(&self) -> Option<u16> {
        self.source.get(self.pos).copied()
    }

    fn at(&self, index: usize) -> Option<u16> {
        self.source.get(index).copied()
    }

    fn skip_whitespace(&mut self) {
        while self.pos < self.source.len() && is_space(self.source[self.pos]) {
            self.pos += 1;
        }
    }

    fn expect(&mut self, unit: u16) -> Result<()> {
        self.skip_whitespace();
        if self.peek() != Some(unit) {
            let ch = String::from_utf16_lossy(&[unit]);
            return if self.peek().is_none() {
                self.error(format!("Expected {ch} but the message ended"), self.pos)
            } else {
                self.error(format!("Expected {ch}"), self.pos)
            };
        }
        self.pos += 1;
        Ok(())
    }

    fn text(units: &[u16]) -> String {
        String::from_utf16_lossy(units)
    }

    fn parse_nodes(&mut self, in_branch: bool, in_plural: bool) -> Result<Vec<Node>> {
        let mut nodes = Vec::new();
        let mut text: Vec<u16> = Vec::new();

        fn flush(text: &mut Vec<u16>, nodes: &mut Vec<Node>) {
            if !text.is_empty() {
                nodes.push(Node::Literal(Parser::text(text)));
                text.clear();
            }
        }

        while self.pos < self.source.len() {
            let unit = self.source[self.pos];

            if unit == QUOTE {
                let next = self.at(self.pos + 1);
                if next == Some(QUOTE) {
                    text.push(QUOTE);
                    self.pos += 2;
                } else if next == Some(OPEN)
                    || next == Some(CLOSE)
                    || (in_plural && next == Some(POUND))
                {
                    // Quoted literal text runs until the next lone apostrophe; '' inside is one.
                    self.pos += 1;
                    loop {
                        if self.pos >= self.source.len() {
                            break;
                        }
                        let c = self.source[self.pos];
                        if c == QUOTE {
                            if self.at(self.pos + 1) == Some(QUOTE) {
                                text.push(QUOTE);
                                self.pos += 2;
                                continue;
                            }
                            self.pos += 1;
                            break;
                        }
                        text.push(c);
                        self.pos += 1;
                    }
                } else {
                    text.push(QUOTE);
                    self.pos += 1;
                }
            } else if unit == OPEN {
                flush(&mut text, &mut nodes);
                nodes.push(self.parse_argument(in_plural)?);
            } else if unit == CLOSE {
                if in_branch {
                    break;
                }
                return self.error("Unexpected }", self.pos);
            } else if unit == POUND && in_plural {
                flush(&mut text, &mut nodes);
                nodes.push(Node::Pound);
                self.pos += 1;
            } else {
                text.push(unit);
                self.pos += 1;
            }
        }

        flush(&mut text, &mut nodes);
        Ok(nodes)
    }

    fn read_name(&mut self, what: &str) -> Result<String> {
        self.skip_whitespace();
        let start = self.pos;
        while self.pos < self.source.len() {
            let unit = self.source[self.pos];
            if is_space(unit) || unit == COMMA || unit == OPEN || unit == CLOSE {
                break;
            }
            self.pos += 1;
        }
        if self.pos == start {
            return self.error(format!("Expected {what}"), self.pos);
        }
        Ok(Self::text(&self.source[start..self.pos]))
    }

    fn parse_argument(&mut self, in_plural: bool) -> Result<Node> {
        let open = self.pos;
        self.pos += 1; // {
        let name = self.read_name("an argument name")?;
        self.skip_whitespace();

        if self.peek() == Some(CLOSE) {
            self.pos += 1;
            return Ok(Node::Argument { name });
        }
        if self.peek() != Some(COMMA) {
            return if self.peek().is_none() {
                self.error(format!("Unclosed {{ at {open}"), self.pos)
            } else {
                self.error("Expected , or }", self.pos)
            };
        }
        self.pos += 1;

        let kind = self.read_name("an argument type")?;
        match kind.as_str() {
            "number" | "date" | "time" => {
                self.skip_whitespace();
                let mut style = None;
                if self.peek() == Some(COMMA) {
                    self.pos += 1;
                    let start = self.pos;
                    while self.pos < self.source.len() && self.source[self.pos] != CLOSE {
                        self.pos += 1;
                    }
                    let raw = Self::text(&self.source[start..self.pos]);
                    let trimmed = js_trim(&raw);
                    if !trimmed.is_empty() {
                        style = Some(trimmed.to_string());
                    }
                }
                self.expect(CLOSE)?;
                Ok(match kind.as_str() {
                    "number" => Node::Number { name, style },
                    "date" => Node::Date { name, style },
                    _ => Node::Time { name, style },
                })
            }
            "plural" | "selectordinal" => {
                self.expect(COMMA)?;
                let offset = self.parse_offset()?;
                let options = self.parse_options(true, false)?;
                Ok(Node::Plural {
                    name,
                    ordinal: kind == "selectordinal",
                    offset,
                    options,
                })
            }
            "select" => {
                self.expect(COMMA)?;
                let options = self.parse_options(false, in_plural)?;
                Ok(Node::Select { name, options })
            }
            _ => {
                let at = self.pos - kind.encode_utf16().count();
                self.error(format!("Unknown argument type \"{kind}\""), at)
            }
        }
    }

    fn parse_offset(&mut self) -> Result<u64> {
        self.skip_whitespace();
        let prefix: Vec<u16> = "offset:".encode_utf16().collect();
        if !self.source[self.pos..].starts_with(&prefix) {
            return Ok(0);
        }
        self.pos += prefix.len();
        self.skip_whitespace();
        let start = self.pos;
        while self.pos < self.source.len()
            && (b'0' as u16..=b'9' as u16).contains(&self.source[self.pos])
        {
            self.pos += 1;
        }
        if self.pos == start {
            return self.error("Expected a number after offset:", self.pos);
        }
        let digits = Self::text(&self.source[start..self.pos]);
        Ok(digits.parse::<u64>().unwrap_or(u64::MAX))
    }

    fn parse_options(&mut self, plural: bool, in_plural: bool) -> Result<Options> {
        let mut options = Options::default();

        loop {
            self.skip_whitespace();
            if self.peek() == Some(CLOSE) {
                break;
            }
            if self.peek().is_none() {
                return self.error("Expected } but the message ended", self.pos);
            }

            let start = self.pos;
            while self.pos < self.source.len() {
                let unit = self.source[self.pos];
                if is_space(unit) || unit == OPEN || unit == CLOSE {
                    break;
                }
                self.pos += 1;
            }
            let selector = Self::text(&self.source[start..self.pos]);
            if selector.is_empty() {
                return self.error("Expected a selector", self.pos);
            }

            if plural
                && !is_exact_selector(&selector)
                && !PLURAL_CATEGORIES.contains(&selector.as_str())
            {
                return self.error(format!("Invalid plural selector \"{selector}\""), start);
            }
            if options.contains(&selector) {
                return self.error(format!("Duplicate selector \"{selector}\""), start);
            }

            self.expect(OPEN)?;
            let nodes = self.parse_nodes(true, plural || in_plural)?;
            self.expect(CLOSE)?;
            options.0.push((selector, nodes));
        }

        self.pos += 1; // closing } of the argument
        if !options.contains("other") {
            return self.error("Missing required \"other\" option", self.pos - 1);
        }
        Ok(options)
    }
}

/// `^=\d+$` with ASCII digits.
fn is_exact_selector(selector: &str) -> bool {
    selector.len() > 1
        && selector.starts_with('=')
        && selector[1..].bytes().all(|byte| byte.is_ascii_digit())
}

/// `String.prototype.trim`, which trims JavaScript whitespace and line terminators.
fn js_trim(text: &str) -> &str {
    text.trim_matches(|c: char| {
        let unit = c as u32;
        unit <= 0xffff && is_space(unit as u16)
    })
}

/// Parses an ICU message. Returns the syntax error with the offending position otherwise.
pub fn parse_message(message: &str) -> Result<Vec<Node>> {
    let mut parser = Parser {
        source: message.encode_utf16().collect(),
        pos: 0,
    };
    let nodes = parser.parse_nodes(false, false)?;
    if parser.pos < parser.source.len() {
        return parser.error("Unexpected }", parser.pos);
    }
    Ok(nodes)
}
