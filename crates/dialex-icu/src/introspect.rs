use crate::parse::{parse_message, Node};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArgumentType {
    Argument,
    Number,
    Date,
    Time,
    Plural,
    SelectOrdinal,
    Select,
}

impl ArgumentType {
    pub fn as_str(self) -> &'static str {
        match self {
            ArgumentType::Argument => "argument",
            ArgumentType::Number => "number",
            ArgumentType::Date => "date",
            ArgumentType::Time => "time",
            ArgumentType::Plural => "plural",
            ArgumentType::SelectOrdinal => "selectordinal",
            ArgumentType::Select => "select",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Argument {
    pub name: String,
    pub kind: ArgumentType,
    /// Selectors of a plural or select, in `Object.keys` order.
    pub selectors: Option<Vec<String>>,
}

/// The order `Object.keys` gives a plain object: integer-like keys ascending first, then the
/// others in insertion order.
pub fn js_key_order(keys: &[String]) -> Vec<String> {
    let is_index = |key: &str| {
        !key.is_empty()
            && key.bytes().all(|b| b.is_ascii_digit())
            && (key == "0" || !key.starts_with('0'))
            && key
                .parse::<u64>()
                .map(|n| n < u32::MAX as u64)
                .unwrap_or(false)
    };
    let mut indexes: Vec<&String> = keys.iter().filter(|key| is_index(key)).collect();
    indexes.sort_by_key(|key| key.parse::<u64>().unwrap());
    indexes
        .into_iter()
        .chain(keys.iter().filter(|key| !is_index(key)))
        .cloned()
        .collect()
}

/// The distinct arguments of a parsed message, including those in nested branches.
pub fn get_arguments(nodes: &[Node]) -> Vec<Argument> {
    let mut found: Vec<(String, Argument)> = Vec::new();

    fn walk(nodes: &[Node], found: &mut Vec<(String, Argument)>) {
        for node in nodes {
            let (name, kind, options) = match node {
                Node::Literal(_) | Node::Pound => continue,
                Node::Argument { name } => (name, ArgumentType::Argument, None),
                Node::Number { name, .. } => (name, ArgumentType::Number, None),
                Node::Date { name, .. } => (name, ArgumentType::Date, None),
                Node::Time { name, .. } => (name, ArgumentType::Time, None),
                Node::Plural {
                    name,
                    ordinal,
                    options,
                    ..
                } => (
                    name,
                    if *ordinal {
                        ArgumentType::SelectOrdinal
                    } else {
                        ArgumentType::Plural
                    },
                    Some(options),
                ),
                Node::Select { name, options } => (name, ArgumentType::Select, Some(options)),
            };
            let key = format!("{name}:{}", kind.as_str());
            if !found.iter().any(|(existing, _)| *existing == key) {
                found.push((
                    key,
                    Argument {
                        name: name.clone(),
                        kind,
                        selectors: options.map(|o| js_key_order(&o.keys())),
                    },
                ));
            }
            if let Some(options) = options {
                // `Object.values(options)`: integer-like selectors first
                for key in js_key_order(&options.keys()) {
                    walk(options.get(&key).unwrap(), found);
                }
            }
        }
    }
    walk(nodes, &mut found);
    found.into_iter().map(|(_, argument)| argument).collect()
}

fn is_identifier(name: &str) -> bool {
    let mut chars = name.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' || c == '$' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
}

fn json(text: &str) -> String {
    serde_json::to_string(text).unwrap()
}

fn type_of_argument(uses: &[&Argument]) -> String {
    if uses.iter().any(|u| {
        matches!(
            u.kind,
            ArgumentType::Plural | ArgumentType::SelectOrdinal | ArgumentType::Number
        )
    }) {
        return "number".into();
    }
    if uses
        .iter()
        .any(|u| matches!(u.kind, ArgumentType::Date | ArgumentType::Time))
    {
        return "Date | number".into();
    }
    if let Some(select) = uses.iter().find(|u| u.kind == ArgumentType::Select) {
        let options: Vec<&String> = select
            .selectors
            .as_deref()
            .unwrap_or(&[])
            .iter()
            .filter(|s| s.as_str() != "other")
            .collect();
        return if options.is_empty() {
            "string".into()
        } else {
            format!(
                "{} | (string & {{}})",
                options
                    .iter()
                    .map(|o| json(o))
                    .collect::<Vec<_>>()
                    .join(" | ")
            )
        };
    }
    "string | number | boolean | Date".into()
}

/// `{ count: number; name: string | number | boolean | Date }` for one message, or `None` when it
/// has no arguments or is not valid ICU.
pub fn message_type(message: &str) -> Option<String> {
    if !message.contains('{') {
        return None;
    }
    let nodes = parse_message(message).ok()?;
    let args = get_arguments(&nodes);
    if args.is_empty() {
        return None;
    }

    let mut by_name: Vec<(&str, Vec<&Argument>)> = Vec::new();
    for arg in &args {
        match by_name.iter_mut().find(|(name, _)| *name == arg.name) {
            Some((_, uses)) => uses.push(arg),
            None => by_name.push((&arg.name, vec![arg])),
        }
    }
    let members: Vec<String> = by_name
        .iter()
        .map(|(name, uses)| {
            let key = if is_identifier(name) {
                (*name).to_string()
            } else {
                json(name)
            };
            format!("{key}: {}", type_of_argument(uses))
        })
        .collect();
    Some(format!("{{ {} }}", members.join("; ")))
}

/// A comparable description of a message's arguments, ignoring plural and select branch text:
/// sorted `name:type` pairs joined by commas (`argument` is shown as `any`).
pub fn argument_signature(nodes: &[Node]) -> String {
    let mut parts: Vec<String> = get_arguments(nodes)
        .iter()
        .map(|argument| {
            let kind = if argument.kind == ArgumentType::Argument {
                "any"
            } else {
                argument.kind.as_str()
            };
            format!("{}:{kind}", argument.name)
        })
        .collect();
    // JavaScript's default sort compares UTF-16 code units
    parts.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    parts.join(",")
}

/// Every plural and selectordinal of a parsed message, nested ones included, in walk order.
pub fn find_plurals(nodes: &[Node]) -> Vec<&Node> {
    let mut plurals = Vec::new();
    fn walk<'a>(nodes: &'a [Node], plurals: &mut Vec<&'a Node>) {
        for node in nodes {
            if matches!(node, Node::Plural { .. }) {
                plurals.push(node);
            }
            let options = match node {
                Node::Plural { options, .. } | Node::Select { options, .. } => Some(options),
                _ => None,
            };
            if let Some(options) = options {
                for key in js_key_order(&options.keys()) {
                    walk(options.get(&key).unwrap(), plurals);
                }
            }
        }
    }
    walk(nodes, &mut plurals);
    plurals
}

fn is_js_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200a}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202f}'
                | '\u{205f}'
                | '\u{3000}'
                | '\u{feff}'
    )
}

