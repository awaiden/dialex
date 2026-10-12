//! Compares the parser and introspection with what the TypeScript implementation returned for the
//! same messages (`crates/tests/gen-icu-golden.mjs`).

use dialex_icu::{
    argument_signature, find_plurals, get_arguments, is_icu_structured, js_key_order, message_type,
    parse_message, Node, Options,
};
use serde_json::{json, Map, Value};

fn options_json(options: &Options) -> Value {
    let keys = js_key_order(&options.keys());
    let mut map = Map::new();
    for key in keys {
        map.insert(key.clone(), nodes_json(options.get(&key).unwrap()));
    }
    Value::Object(map)
}

fn nodes_json(nodes: &[Node]) -> Value {
    Value::Array(
        nodes
            .iter()
            .map(|node| match node {
                Node::Literal(value) => json!({ "type": "literal", "value": value }),
                Node::Argument { name } => json!({ "type": "argument", "name": name }),
                Node::Number { name, style } => styled("number", name, style),
                Node::Date { name, style } => styled("date", name, style),
                Node::Time { name, style } => styled("time", name, style),
                Node::Plural {
                    name,
                    ordinal,
                    offset,
                    options,
                } => json!({
                    "type": "plural",
                    "name": name,
                    "ordinal": ordinal,
                    "offset": offset,
                    "options": options_json(options),
                }),
                Node::Select { name, options } => {
                    json!({ "type": "select", "name": name, "options": options_json(options) })
                }
                Node::Pound => json!({ "type": "pound" }),
            })
            .collect(),
    )
}

fn styled(kind: &str, name: &str, style: &Option<String>) -> Value {
    match style {
        Some(style) => json!({ "type": kind, "name": name, "style": style }),
        None => json!({ "type": kind, "name": name }),
    }
}

#[test]
fn matches_the_typescript_implementation() {
    let text = include_str!("../../tests/golden/icu.json");
    let entries: Vec<Value> = serde_json::from_str(text).unwrap();
    assert!(entries.len() > 100);

    for entry in entries {
        let message = entry["message"].as_str().unwrap();
        assert_eq!(
            is_icu_structured(message),
            entry["structured"].as_bool().unwrap(),
            "{message:?}: structured"
        );
        match parse_message(message) {
            Ok(nodes) => {
                assert!(
                    entry.get("error").is_none(),
                    "{message:?}: Rust parsed what TS rejected: {}",
                    entry["error"]
                );
                assert_eq!(nodes_json(&nodes), entry["nodes"], "{message:?}: nodes");

                let args: Vec<Value> = get_arguments(&nodes)
                    .into_iter()
                    .map(|a| match a.selectors {
                        Some(selectors) => {
                            json!({ "name": a.name, "type": a.kind.as_str(), "selectors": selectors })
                        }
                        None => json!({ "name": a.name, "type": a.kind.as_str() }),
                    })
                    .collect();
                assert_eq!(Value::Array(args), entry["args"], "{message:?}: arguments");

                assert_eq!(
                    argument_signature(&nodes),
                    entry["signature"].as_str().unwrap(),
                    "{message:?}: signature"
                );
                let plurals: Vec<Value> = find_plurals(&nodes)
                    .into_iter()
                    .map(|node| match node {
                        Node::Plural { name, ordinal, options, .. } => {
                            json!({ "name": name, "ordinal": ordinal, "options": js_key_order(&options.keys()) })
                        }
                        _ => unreachable!(),
                    })
                    .collect();
                assert_eq!(
                    Value::Array(plurals),
                    entry["plurals"],
                    "{message:?}: plurals"
                );

                let expected_type = entry["type"].as_str();
                assert_eq!(
                    message_type(message).as_deref(),
                    expected_type,
                    "{message:?}: type"
                );
            }
            Err(error) => {
                let expected = &entry["error"];
                assert!(
                    !expected.is_null(),
                    "{message:?}: Rust rejected what TS parsed: {error}"
                );
                assert_eq!(
                    error.to_string(),
                    expected["message"].as_str().unwrap(),
                    "{message:?}"
                );
                assert_eq!(
                    error.position as u64,
                    expected["position"].as_u64().unwrap(),
                    "{message:?}"
                );
            }
        }
    }
}
