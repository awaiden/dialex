//! References to dictionaries and keys in source text: `getDictionary("x")` and `t("x.y")`.
//! Hand-written scanners for the two patterns of `scanReferences` (`analysis.ts`), which need
//! backreferences and lookbehind that the `regex` crate does not offer.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefKind {
    Dictionary,
    Path,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reference {
    pub kind: RefKind,
    pub value: String,
    /// Byte offsets of the string's contents, without the quotes.
    pub start: usize,
    pub end: usize,
}

fn is_word(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || byte == b'_'
}

/// JavaScript's `\s*`, from `pos`.
fn skip_space(text: &str, mut pos: usize) -> usize {
    for c in text[pos..].chars() {
        let space = matches!(
            c,
            '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
                ..='\u{200a}'
                    | '\u{2028}'
                    | '\u{2029}'
                    | '\u{202f}'
                    | '\u{205f}'
                    | '\u{3000}'
                    | '\u{feff}'
        );
        if !space {
            break;
        }
        pos += c.len_utf8();
    }
    pos
}

fn quote_at(bytes: &[u8], pos: usize) -> Option<u8> {
    bytes
        .get(pos)
        .copied()
        .filter(|b| matches!(b, b'"' | b'\'' | b'`'))
}

/// `getDictionary("x")`, `useDictionary('x')` and `DialexDictionary(\`x\`)`.
fn dictionary_calls(text: &str, refs: &mut Vec<Reference>) {
    let bytes = text.as_bytes();
    let mut search = 0;
    while let Some(found) = text[search..].find("Dictionary(") {
        let at = search + found;
        search = at + 1;

        let prefix_start = ["get", "use", "Dialex"].iter().find_map(|prefix| {
            let start = at.checked_sub(prefix.len())?;
            (text.is_char_boundary(start) && &text[start..at] == *prefix).then_some(start)
        });
        let Some(prefix_start) = prefix_start else {
            continue;
        };
        if prefix_start > 0 && is_word(bytes[prefix_start - 1]) {
            continue; // `\b`
        }

        let after_paren = at + "Dictionary(".len();
        let quote_pos = skip_space(text, after_paren);
        let Some(quote) = quote_at(bytes, quote_pos) else {
            continue;
        };
        let start = quote_pos + 1;
        let mut end = start;
        while end < bytes.len() && !matches!(bytes[end], b'"' | b'\'' | b'`' | b'$' | b'\n') {
            end += 1;
        }
        if end == start || bytes.get(end) != Some(&quote) {
            continue;
        }
        refs.push(Reference {
            kind: RefKind::Dictionary,
            value: text[start..end].to_string(),
            start,
            end,
        });
        search = end + 1;
    }
}

/// `t("dictionary.key.path")`, not preceded by a word character, `$` or `.`.
fn path_calls(text: &str, refs: &mut Vec<Reference>) {
    let bytes = text.as_bytes();
    let mut search = 0;
    while let Some(found) = text[search..].find("t(") {
        let at = search + found;
        search = at + 1;
        if at > 0 && (is_word(bytes[at - 1]) || matches!(bytes[at - 1], b'$' | b'.')) {
            continue;
        }
        let quote_pos = skip_space(text, at + 2);
        let Some(quote) = quote_at(bytes, quote_pos) else {
            continue;
        };
        let start = quote_pos + 1;

        let segment = |from: usize| {
            let mut end = from;
            while end < bytes.len() && (is_word(bytes[end]) || bytes[end] == b'-') {
                end += 1;
            }
            end
        };
        let mut end = segment(start);
        if end == start {
            continue;
        }
        let mut segments = 1;
        while bytes.get(end) == Some(&b'.') {
            let next = segment(end + 1);
            if next == end + 1 {
                break;
            }
            end = next;
            segments += 1;
        }
        if segments < 2 || bytes.get(end) != Some(&quote) {
            continue;
        }
        refs.push(Reference {
            kind: RefKind::Path,
            value: text[start..end].to_string(),
            start,
            end,
        });
        search = end + 1;
    }
}

