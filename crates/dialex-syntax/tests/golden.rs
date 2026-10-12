//! Compares the dictionary and config readers with the TypeScript ones on the same sources
//! (`crates/tests/gen-syntax-golden.mjs`).

use dialex_syntax::{parse_dictionary, LeafKind, ParseError};
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
