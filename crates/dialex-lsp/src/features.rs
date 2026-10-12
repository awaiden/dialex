//! Editor features over an analyzed project: references under the cursor, hover, definition,
//! completion and the text of quick fixes (ports of `packages/language-server/src/features`).

use std::path::{Path, PathBuf};

use dialex_cli::analysis::{Analysis, AnalyzedDictionary, Range, TODO_PREFIX};
use dialex_cli::refs::{scan_references, RefKind};
use dialex_syntax::{copy_leaf, set_string, LeafKind};
use fancy_regex::Regex;

use crate::text::{byte_of_column, column_of_byte};

/// What the editor features know about one Dialex project (a folder with its own config).
pub struct Project {
    pub root: PathBuf,
    pub default_locale: String,
    pub analysis: Analysis,
}

impl Project {
    /// Dictionaries by name; a name used twice resolves to the last one, like a `Map`.
    pub fn dictionaries(&self) -> Vec<&AnalyzedDictionary> {
        let mut out: Vec<&AnalyzedDictionary> = Vec::new();
        for d in &self.analysis.dictionaries {
            match out.iter_mut().find(|e| e.name == d.name) {
                Some(slot) => *slot = d,
                None => out.push(d),
            }
        }
        out
    }

    pub fn dictionary(&self, name: &str) -> Option<&AnalyzedDictionary> {
        self.analysis
            .dictionaries
            .iter()
            .rev()
            .find(|d| d.name == name)
    }

    /// Locales with the default locale first.
    pub fn ordered_locales<'a>(&self, d: &'a AnalyzedDictionary) -> Vec<&'a str> {
        d.locales
            .iter()
            .filter(|l| **l == self.default_locale)
            .chain(d.locales.iter().filter(|l| **l != self.default_locale))
            .map(String::as_str)
            .collect()
    }
}

/// The project whose root contains `file`, preferring the deepest (nested projects).
pub fn project_for_file<'a>(projects: &'a [Project], file: &Path) -> Option<&'a Project> {
    let mut best: Option<&Project> = None;
    for project in projects {
        if !file.starts_with(&project.root) {
            continue;
        }
        if best.is_none_or(|b| project.root.as_os_str().len() > b.root.as_os_str().len()) {
            best = Some(project);
        }
    }
    best
}

// --- bindings ---------------------------------------------------------------------------------

/// Variable name -> dictionary name, in order of declaration (`const s = useDictionary("x")`).
pub type Bindings = Vec<(String, String)>;

const WORD: &str = "A-Za-z0-9_";

fn declaration() -> &'static Regex {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(&format!(
            r#"\b(?:const|let|var)\s+([A-Za-z_$][{WORD}$]*)\s*(?::[^=\n]+)?=\s*(?:await\s+)?(?:[A-Za-z_$][{WORD}$]*\.)*(?:getDictionary|useDictionary|injectDictionary)\s*(?:<[^()]*?>)?\(\s*(["'`])([^"'`$\n]+)\2"#
        ))
        .unwrap()
    })
}

/// The variables in a file that hold a dictionary. A text match: a variable that is reassigned or
/// shadowed in another scope may resolve to the wrong dictionary, which only affects hints.
pub fn find_bindings(text: &str) -> Bindings {
    let mut bindings: Bindings = Vec::new();
    for captures in declaration().captures_iter(text).flatten() {
        let name = captures[1].to_string();
        let dictionary = captures[3].to_string();
        match bindings.iter_mut().find(|(n, _)| *n == name) {
            Some(existing) => existing.1 = dictionary,
            None => bindings.push((name, dictionary)),
        }
    }
    bindings
}

// --- references -------------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
pub struct Found {
    pub kind: RefKind,
    pub value: String,
    /// UTF-16 columns in the line.
    pub start: u32,
    pub end: u32,
}

fn member_chain() -> &'static Regex {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(&format!(
            r#"(?:getDictionary|useDictionary)\(\s*(["'`])([^"'`$\n]+)\1[^()\n]*\)((?:\??\.[A-Za-z_$][{WORD}$]*)+)"#
        ))
        .unwrap()
    })
}

