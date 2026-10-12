//! Text edits for dictionary files, as `copyLeaf` and `setString` in `dictionary-edit.ts` do them:
//! a new property is written into the right object literal and the rest of the file is untouched.

use crate::dictionary::{parse_dictionary, Dictionary, LeafKind, Member, Object, Property, Value};

fn is_identifier(name: &str) -> bool {
    let mut chars = name.chars();
    let start = |c: char| c.is_ascii_alphabetic() || c == '_' || c == '$';
    matches!(chars.next(), Some(c) if start(c))
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '$')
}

/// A key as it is written in an object literal: bare when it is an identifier.
fn key_code(key: &str) -> String {
    if is_identifier(key) {
        key.to_string()
    } else {
        serde_json::to_string(key).unwrap()
    }
}

fn find_property<'a>(object: &'a Object, name: &str) -> Option<&'a Property> {
    object.members.iter().find_map(|member| match member {
        Member::Property(property) if property.name.as_deref() == Some(name) => Some(property),
        _ => None,
    })
}

/// The leading whitespace of the line containing `offset`.
fn indentation(source: &str, offset: usize) -> String {
    let line_start = source[..offset].rfind('\n').map(|i| i + 1).unwrap_or(0);
    source[line_start..]
        .chars()
        .take_while(|c| *c == ' ' || *c == '\t')
        .collect()
}

/// An object literal laid out over lines for the path segments that do not exist yet; the last
/// object holds `member` (`key: value` or a whole method).
fn nested_code(rest: &[String], member: &str, indent: &str) -> String {
    let inner = format!("{indent}  ");
    match rest.split_first() {
        None => format!("{{\n{inner}{member},\n{indent}}}"),
        Some((head, tail)) => {
            format!(
                "{{\n{inner}{}: {},\n{indent}}}",
                key_code(head),
                nested_code(tail, member, &inner)
            )
        }
    }
}

/// Writes `member` (`key: value` or a method) as the last member of `object`.
fn insert_member(source: &str, object: &Object, member: &str) -> String {
    let (open, close) = (object.span.0 as usize, object.span.1 as usize);
    let multiline = source[open..close].contains('\n');

    let Some(last) = object.members.last() else {
        // `{}` or `{ }`
        let indent = indentation(source, open);
        return format!(
            "{}{{\n{indent}  {member},\n{indent}}}{}",
            &source[..open],
            &source[close..]
        );
    };

    let last_span = match last {
        Member::Spread { span } => *span,
        Member::Property(property) => property.span,
    };
    let last_end = last_span.1 as usize;
    // a comma after the last member means the object uses trailing commas
    let after = &source[last_end..close - 1];
    let trimmed = after.trim_start();
    let has_comma = trimmed.starts_with(',');
    let comma_end = last_end + (after.len() - trimmed.len()) + usize::from(has_comma);

    if !multiline {
        // `{ a: "x" }` -> `{ a: "x", key: value }`
        return format!("{}, {member}{}", &source[..last_end], &source[last_end..]);
    }
    let member_indent = indentation(source, last_span.0 as usize);
    if has_comma {
        format!(
            "{}\n{member_indent}{member},{}",
            &source[..comma_end],
            &source[comma_end..]
        )
    } else {
        format!(
            "{},\n{member_indent}{member}{}",
            &source[..last_end],
            &source[last_end..]
        )
    }
}

/// Writes `member` as the last member of the object at `locale` + `parents`, creating the locale
/// and the objects in between. `None` when the path runs through a non-object.
fn add_member_at(
    source: &str,
    dictionary: &Dictionary,
    locale: &str,
    parents: &[String],
    member: &str,
) -> Option<String> {
    let mut segments: Vec<&str> = vec![locale];
    segments.extend(parents.iter().map(String::as_str));

    let mut object = &dictionary.root;
    for (depth, segment) in segments.iter().enumerate() {
        match find_property(object, segment) {
            Some(property) => match &property.value {
                Value::Object(inner) => object = inner,
                Value::Leaf { .. } => return None,
            },
            None => {
                // the object does not exist: create it with everything below it
                let rest: Vec<String> = segments[depth + 1..]
                    .iter()
                    .map(|s| s.to_string())
                    .collect();
                let indent = indentation(source, object.span.0 as usize);
                let nested = nested_code(&rest, member, &format!("{indent}  "));
                let code = format!("{}: {nested}", key_code(segment));
                return Some(insert_member(source, object, &code));
            }
        }
    }
    Some(insert_member(source, object, member))
}

