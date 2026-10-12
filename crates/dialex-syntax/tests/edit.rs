//! Compares `copy_leaf` and `set_string` with what the TypeScript editor produced.
//! The result must mean the same (same locales and leaves); how much of it is byte-identical is
//! reported, since recast and this editor lay out new members slightly differently.

use dialex_syntax::{copy_leaf, parse_dictionary, set_string, LeafKind};
use serde_json::Value;

/// A comparable view of a file: locales and, per locale, leaf path, kind and string.
type Meaning = Vec<(String, Vec<(String, String)>)>;

fn meaning(source: &str) -> Option<Meaning> {
    let dictionary = parse_dictionary("f.content.ts", source).ok()??;
    Some(
        dictionary
            .locales
            .iter()
            .map(|locale| {
                let mut leaves: Vec<(String, String)> = locale
                    .leaves
                    .iter()
                    .map(|leaf| {
                        let kind = match leaf.kind {
                            LeafKind::String => {
                                format!("string:{}", leaf.value.clone().unwrap_or_default())
                            }
                            LeafKind::Function => "function".to_string(),
                            LeafKind::Other => "other".to_string(),
                        };
                        (leaf.path.join("."), kind)
                    })
                    .collect();
                leaves.sort();
                (locale.name.clone(), leaves)
            })
            .collect(),
    )
}

#[test]
fn edits_mean_what_the_typescript_edits_mean() {
    let operations: Vec<Value> =
        serde_json::from_str(include_str!("../../tests/golden/edit.json")).unwrap();
    let mut exact = 0;
    let mut total = 0;
    let mut different = Vec::new();

    for op in &operations {
        let source = op["source"].as_str().unwrap();
        let path: Vec<String> = op["path"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect();
        let expected = op["result"].as_str();

        let actual = match op["kind"].as_str().unwrap() {
            "copy" => {
                let map = |v: &str| format!("[TODO] {v}");
                copy_leaf(
                    "f.content.ts",
                    source,
                    op["from"].as_str().unwrap(),
                    op["to"].as_str().unwrap(),
                    &path,
                    Some(&map),
                )
            }
            _ => set_string(
                "f.content.ts",
                source,
                op["locale"].as_str().unwrap(),
                &path,
                op["value"].as_str().unwrap(),
            ),
        };
        total += 1;

        match (actual.as_deref(), expected) {
            (None, None) => exact += 1,
            (Some(a), Some(e)) => {
                if a == e {
                    exact += 1;
                } else if meaning(a) != meaning(e) {
                    different.push(format!(
                        "{} {op_kind} {path:?}\n--- expected\n{e}\n--- actual\n{a}",
                        op["name"].as_str().unwrap(),
                        op_kind = op["kind"].as_str().unwrap()
                    ));
                }
            }
            (a, e) => different.push(format!(
                "{} {:?}: rust {} / ts {}",
                op["name"].as_str().unwrap(),
                path,
                a.is_some(),
                e.is_some()
            )),
        }
    }
    println!("byte-identical: {exact}/{total}");
    assert!(
        different.is_empty(),
        "{} edits differ in meaning:\n{}",
        different.len(),
        different.join("\n\n")
    );
}
