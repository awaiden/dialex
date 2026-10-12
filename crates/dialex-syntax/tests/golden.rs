//! Compares the dictionary and config readers with the TypeScript ones on the same sources
//! (`crates/tests/gen-syntax-golden.mjs`).

use dialex_syntax::{parse_dictionary, parse_static_config, Lazy, LeafKind, ParseError};
use serde_json::{json, Value};

fn golden() -> Value {
    serde_json::from_str(include_str!("../../tests/golden/syntax.json")).unwrap()
}

#[test]
fn dictionaries_match() {
    let golden = golden();
    let entries = golden["dictionaries"].as_array().unwrap();
    assert!(entries.len() > 30);

    for entry in entries {
        let name = entry["name"].as_str().unwrap();
        let source = entry["source"].as_str().unwrap();
        let parsed = parse_dictionary("f.content.ts", source);

        if entry.get("error").is_some() {
            assert!(
                matches!(parsed, Err(ParseError::Syntax(_))),
                "{name}: expected a syntax error"
            );
            continue;
        }
        let parsed = parsed.unwrap_or_else(|e| panic!("{name}: {e:?}"));
        if entry.get("shape").is_some() {
            assert!(parsed.is_none(), "{name}: expected no editable shape");
            continue;
        }
        let dictionary = parsed.unwrap_or_else(|| panic!("{name}: expected an editable shape"));
        let expected = &entry["dictionary"];

        assert_eq!(json!(dictionary.name), expected["name"], "{name}: name");
        assert_eq!(
            json!(dictionary.complete),
            expected["complete"],
            "{name}: complete"
        );
        assert_eq!(
            json!(dictionary.locale_names()),
            expected["locales"],
            "{name}: locales"
        );

        for locale in &dictionary.locales {
            // `listLeaves` finds the first locale of that name
            let first = dictionary.locale(&locale.name).unwrap();
            let leaves: Vec<Value> = first
                .leaves
                .iter()
                .map(|leaf| {
                    let kind = match leaf.kind {
                        LeafKind::String => "string",
                        LeafKind::Function => "function",
                        LeafKind::Other => "other",
                    };
                    match &leaf.value {
                        Some(value) => json!({ "path": leaf.path, "kind": kind, "value": value }),
                        None => json!({ "path": leaf.path, "kind": kind }),
                    }
                })
                .collect();
            assert_eq!(
                Value::Array(leaves),
                expected["leaves"][&locale.name],
                "{name}: leaves of {}",
                locale.name
            );
        }
    }
}

#[test]
fn configs_match() {
    let golden = golden();
    for entry in golden["configs"].as_array().unwrap() {
        let name = entry["name"].as_str().unwrap();
        let source = entry["source"].as_str().unwrap();
        let file = entry["file"].as_str().unwrap();

        let parsed = parse_static_config(file, source);
        if entry.get("error").is_some()
            || entry["notes"].as_array().is_some_and(|n| {
                n.iter()
                    .any(|note| note.as_str().unwrap().starts_with("Could not parse"))
            })
        {
            assert!(parsed.is_err(), "{name}: expected a syntax error");
            continue;
        }
        let (config, notes) = parsed.unwrap().resolve();
        let expected = &entry["config"];

        assert_eq!(
            json!(config.default_locale),
            expected["defaultLocale"],
            "{name}: defaultLocale"
        );
        assert_eq!(
            json!(config.locales),
            expected["locales"],
            "{name}: locales"
        );
        assert_eq!(
            json!(
                config.include.len() == 1 && !expected["include"].is_array()
                    || config.include
                        == expected["include"]
                            .as_array()
                            .map(|a| a
                                .iter()
                                .map(|v| v.as_str().unwrap().to_string())
                                .collect::<Vec<_>>())
                            .unwrap_or_default()
            ),
            json!(true),
            "{name}: include"
        );
        assert_eq!(
            json!(config.exclude),
            expected["exclude"],
            "{name}: exclude"
        );
        assert_eq!(
            json!(config.output),
            json!(expected.get("output").cloned().unwrap_or(Value::Null)),
            "{name}: output"
        );
        let fallbacks: serde_json::Map<String, Value> = config
            .fallbacks
            .iter()
            .map(|(k, v)| (k.clone(), json!(v)))
            .collect();
        assert_eq!(
            Value::Object(fallbacks),
            expected["fallbacks"],
            "{name}: fallbacks"
        );
        assert_eq!(
            json!(config.prefix_default),
            expected["prefixDefault"],
            "{name}: prefixDefault"
        );
        let lazy = match config.lazy {
            Lazy::Off => json!(false),
            Lazy::On => json!(true),
            Lazy::PerLocale => json!("locale"),
        };
        assert_eq!(lazy, expected["lazy"], "{name}: lazy");
        assert_eq!(json!(notes), entry["notes"], "{name}: notes");
    }
}
