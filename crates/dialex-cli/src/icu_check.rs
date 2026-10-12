//! ICU validation across the locales of one dictionary (`utils/icu-check.ts`).

use dialex_icu::{argument_signature, find_plurals, is_icu_structured, parse_message, Node};

use crate::plural::required_categories;

#[derive(Debug, Clone)]
pub struct Finding {
    pub error: bool,
    pub code: &'static str,
    pub locale: String,
    /// Dotted key including the dictionary name.
    pub key: String,
    pub message: String,
}

/// `locale -> [(dotted path, value)]`, locales in the order they were first seen.
pub type LocaleStrings = Vec<(String, Vec<(String, String)>)>;

/// `None` when a locale tag needs Node's `Intl` to be understood.
pub fn check_icu(
    dictionary: &str,
    strings: &LocaleStrings,
    default_locale: &str,
) -> Option<Vec<Finding>> {
    let mut findings = Vec::new();
    type Parsed<'a> = Vec<(&'a str, Vec<Node>)>;
    let mut parsed: Vec<(&str, Parsed)> = Vec::new();

    for (locale, entries) in strings {
        let mut ok = Vec::new();
        for (path, value) in entries {
            if !value.contains('{') {
                continue;
            }
            let key = format!("{dictionary}.{path}");
            match parse_message(value) {
                Ok(nodes) => ok.push((path.as_str(), nodes)),
                Err(error) => {
                    let structured = is_icu_structured(value);
                    findings.push(Finding {
                        error: structured,
                        code: "invalid-icu",
                        locale: locale.clone(),
                        key: key.clone(),
                        message: if structured {
                            format!("Invalid ICU message \"{key}\" ({locale}): {error}")
                        } else {
                            format!("\"{key}\" ({locale}) contains braces but is not valid ICU, so t() values cannot be applied: {error}")
                        },
                    });
                }
            }
        }
        parsed.push((locale.as_str(), ok));
    }

    // default locale first, then the others in order
    let mut order: Vec<&str> = vec![default_locale];
    order.extend(
        parsed
            .iter()
            .map(|(l, _)| *l)
            .filter(|l| *l != default_locale),
    );

    let mut paths: Vec<&str> = Vec::new();
    for (_, entries) in &parsed {
        for (path, _) in entries {
            if !paths.contains(path) {
                paths.push(path);
            }
        }
    }

    let nodes_of = |locale: &str, path: &str| -> Option<&Vec<Node>> {
        parsed
            .iter()
            .find(|(l, _)| *l == locale)
            .and_then(|(_, entries)| entries.iter().find(|(p, _)| *p == path))
            .map(|(_, nodes)| nodes)
    };

    for path in paths {
        let key = format!("{dictionary}.{path}");
        let Some(reference) = order.iter().find(|l| nodes_of(l, path).is_some()) else {
            continue;
        };
        let expected = argument_signature(nodes_of(reference, path).unwrap());

        for locale in &order {
            let Some(nodes) = nodes_of(locale, path) else {
                continue;
            };
            if locale != reference {
                let found = argument_signature(nodes);
                if found != expected {
                    let show = |s: &str| {
                        if s.is_empty() {
                            "none".to_string()
                        } else {
                            s.to_string()
                        }
                    };
                    findings.push(Finding {
                        error: true,
                        code: "icu-args-mismatch",
                        locale: (*locale).to_string(),
                        key: key.clone(),
                        message: format!(
                            "Locale \"{locale}\" uses different arguments than \"{reference}\" for \"{key}\" (expected {}, found {})",
                            show(&expected),
                            show(&found)
                        ),
                    });
                }
            }

            for plural in find_plurals(nodes) {
                let Node::Plural {
                    name,
                    ordinal,
                    options,
                    ..
                } = plural
                else {
                    continue;
                };
                let required = required_categories(locale, *ordinal)?;
                let missing: Vec<&&str> = required
                    .iter()
                    .filter(|category| !options.contains(category))
                    .collect();
                if !missing.is_empty() {
                    let list = missing
                        .iter()
                        .map(|c| format!("\"{c}\""))
                        .collect::<Vec<_>>()
                        .join(", ");
                    findings.push(Finding {
                        error: false,
                        code: "icu-plural-categories",
                        locale: (*locale).to_string(),
                        key: key.clone(),
                        message: format!(
                            "Locale \"{locale}\" plural \"{name}\" in \"{key}\" has no {list} option (used by this language; \"other\" will be shown instead)"
                        ),
                    });
                }
            }
        }
    }
    Some(findings)
}