fn member() -> &'static Regex {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| Regex::new(&format!(r"\??\.([A-Za-z_$][{WORD}$]*)")).unwrap())
}

fn escape_regex(text: &str) -> String {
    let mut out = String::new();
    for c in text.chars() {
        if ".*+?^${}()|[]\\".contains(c) {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

/// The members of a chain such as `.nav.about`, as `(name, start, end)` byte offsets in `line`.
fn chain_members(chain_start: usize, chain: &str) -> Vec<(String, usize, usize)> {
    member()
        .captures_iter(chain)
        .flatten()
        .map(|m| {
            let name = m.get(1).unwrap();
            (
                name.as_str().to_string(),
                chain_start + name.start(),
                chain_start + name.end(),
            )
        })
        .collect()
}

/// The Dialex reference under the cursor on one line of code: a dictionary name, a `t("a.b.c")`
/// path, a member of `getDictionary("a")`, or, with `bindings`, a member of a variable that holds
/// a dictionary. `character` is a UTF-16 column.
pub fn find_reference_at(line: &str, character: u32, bindings: &Bindings) -> Option<Found> {
    let cursor = byte_of_column(line, character);
    let found = |kind, value: String, start: usize, end: usize| Found {
        kind,
        value,
        start: column_of_byte(line, start),
        end: column_of_byte(line, end),
    };

    if let Some(r) = scan_references(line)
        .into_iter()
        .find(|r| cursor >= r.start && cursor <= r.end)
    {
        return Some(found(r.kind, r.value, r.start, r.end));
    }

    for captures in member_chain().captures_iter(line).flatten() {
        let dictionary = captures[2].to_string();
        let chain = captures.get(3).unwrap();
        let mut keys: Vec<String> = Vec::new();
        for (name, start, end) in chain_members(chain.start(), chain.as_str()) {
            keys.push(name);
            if cursor >= start && cursor <= end {
                let value = std::iter::once(dictionary.as_str())
                    .chain(keys.iter().map(String::as_str))
                    .collect::<Vec<_>>()
                    .join(".");
                return Some(found(RefKind::Path, value, start, end));
            }
        }
    }

    for (name, dictionary) in bindings {
        let Ok(chain) = Regex::new(&format!(
            r"(?<![{WORD}$.]){}(?![{WORD}$])((?:\??\.[A-Za-z_$][{WORD}$]*)*)",
            escape_regex(name)
        )) else {
            continue;
        };
        for captures in chain.captures_iter(line).flatten() {
            let whole = captures.get(0).unwrap();
            let name_start = whole.start();
            let name_end = name_start + name.len();
            if cursor >= name_start && cursor <= name_end {
                return Some(found(
                    RefKind::Dictionary,
                    dictionary.clone(),
                    name_start,
                    name_end,
                ));
            }
            let rest = captures.get(1).unwrap();
            let mut keys: Vec<String> = Vec::new();
            for (key, start, end) in chain_members(rest.start(), rest.as_str()) {
                keys.push(key);
                if cursor >= start && cursor <= end {
                    let value = std::iter::once(dictionary.as_str())
                        .chain(keys.iter().map(String::as_str))
                        .collect::<Vec<_>>()
                        .join(".");
                    return Some(found(RefKind::Path, value, start, end));
                }
            }
        }
    }
    None
}

pub struct Resolved<'a> {
    pub dictionary: &'a AnalyzedDictionary,
    /// Empty for a reference to the dictionary itself.
    pub key_path: Vec<String>,
}

pub fn resolve_reference<'a>(project: &'a Project, found: &Found) -> Option<Resolved<'a>> {
    if found.kind == RefKind::Dictionary {
        return project.dictionary(&found.value).map(|dictionary| Resolved {
            dictionary,
            key_path: Vec::new(),
        });
    }
    let mut parts = found.value.split('.');
    let name = parts.next()?;
    let dictionary = project.dictionary(name)?;
    Some(Resolved {
        dictionary,
        key_path: parts.map(String::from).collect(),
    })
}

#[derive(PartialEq)]
enum PathClass {
    Leaf,
    Group,
    Missing,
}