/// Adds `key: value_code` for the last segment of `path` under `locale`. `None` when the key
/// already exists or the path runs through a non-object.
fn add_value(
    source: &str,
    dictionary: &Dictionary,
    locale: &str,
    path: &[String],
    value_code: &str,
) -> Option<String> {
    let (last, parents) = path.split_last()?;
    if property_at(dictionary, locale, path).is_some() {
        return None;
    }
    add_member_at(
        source,
        dictionary,
        locale,
        parents,
        &format!("{}: {value_code}", key_code(last)),
    )
}

/// The property at `locale` + `path`, following objects.
pub fn property_at<'a>(
    dictionary: &'a Dictionary,
    locale: &str,
    path: &[String],
) -> Option<&'a Property> {
    let mut object = &dictionary.root;
    let mut found: Option<&Property> = None;
    let segments = std::iter::once(locale).chain(path.iter().map(String::as_str));
    for segment in segments {
        // a leaf has no members to descend into
        if found.is_some_and(|p| matches!(p.value, Value::Leaf { .. })) {
            return None;
        }
        let property = find_property(object, segment)?;
        found = Some(property);
        if let Value::Object(inner) = &property.value {
            object = inner;
        }
    }
    found
}

/// `copyLeaf`: copies the leaf at `path` from `from` to `to`, rewriting strings with `map_string`
/// and copying everything else as written. `None` when there is nothing to copy, the target
/// already has the key, or the file has no editable shape.
pub fn copy_leaf(
    file: &str,
    source: &str,
    from: &str,
    to: &str,
    path: &[String],
    map_string: Option<&dyn Fn(&str) -> String>,
) -> Option<String> {
    let dictionary = parse_dictionary(file, source).ok()??;
    let origin = property_at(&dictionary, from, path)?;
    if property_at(&dictionary, to, path).is_some() {
        return None;
    }
    let Value::Leaf { span, kind, string } = &origin.value else {
        return None;
    };
    let written = &source[span.0 as usize..span.1 as usize];

    if let (LeafKind::String, Some(text), Some(map)) = (kind, string, map_string) {
        let code = serde_json::to_string(&map(text)).unwrap();
        return add_value(source, &dictionary, to, path, &code);
    }

    // A method (`greet(n) { ... }`) is copied whole, since it has no separate value
    let property_text = &source[origin.span.0 as usize..origin.span.1 as usize];
    let key = path.last()?;
    if *kind == LeafKind::Function && property_text.trim_start().starts_with(&format!("{key}(")) {
        return add_member(source, &dictionary, to, path, property_text);
    }
    add_value(source, &dictionary, to, path, written)
}

/// Adds a member that is written whole, such as a method.
fn add_member(
    source: &str,
    dictionary: &Dictionary,
    locale: &str,
    path: &[String],
    member: &str,
) -> Option<String> {
    let (_, parents) = path.split_last()?;
    add_member_at(source, dictionary, locale, parents, member)
}

/// `setString`: sets a string at `path`, creating it when missing. A function or another
/// non-string value is skipped (`None`).
pub fn set_string(
    file: &str,
    source: &str,
    locale: &str,
    path: &[String],
    value: &str,
) -> Option<String> {
    let dictionary = parse_dictionary(file, source).ok()??;
    let code = serde_json::to_string(value).unwrap();

    match property_at(&dictionary, locale, path) {
        Some(property) => match &property.value {
            Value::Leaf {
                span,
                kind: LeafKind::String,
                ..
            } => Some(format!(
                "{}{code}{}",
                &source[..span.0 as usize],
                &source[span.1 as usize..]
            )),
            _ => None,
        },
        None => add_value(source, &dictionary, locale, path, &code),
    }
}