/// Byte ranges of `//`, `/* */` and `<!-- -->` comments. Quoted strings are skipped so
/// `"http://x"` is not a comment; `'` and `"` end at a newline, template literals do not.
fn comment_ranges(text: &str) -> Vec<(usize, usize)> {
    let bytes = text.as_bytes();
    let mut ranges = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        let c = bytes[i];
        if matches!(c, b'"' | b'\'' | b'`') {
            i += 1;
            while i < bytes.len() && bytes[i] != c && (c == b'`' || bytes[i] != b'\n') {
                if bytes[i] == b'\\' {
                    i += 1;
                }
                i += 1;
            }
            i += 1;
            continue;
        }
        let rest = &bytes[i..];
        let close: Option<&str> = if rest.starts_with(b"//") {
            Some("\n")
        } else if rest.starts_with(b"/*") {
            Some("*/")
        } else if rest.starts_with(b"<!--") {
            Some("-->")
        } else {
            None
        };
        let Some(close) = close else {
            i += 1;
            continue;
        };
        let from = (i + 2).min(text.len());
        let end = match text.get(from..).and_then(|rest| rest.find(close)) {
            Some(found) if close == "\n" => from + found,
            Some(found) => from + found + close.len(),
            None => text.len(),
        };
        ranges.push((i, end));
        i = end.max(i + 1);
    }
    ranges
}

/// Replaces comments with spaces of the same length, keeping offsets and line breaks.
fn mask_comments(text: &str, comments: &[(usize, usize)]) -> String {
    let mut bytes = text.as_bytes().to_vec();
    for &(from, to) in comments {
        for byte in &mut bytes[from..to] {
            if *byte != b'\n' {
                *byte = b' ';
            }
        }
    }
    // comment bounds fall on `//`, `/*` and `<!--`, which are ASCII, so no character is split
    String::from_utf8(bytes).unwrap_or_default()
}

/// Names that an object literal `dictionaries: { ... }` registers inline.
fn inline_dictionaries(masked: &str) -> Vec<String> {
    let bytes = masked.as_bytes();
    let mut names: Vec<String> = Vec::new();
    let mut search = 0;
    while let Some(found) = masked[search..].find("dictionaries") {
        let at = search + found;
        search = at + "dictionaries".len();
        if at > 0 && (is_word(bytes[at - 1]) || bytes[at - 1] == b'$') {
            continue; // `\b`
        }
        let colon = skip_space(masked, search);
        if bytes.get(colon) != Some(&b':') {
            continue;
        }
        let brace = skip_space(masked, colon + 1);
        if bytes.get(brace) != Some(&b'{') {
            continue;
        }

        let mut i = brace + 1;
        let mut depth = 1;
        let mut expect_key = true;
        while i < bytes.len() && depth > 0 {
            if expect_key && depth == 1 {
                expect_key = false;
                let from = skip_space(masked, i);
                let quoted = quote_at(bytes, from).filter(|q| *q != b'`');
                let (name_start, name_end) = match quoted {
                    Some(q) => {
                        let start = from + 1;
                        let mut end = start;
                        while end < bytes.len() && !matches!(bytes[end], b'"' | b'\'' | b'\n') {
                            end += 1;
                        }
                        if bytes.get(end) != Some(&q) {
                            i = end;
                            continue;
                        }
                        (start, end)
                    }
                    None => {
                        let mut end = from;
                        let first = bytes.get(from).copied().unwrap_or(0);
                        if first.is_ascii_alphabetic() || first == b'_' || first == b'$' {
                            while end < bytes.len()
                                && (is_word(bytes[end]) || matches!(bytes[end], b'$' | b'-'))
                            {
                                end += 1;
                            }
                        }
                        (from, end)
                    }
                };
                if name_end > name_start {
                    let after = if quoted.is_some() {
                        name_end + 1
                    } else {
                        name_end
                    };
                    let next = skip_space(masked, after);
                    if matches!(bytes.get(next), Some(b':' | b',' | b'}')) {
                        let name = masked[name_start..name_end].to_string();
                        if !names.contains(&name) {
                            names.push(name);
                        }
                        i = after;
                    }
                }
                continue;
            }
            let c = bytes[i];
            if matches!(c, b'"' | b'\'' | b'`') {
                i += 1;
                while i < bytes.len() && bytes[i] != c && (c == b'`' || bytes[i] != b'\n') {
                    if bytes[i] == b'\\' {
                        i += 1;
                    }
                    i += 1;
                }
            } else if matches!(c, b'{' | b'[' | b'(') {
                depth += 1;
            } else if matches!(c, b'}' | b']' | b')') {
                depth -= 1;
            } else if c == b',' && depth == 1 {
                expect_key = true;
            }
            i += 1;
        }
        search = search.max(i.min(bytes.len()));
    }
    names
}