fn classify_path(d: &AnalyzedDictionary, key_path: &[String]) -> PathClass {
    let joined = key_path.join(".");
    if d.paths.contains(&joined) {
        return PathClass::Leaf;
    }
    let prefix = format!("{joined}.");
    if d.paths.iter().any(|p| p.starts_with(&prefix)) {
        PathClass::Group
    } else {
        PathClass::Missing
    }
}

// --- hover ------------------------------------------------------------------------------------

/// Escapes Markdown so translation text cannot change the hover's formatting.
pub fn escape_markdown(text: &str) -> String {
    let mut out = String::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '\r' if chars.peek() == Some(&'\n') => {}
            '\r' | '\n' => out.push_str("<br>"),
            '\\' | '`' | '*' | '_' | '{' | '}' | '[' | ']' | '(' | ')' | '#' | '+' | '!' | '|'
            | '<' | '>' | '~' => {
                out.push('\\');
                out.push(c);
            }
            _ => out.push(c),
        }
    }
    take_units(&out, 400)
}

/// The first `units` UTF-16 code units of `text` (a whole code point is never split).
fn take_units(text: &str, units: usize) -> String {
    let mut count = 0;
    let mut out = String::new();
    for c in text.chars() {
        count += c.len_utf16();
        if count > units {
            break;
        }
        out.push(c);
    }
    out
}

fn cell(d: &AnalyzedDictionary, locale: &str, key_path: &[String]) -> String {
    let Some(leaf) = d.get(locale, &key_path.join(".")) else {
        return "_missing_".into();
    };
    match leaf.kind {
        LeafKind::String => escape_markdown(leaf.value.as_deref().unwrap_or("")),
        LeafKind::Function => match d.leaf_source(locale, key_path) {
            Some(source) => {
                let source = source.replace('`', "'");
                let collapsed = source.split_whitespace().collect::<Vec<_>>().join(" ");
                format!("`{}`", take_units(&collapsed, 160))
            }
            None => "_function_".into(),
        },
        LeafKind::Other => "_value_".into(),
    }
}

fn plural(count: usize) -> &'static str {
    if count == 1 {
        ""
    } else {
        "s"
    }
}

/// Markdown for a hover over a Dialex reference, or `None` for unknown ones.
pub fn build_hover(project: &Project, found: &Found) -> Option<String> {
    let Resolved {
        dictionary: d,
        key_path,
    } = resolve_reference(project, found)?;
    let file = d
        .file
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();

    if key_path.is_empty() {
        return Some(
            [
                format!("**{}** · {file}", d.name),
                String::new(),
                format!(
                    "{} key{} · locales: {}",
                    d.paths.len(),
                    plural(d.paths.len()),
                    d.locales.join(", ")
                ),
            ]
            .join("\n"),
        );
    }

    let title = format!("**{}.{}** · {file}", d.name, key_path.join("."));
    match classify_path(d, &key_path) {
        PathClass::Missing => None,
        PathClass::Group => {
            let prefix = format!("{}.", key_path.join("."));
            let mut children: Vec<String> = Vec::new();
            for path in d.paths.iter().filter(|p| p.starts_with(&prefix)) {
                let child = path[prefix.len()..].split('.').next().unwrap().to_string();
                if !children.contains(&child) {
                    children.push(child);
                }
            }
            Some(format!(
                "{title}\n\n{} key{}: {}",
                children.len(),
                plural(children.len()),
                children
                    .iter()
                    .map(|c| format!("`{c}`"))
                    .collect::<Vec<_>>()
                    .join(", ")
            ))
        }
        PathClass::Leaf => {
            let mut lines = vec![
                title,
                String::new(),
                "| Locale | Text |".to_string(),
                "| --- | --- |".to_string(),
            ];
            for locale in project.ordered_locales(d) {
                lines.push(format!("| {locale} | {} |", cell(d, locale, &key_path)));
            }
            Some(lines.join("\n"))
        }
    }
}

// --- definition -------------------------------------------------------------------------------

pub struct Target {
    pub file: PathBuf,
    pub range: Range,
}

