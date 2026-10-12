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

/// Finds the references in `text`, ordered by position.
pub fn scan_references(text: &str) -> Vec<Reference> {
    let mut refs = Vec::new();
    dictionary_calls(text, &mut refs);
    path_calls(text, &mut refs);
    refs.sort_by_key(|r| r.start);
    refs
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
