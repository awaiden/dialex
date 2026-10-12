use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, Expression, ObjectExpression, ObjectPropertyKind, PropertyKey, Statement,
};
use oxc_parser::Parser;
use oxc_span::SourceType;

/// A literal read from the config.
#[derive(Debug, Clone, PartialEq)]
pub enum ConfigValue {
    String(String),
    Number(f64),
    Bool(bool),
    Array(Vec<ConfigValue>),
    Object(Vec<(String, ConfigValue)>),
}

impl ConfigValue {
    pub fn as_str(&self) -> Option<&str> {
        match self {
            ConfigValue::String(text) => Some(text),
            _ => None,
        }
    }

    pub fn as_string_array(&self) -> Option<Vec<String>> {
        match self {
            ConfigValue::Array(items) => items
                .iter()
                .map(|i| i.as_str().map(str::to_string))
                .collect(),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct StaticConfigResult {
    /// The known keys that were literals (the first property of each key).
    pub values: Vec<(String, ConfigValue)>,
    /// Anything that could not be read statically (non-literal values, an unreadable file).
    pub notes: Vec<String>,
    /// The object has a spread or a computed key, so it may hold settings this reader cannot see.
    /// The Node CLI, which runs the file, is needed for a trustworthy answer.
    pub opaque: bool,
}

impl StaticConfigResult {
    pub fn get(&self, key: &str) -> Option<&ConfigValue> {
        self.values
            .iter()
            .find(|(name, _)| name == key)
            .map(|(_, value)| value)
    }
}

const KEYS: [&str; 8] = [
    "defaultLocale",
    "locales",
    "include",
    "exclude",
    "output",
    "fallbacks",
    "prefixDefault",
    "lazy",
];

fn unwrap<'a, 'b>(mut expression: &'b Expression<'a>) -> &'b Expression<'a> {
    loop {
        expression = match expression {
            Expression::TSAsExpression(inner) => &inner.expression,
            Expression::TSSatisfiesExpression(inner) => &inner.expression,
            Expression::ParenthesizedExpression(inner) => &inner.expression,
            _ => return expression,
        };
    }
}

fn key_name(key: &PropertyKey, computed: bool) -> Option<String> {
    if computed {
        return None;
    }
    match key {
        PropertyKey::StaticIdentifier(identifier) => Some(identifier.name.to_string()),
        PropertyKey::StringLiteral(literal) => Some(literal.value.to_string()),
        PropertyKey::NumericLiteral(literal) => Some(format!("{}", literal.value)),
        _ => None,
    }
}

fn literal(expression: &Expression) -> Option<ConfigValue> {
    match unwrap(expression) {
        Expression::StringLiteral(value) => Some(ConfigValue::String(value.value.to_string())),
        Expression::NumericLiteral(value) => Some(ConfigValue::Number(value.value)),
        Expression::BooleanLiteral(value) => Some(ConfigValue::Bool(value.value)),
        Expression::TemplateLiteral(template) if template.expressions.is_empty() => {
            Some(ConfigValue::String(
                template
                    .quasis
                    .first()
                    .and_then(|quasi| quasi.value.cooked.as_ref())
                    .map(|s| s.to_string())
                    .unwrap_or_default(),
            ))
        }
        Expression::ArrayExpression(array) => {
            let mut items = Vec::new();
            for element in &array.elements {
                items.push(literal(element.as_expression()?)?);
            }
            Some(ConfigValue::Array(items))
        }
        Expression::ObjectExpression(object) => {
            let mut entries = Vec::new();
            for property in &object.properties {
                let ObjectPropertyKind::ObjectProperty(property) = property else {
                    return None;
                };
                let name = key_name(&property.key, property.computed)?;
                entries.push((name, literal(&property.value)?));
            }
            Some(ConfigValue::Object(entries))
        }
        _ => None,
    }
}

/// The object literal passed to `defineConfig({...})`, or exported directly.
fn config_object<'a, 'b>(expression: &'b Expression<'a>) -> Option<&'b ObjectExpression<'a>> {
    match unwrap(expression) {
        Expression::CallExpression(call) => {
            config_object(call.arguments.first().and_then(Argument::as_expression)?)
        }
        Expression::ObjectExpression(object) => Some(object),
        _ => None,
    }
}

/// Reads the known keys of `dialex.config.ts` without running it. `Err` is a syntax error, for which
/// the caller falls back to Node.
pub fn parse_static_config(file_name: &str, source: &str) -> Result<StaticConfigResult, String> {
    let mut result = StaticConfigResult::default();

    if file_name.ends_with(".json") {
        // Plain JSON: only the same keys are read
        let data: serde_json_like::Value = serde_json_like::parse(source)?;
        return Ok(data.into_result());
    }

    let allocator = Allocator::default();
    let source_type = SourceType::from_path(file_name).unwrap_or_else(|_| SourceType::ts());
    let parsed = Parser::new(&allocator, source, source_type).parse();
    if parsed.fatal_error || parsed.diagnostics.has_errors() {
        return Err(parsed
            .diagnostics
            .errors()
            .next()
            .map(|e| e.to_string())
            .unwrap_or_default());
    }

    let declaration = parsed
        .program
        .body
        .iter()
        .find_map(|statement| match statement {
            Statement::ExportDefaultDeclaration(export) => export.declaration.as_expression(),
            _ => None,
        });
    let Some(object) = declaration.and_then(config_object) else {
        result.notes.push(format!(
            "{file_name} does not export a config object literal."
        ));
        return Ok(result);
    };

    // `findProp` takes the first property of a key; spreads and computed keys are not found
    let mut first: Vec<(String, &Expression)> = Vec::new();
    for property in &object.properties {
        let ObjectPropertyKind::ObjectProperty(property) = property else {
            result.opaque = true;
            continue;
        };
        let Some(name) = key_name(&property.key, property.computed) else {
            result.opaque = true;
            continue;
        };
        if KEYS.contains(&name.as_str()) && !first.iter().any(|(existing, _)| *existing == name) {
            first.push((name, &property.value));
        }
    }
    for key in KEYS {
        let Some((_, value)) = first.iter().find(|(name, _)| name == key) else {
            continue;
        };
        match literal(value) {
            Some(value) => result.values.push((key.to_string(), value)),
            None => result.notes.push(format!(
                "\"{key}\" could not be read statically (not a literal)."
            )),
        }
    }
    Ok(result)
}

/// A tiny JSON reader for `*.config.json`, to keep the crate free of a JSON dependency.
mod serde_json_like {
    use super::{ConfigValue, StaticConfigResult, KEYS};

    pub struct Value(pub ConfigValue);

    pub fn parse(source: &str) -> Result<Value, String> {
        let mut parser = Reader {
            chars: source.chars().collect(),
            pos: 0,
        };
        let value = parser.value()?;
        parser.ws();
        if parser.pos != parser.chars.len() {
            return Err("trailing characters".into());
        }
        Ok(Value(value))
    }

    impl Value {
        pub fn into_result(self) -> StaticConfigResult {
            let mut result = StaticConfigResult::default();
            if let ConfigValue::Object(entries) = self.0 {
                for (name, value) in entries {
                    if KEYS.contains(&name.as_str()) {
                        result.values.push((name, value));
                    }
                }
            }
            result
        }
    }

    struct Reader {
        chars: Vec<char>,
        pos: usize,
    }

    impl Reader {
        fn ws(&mut self) {
            while self.pos < self.chars.len() && self.chars[self.pos].is_whitespace() {
                self.pos += 1;
            }
        }

        fn eat(&mut self, expected: char) -> Result<(), String> {
            self.ws();
            if self.chars.get(self.pos) == Some(&expected) {
                self.pos += 1;
                Ok(())
            } else {
                Err(format!("expected {expected}"))
            }
        }

        fn value(&mut self) -> Result<ConfigValue, String> {
            self.ws();
            match self.chars.get(self.pos) {
                Some('{') => {
                    self.pos += 1;
                    let mut entries = Vec::new();
                    loop {
                        self.ws();
                        if self.chars.get(self.pos) == Some(&'}') {
                            self.pos += 1;
                            break;
                        }
                        let key = self.string()?;
                        self.eat(':')?;
                        let value = self.value()?;
                        entries.push((key, value));
                        self.ws();
                        if self.chars.get(self.pos) == Some(&',') {
                            self.pos += 1;
                        }
                    }
                    Ok(ConfigValue::Object(entries))
                }
                Some('[') => {
                    self.pos += 1;
                    let mut items = Vec::new();
                    loop {
                        self.ws();
                        if self.chars.get(self.pos) == Some(&']') {
                            self.pos += 1;
                            break;
                        }
                        items.push(self.value()?);
                        self.ws();
                        if self.chars.get(self.pos) == Some(&',') {
                            self.pos += 1;
                        }
                    }
                    Ok(ConfigValue::Array(items))
                }
                Some('"') => Ok(ConfigValue::String(self.string()?)),
                Some(c) if c.is_ascii_alphabetic() => {
                    let start = self.pos;
                    while self.pos < self.chars.len() && self.chars[self.pos].is_ascii_alphabetic()
                    {
                        self.pos += 1;
                    }
                    match self.chars[start..self.pos]
                        .iter()
                        .collect::<String>()
                        .as_str()
                    {
                        "true" => Ok(ConfigValue::Bool(true)),
                        "false" => Ok(ConfigValue::Bool(false)),
                        _ => Err("unsupported value".into()),
                    }
                }
                Some(_) => {
                    let start = self.pos;
                    while self.pos < self.chars.len()
                        && (self.chars[self.pos].is_ascii_digit()
                            || "+-.eE".contains(self.chars[self.pos]))
                    {
                        self.pos += 1;
                    }
                    self.chars[start..self.pos]
                        .iter()
                        .collect::<String>()
                        .parse::<f64>()
                        .map(ConfigValue::Number)
                        .map_err(|_| "bad number".to_string())
                }
                None => Err("unexpected end".into()),
            }
        }

        fn string(&mut self) -> Result<String, String> {
            self.ws();
            if self.chars.get(self.pos) != Some(&'"') {
                return Err("expected a string".into());
            }
            self.pos += 1;
            let mut out = String::new();
            while let Some(&c) = self.chars.get(self.pos) {
                self.pos += 1;
                match c {
                    '"' => return Ok(out),
                    '\\' => {
                        let escaped = *self.chars.get(self.pos).ok_or("bad escape")?;
                        self.pos += 1;
                        match escaped {
                            'n' => out.push('\n'),
                            't' => out.push('\t'),
                            'r' => out.push('\r'),
                            'u' => {
                                let hex: String =
                                    self.chars[self.pos..self.pos + 4].iter().collect();
                                self.pos += 4;
                                let code = u32::from_str_radix(&hex, 16).map_err(|_| "bad \\u")?;
                                out.push(char::from_u32(code).unwrap_or('\u{fffd}'));
                            }
                            other => out.push(other),
                        }
                    }
                    other => out.push(other),
                }
            }
            Err("unterminated string".into())
        }
    }
}

/// How `lazy` is set.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lazy {
    Off,
    On,
    PerLocale,
}

/// The settings `generate` and `check` use, with the defaults of `DEFAULT_STATIC_CONFIG`.
#[derive(Debug, Clone, PartialEq)]
pub struct StaticConfig {
    pub default_locale: String,
    pub locales: Vec<String>,
    pub include: Vec<String>,
    pub exclude: Vec<String>,
    pub output: Option<String>,
    pub fallbacks: Vec<(String, Vec<String>)>,
    pub prefix_default: bool,
    pub lazy: Lazy,
}

impl Default for StaticConfig {
    fn default() -> Self {
        StaticConfig {
            default_locale: "en".into(),
            locales: Vec::new(),
            include: vec!["**/*.content.ts".into()],
            exclude: Vec::new(),
            output: None,
            fallbacks: Vec::new(),
            prefix_default: true,
            lazy: Lazy::Off,
        }
    }
}

impl StaticConfigResult {
    /// Applies the literal values over the defaults, with the same validity checks and notes as
    /// `apply` in `static-config.ts`.
    pub fn resolve(&self) -> (StaticConfig, Vec<String>) {
        let mut config = StaticConfig::default();
        let mut notes = self.notes.clone();
        let mut invalid = |key: &str, expected: &str| {
            notes.push(format!(
                "\"{key}\" could not be read statically (expected {expected})."
            ));
        };

        if let Some(value) = self.get("defaultLocale") {
            match value.as_str() {
                Some(text) if !text.is_empty() => config.default_locale = text.to_string(),
                _ => invalid("defaultLocale", "a string literal"),
            }
        }
        if let Some(value) = self.get("locales") {
            match value.as_string_array() {
                Some(list) => config.locales = list,
                None => invalid("locales", "an array of string literals"),
            }
        }
        if let Some(value) = self.get("include") {
            match (value.as_str(), value.as_string_array()) {
                (Some(text), _) => config.include = vec![text.to_string()],
                (None, Some(list)) => config.include = list,
                _ => invalid("include", "a string or array of strings"),
            }
        }
        if let Some(value) = self.get("exclude") {
            match value.as_string_array() {
                Some(list) => config.exclude = list,
                None => invalid("exclude", "an array of string literals"),
            }
        }
        if let Some(value) = self.get("output") {
            match value.as_str() {
                Some(text) if !text.is_empty() => config.output = Some(text.to_string()),
                _ => invalid("output", "a string literal"),
            }
        }
        if let Some(value) = self.get("fallbacks") {
            let parsed: Option<Vec<(String, Vec<String>)>> = match value {
                ConfigValue::Object(entries) => entries
                    .iter()
                    .map(|(key, list)| list.as_string_array().map(|items| (key.clone(), items)))
                    .collect(),
                _ => None,
            };
            match parsed {
                Some(entries) => config.fallbacks = entries,
                None => invalid("fallbacks", "an object of string arrays"),
            }
        }
        if let Some(value) = self.get("prefixDefault") {
            match value {
                ConfigValue::Bool(flag) => config.prefix_default = *flag,
                _ => invalid("prefixDefault", "true or false"),
            }
        }
        if let Some(value) = self.get("lazy") {
            match value {
                ConfigValue::Bool(true) => config.lazy = Lazy::On,
                ConfigValue::Bool(false) => config.lazy = Lazy::Off,
                ConfigValue::String(text) if text == "locale" => config.lazy = Lazy::PerLocale,
                _ => invalid("lazy", "true, false or \"locale\""),
            }
        }
        (config, notes)
    }
}