/// Where a reference is defined: the key in the default locale if it has one, otherwise in the
/// first locale that does. A dictionary reference points at the dictionary object.
pub fn definition_for(project: &Project, found: &Found) -> Option<Target> {
    let Resolved {
        dictionary: d,
        key_path,
    } = resolve_reference(project, found)?;
    if key_path.is_empty() {
        return Some(Target {
            file: d.file.clone(),
            range: d.dictionary_range(),
        });
    }
    for locale in project.ordered_locales(d) {
        if let Some(range) = d.key_range(locale, &key_path) {
            return Some(Target {
                file: d.file.clone(),
                range,
            });
        }
    }
    None
}

// --- completion -------------------------------------------------------------------------------

pub enum CompletionContext {
    Dictionary {
        call: String,
        typed: String,
        length: u32,
    },
    Path {
        dictionary: String,
        parent: Vec<String>,
        typed: String,
        length: u32,
    },
}

fn call_pattern() -> &'static Regex {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r#"(?<![A-Za-z0-9_$.])(t|getDictionary|useDictionary|DialexDictionary)\(\s*(["'`])([^"'`\n]*)$"#,
        )
        .unwrap()
    })
}

fn utf16_len(text: &str) -> u32 {
    text.encode_utf16().count() as u32
}

/// Whether the cursor is inside the string argument of a Dialex call, and what is being typed.
/// `before` is the line up to the cursor.
pub fn completion_context_at(before: &str, bindings: &Bindings) -> Option<CompletionContext> {
    let Some(captures) = call_pattern().captures(before).ok().flatten() else {
        return member_context_at(before, bindings);
    };
    let call = captures[1].to_string();
    let value = captures[3].to_string();
    if call == "t" && value.contains('.') {
        let mut segments: Vec<&str> = value.split('.').collect();
        let typed = segments.pop().unwrap().to_string();
        let dictionary = segments[0].to_string();
        let parent = segments[1..].iter().map(|s| s.to_string()).collect();
        let length = utf16_len(&typed);
        return Some(CompletionContext::Path {
            dictionary,
            parent,
            typed,
            length,
        });
    }
    let length = utf16_len(&value);
    Some(CompletionContext::Dictionary {
        call,
        typed: value,
        length,
    })
}

/// `s.nav.fe|` where `s` holds a dictionary: the keys under `nav` that start with `fe`.
fn member_context_at(before: &str, bindings: &Bindings) -> Option<CompletionContext> {
    for (name, dictionary) in bindings {
        let Ok(pattern) = Regex::new(&format!(
            r"(?<![{WORD}$.]){}((?:\??\.[A-Za-z_$][{WORD}$]*)*)\??\.([A-Za-z_$][{WORD}$]*)?$",
            escape_regex(name)
        )) else {
            continue;
        };
        let Some(captures) = pattern.captures(before).ok().flatten() else {
            continue;
        };
        let parent: Vec<String> = member()
            .captures_iter(captures.get(1).map_or("", |m| m.as_str()))
            .flatten()
            .map(|m| m[1].to_string())
            .collect();
        let typed = captures
            .get(2)
            .map_or(String::new(), |m| m.as_str().to_string());
        let length = utf16_len(&typed);
        return Some(CompletionContext::Path {
            dictionary: dictionary.clone(),
            parent,
            typed,
            length,
        });
    }
    None
}

#[derive(Clone, Copy, PartialEq)]
pub enum EntryKind {
    Dictionary,
    Group,
    Leaf,
}

pub struct CompletionEntry {
    pub label: String,
    pub kind: EntryKind,
    pub detail: String,
    pub insert_text: String,
}

fn preview(text: &str) -> String {
    let units: Vec<u16> = text.encode_utf16().collect();
    if units.len() > 60 {
        format!("{}...", String::from_utf16_lossy(&units[..57]))
    } else {
        text.to_string()
    }
}