/// `/\{\s*[^\s,{}]+\s*,\s*(plural|selectordinal|select|number|date|time)\b/` found anywhere in
/// the message: whether it uses plural, select, number, date or time arguments.
pub fn is_icu_structured(message: &str) -> bool {
    let chars: Vec<char> = message.chars().collect();
    let is_word = |c: char| c.is_ascii_alphanumeric() || c == '_';
    for start in 0..chars.len() {
        if chars[start] != '{' {
            continue;
        }
        let mut i = start + 1;
        while i < chars.len() && is_js_space(chars[i]) {
            i += 1;
        }
        let name_start = i;
        while i < chars.len() && !is_js_space(chars[i]) && !matches!(chars[i], ',' | '{' | '}') {
            i += 1;
        }
        if i == name_start {
            continue;
        }
        while i < chars.len() && is_js_space(chars[i]) {
            i += 1;
        }
        if chars.get(i) != Some(&',') {
            continue;
        }
        i += 1;
        while i < chars.len() && is_js_space(chars[i]) {
            i += 1;
        }
        for keyword in [
            "plural",
            "selectordinal",
            "select",
            "number",
            "date",
            "time",
        ] {
            let word: Vec<char> = keyword.chars().collect();
            if chars[i..].starts_with(&word)
                && !chars.get(i + word.len()).copied().is_some_and(is_word)
            {
                return true;
            }
        }
    }
    false
}
