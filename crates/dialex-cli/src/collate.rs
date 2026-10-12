use std::cmp::Ordering;

/// Primary weight of an ASCII character in the CLDR root collation: whitespace, punctuation,
/// symbols, digits, then letters (case-insensitive).
fn primary(c: u8) -> u16 {
    const ORDER: &[u8] = b"\t\n\x0b\x0c\r _-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$";
    if let Some(index) = ORDER.iter().position(|&x| x == c) {
        return index as u16;
    }
    match c {
        b'0'..=b'9' => 100 + (c - b'0') as u16,
        b'a'..=b'z' => 200 + (c - b'a') as u16,
        b'A'..=b'Z' => 200 + (c - b'A') as u16,
        _ => 1000 + c as u16,
    }
}

/// `a.localeCompare(b)` for ASCII strings, or `None` when either has other characters (the caller
/// then lets Node decide).
pub fn locale_compare(a: &str, b: &str) -> Option<Ordering> {
    if !a.is_ascii() || !b.is_ascii() {
        return None;
    }
    let (a, b) = (a.as_bytes(), b.as_bytes());

    // Primary: compare weights ignoring case; the shorter prefix sorts first.
    let ordering = a
        .iter()
        .map(|&c| primary(c))
        .cmp(b.iter().map(|&c| primary(c)));
    if ordering != Ordering::Equal {
        return Some(ordering);
    }
    // Tertiary: at the first difference of case, lowercase sorts before uppercase.
    for (&x, &y) in a.iter().zip(b) {
        if x != y {
            return Some(if x.is_ascii_lowercase() {
                Ordering::Less
            } else {
                Ordering::Greater
            });
        }
    }
    Some(Ordering::Equal)
}