/// Suggestions for the string being typed, filtered by what is already there.
pub fn completion_entries(project: &Project, context: &CompletionContext) -> Vec<CompletionEntry> {
    match context {
        CompletionContext::Dictionary { call, typed, .. } => project
            .dictionaries()
            .into_iter()
            .filter(|d| d.name.starts_with(typed.as_str()))
            .map(|d| {
                // t("home.title") continues with a dot; getDictionary("home") is complete as is
                let continues = call == "t";
                CompletionEntry {
                    label: d.name.clone(),
                    kind: EntryKind::Dictionary,
                    detail: format!("{} keys · {}", d.paths.len(), d.locales.join(", ")),
                    insert_text: if continues {
                        format!("{}.", d.name)
                    } else {
                        d.name.clone()
                    },
                }
            })
            .collect(),
        CompletionContext::Path {
            dictionary,
            parent,
            typed,
            ..
        } => {
            let Some(d) = project.dictionary(dictionary) else {
                return Vec::new();
            };
            let prefix = if parent.is_empty() {
                String::new()
            } else {
                format!("{}.", parent.join("."))
            };
            let mut children: Vec<(String, bool)> = Vec::new();
            for key in &d.paths {
                if !key.starts_with(&prefix) {
                    continue;
                }
                let rest: Vec<&str> = key[prefix.len()..].split('.').collect();
                let name = rest[0];
                if !name.starts_with(typed.as_str()) {
                    continue;
                }
                match children.iter_mut().find(|(n, _)| n == name) {
                    Some(entry) => {
                        if rest.len() > 1 {
                            entry.1 = false;
                        }
                    }
                    None => children.push((name.to_string(), rest.len() == 1)),
                }
            }
            children
                .into_iter()
                .map(|(name, leaf)| {
                    let full = format!("{prefix}{name}");
                    let holder = std::iter::once(project.default_locale.as_str())
                        .chain(d.locales.iter().map(String::as_str))
                        .find(|l| d.has(l, &full));
                    let value = holder.and_then(|l| d.get(l, &full));
                    let detail = if leaf {
                        match value {
                            Some(v) if v.kind == LeafKind::String => {
                                preview(v.value.as_deref().unwrap_or(""))
                            }
                            Some(v) => format!(
                                "({})",
                                if v.kind == LeafKind::Function {
                                    "function"
                                } else {
                                    "other"
                                }
                            ),
                            None => String::new(),
                        }
                    } else {
                        "keys…".to_string()
                    };
                    CompletionEntry {
                        insert_text: if leaf {
                            name.clone()
                        } else {
                            format!("{name}.")
                        },
                        label: name,
                        kind: if leaf {
                            EntryKind::Leaf
                        } else {
                            EntryKind::Group
                        },
                        detail,
                    }
                })
                .collect()
        }
    }
}

// --- quick fixes ------------------------------------------------------------------------------

pub struct MissingKey {
    pub locale: String,
    pub path: Vec<String>,
    /// A locale that has the key, to copy its value from.
    pub source_locale: Option<String>,
}

/// New text for a dictionary file with `missing` keys added to their locales, copied from the
/// source locale (strings get the `[TODO] ` marker, like `dialex check --fix`).
pub fn add_missing_keys(file: &str, text: &str, missing: &[MissingKey]) -> Option<String> {
    let mut current = text.to_string();
    let mut changed = false;
    let mark = |value: &str| format!("{TODO_PREFIX}{value}");
    for key in missing {
        let Some(source) = &key.source_locale else {
            continue;
        };
        if let Some(next) = copy_leaf(file, &current, source, &key.locale, &key.path, Some(&mark)) {
            current = next;
            changed = true;
        }
    }
    changed.then_some(current)
}

/// New text with a key that code refers to but the dictionary lacks, added to every locale as a
/// `[TODO]` placeholder named after the key.
pub fn add_unknown_key(file: &str, text: &str, key_path: &[String]) -> Option<String> {
    let dictionary = dialex_syntax::parse_dictionary(file, text).ok()??;
    let placeholder = format!("{TODO_PREFIX}{}", key_path.last()?);
    let mut current = text.to_string();
    let mut changed = false;
    for locale in dictionary.locale_names() {
        let present = dictionary.locale(&locale).is_some_and(|l| {
            l.leaves.iter().any(|leaf| {
                leaf.path.len() >= key_path.len() && leaf.path[..key_path.len()] == *key_path
            })
        });
        if present {
            continue;
        }
        if let Some(next) = set_string(file, &current, &locale, key_path, &placeholder) {
            current = next;
            changed = true;
        }
    }
    changed.then_some(current)
}
