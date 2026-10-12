use crate::plural_data::{LANGUAGES, REGIONAL};

/// The plural categories (without `other`) a locale's rules use, in CLDR order. `None` when the
/// tag is something this table cannot answer for (unknown language, extensions); the caller then
/// lets Node decide. An invalid tag has no categories, like the `RangeError` `Intl` throws.
pub fn required_categories(locale: &str, ordinal: bool) -> Option<Vec<&'static str>> {
    // Intl rejects anything that is not a structurally valid BCP 47 tag
    if locale.is_empty()
        || locale.split('-').any(|part| {
            part.is_empty() || part.len() > 8 || !part.bytes().all(|b| b.is_ascii_alphanumeric())
        })
    {
        return Some(Vec::new());
    }
    let parts: Vec<&str> = locale.split('-').collect();
    let language = parts[0].to_ascii_lowercase();
    let language_ok = language.bytes().all(|b| b.is_ascii_alphabetic())
        && (language.len() == 2 || language.len() == 3 || (5..=8).contains(&language.len()));
    if !language_ok {
        return Some(Vec::new());
    }
    // language, optional script, optional region: anything longer is left to Node
    let mut index = 1;
    if parts
        .get(index)
        .is_some_and(|p| p.len() == 4 && p.bytes().all(|b| b.is_ascii_alphabetic()))
    {
        index += 1;
    }
    if parts.get(index).is_some_and(|p| {
        (p.len() == 2 && p.bytes().all(|b| b.is_ascii_alphabetic()))
            || (p.len() == 3 && p.bytes().all(|b| b.is_ascii_digit()))
    }) {
        index += 1;
    }
    if index != parts.len() {
        return None;
    }

    let lower = locale.to_ascii_lowercase();
    let row = REGIONAL
        .iter()
        .find(|(tag, _, _)| tag.to_ascii_lowercase() == lower)
        .or_else(|| LANGUAGES.iter().find(|(tag, _, _)| *tag == language))?;
    Some(if ordinal {
        row.2.to_vec()
    } else {
        row.1.to_vec()
    })
}