/// Lines (zero-based) that a `dialex-ignore` / `dialex-ignore-next-line` comment excludes.
fn ignored_lines(text: &str, comments: &[(usize, usize)]) -> std::collections::HashSet<u32> {
    let mut lines = std::collections::HashSet::new();
    if !text.contains("dialex-ignore") {
        return lines;
    }
    for &(from, to) in comments {
        let comment = &text[from..to];
        let Some(at) = comment.find("dialex-ignore") else {
            continue;
        };
        let rest = &comment[at + "dialex-ignore".len()..];
        let next_line = rest.starts_with("-next-line");
        let tail = if next_line {
            &rest["-next-line".len()..]
        } else {
            rest
        };
        if tail
            .chars()
            .next()
            .is_some_and(|c| c.is_alphanumeric() || c == '_' || c == '-')
        {
            continue; // part of a longer word: `dialex-ignore-nothing`
        }
        let first = line_of(text, from);
        let last = line_of(text, to.saturating_sub(1).max(from));
        if next_line {
            lines.insert(last + 1);
        } else {
            lines.extend(first..=last);
        }
    }
    lines
}

/// References and inline dictionary names found in one source file.
pub struct Scan {
    pub references: Vec<Reference>,
    pub inline: Vec<String>,
}

/// Finds the references in `text`, ordered by position, and the dictionaries it registers inline.
/// References in comments and on lines a `dialex-ignore` comment covers are skipped.
pub fn scan_text(text: &str) -> Scan {
    let mut refs = Vec::new();
    dictionary_calls(text, &mut refs);
    path_calls(text, &mut refs);
    let comments = comment_ranges(text);
    refs.retain(|r| {
        !comments
            .iter()
            .any(|&(from, to)| r.start >= from && r.start < to)
    });
    let ignored = ignored_lines(text, &comments);
    if !ignored.is_empty() {
        refs.retain(|r| !ignored.contains(&line_of(text, r.start)));
    }
    refs.sort_by_key(|r| r.start);
    let inline = if text.contains("dictionaries") {
        inline_dictionaries(&mask_comments(text, &comments))
    } else {
        Vec::new()
    };
    Scan {
        references: refs,
        inline,
    }
}

/// Finds the references in `text`, ordered by position.
pub fn scan_references(text: &str) -> Vec<Reference> {
    scan_text(text).references
}

/// Distinct word-like tokens (`[\w$-]+`), for the unused-key heuristic.
pub fn tokens(text: &str) -> std::collections::HashSet<&str> {
    let bytes = text.as_bytes();
    let mut set = std::collections::HashSet::new();
    let mut start = None;
    for (i, &byte) in bytes.iter().enumerate() {
        let part = is_word(byte) || byte == b'$' || byte == b'-';
        match (part, start) {
            (true, None) => start = Some(i),
            (false, Some(s)) => {
                set.insert(&text[s..i]);
                start = None;
            }
            _ => {}
        }
    }
    if let Some(s) = start {
        set.insert(&text[s..]);
    }
    set
}

/// Zero-based line of a byte offset.
pub fn line_of(text: &str, offset: usize) -> u32 {
    text.as_bytes()[..offset.min(text.len())]
        .iter()
        .filter(|&&b| b == b'\n')
        .count() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ignores_references_in_comments() {
        let text = "// getDictionary(\"a\")\n/* t(\"b.c\") */\n<!-- t(\"d.e\") -->\n\
                    const x = getDictionary(\"real\"); // t(\"f.g\")\n";
        let refs = scan_references(text);
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].value, "real");
    }

    #[test]
    fn honours_dialex_ignore_comments() {
        let text = "// dialex-ignore-next-line\ngetDictionary(\"a\");\n\
                    getDictionary(\"b\"); // dialex-ignore\n\
                    getDictionary(\"c\");\n// dialex-ignore-nothing\ngetDictionary(\"d\");";
        let values: Vec<_> = scan_references(text).into_iter().map(|r| r.value).collect();
        assert_eq!(values, ["c", "d"]);
    }

    #[test]
    fn collects_inline_dictionaries() {
        let text = "createDialexServer({ dictionaries: { bench: { en: { a: \"x\" } }, \"kebab-name\": {}, \
                    shorthand, /* c: 1, */ list: [1, { z: 2 }] } });";
        assert_eq!(
            scan_text(text).inline,
            ["bench", "kebab-name", "shorthand", "list"]
        );
        assert!(scan_text("// dictionaries: { ghost: {} }")
            .inline
            .is_empty());
    }

    #[test]
    fn url_in_string_is_not_a_comment() {
        let text = "const u = \"http://x\"; getDictionary(\"real\");";
        assert_eq!(scan_references(text).len(), 1);
    }
}
