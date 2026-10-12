//! A long-running process (the language server) analyzes the same project again and again; what it
//! reuses must never be stale. These edits keep the file's size and happen within the timestamp
//! resolution, which is exactly what a size-and-mtime cache gets wrong.

use std::fs;
use std::path::Path;

use dialex_cli::analysis::{analyze_project, AnalysisConfig, AnalysisOptions};

fn write(root: &Path, file: &str, text: &str) {
    let path = root.join(file);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, text).unwrap();
}

fn codes(root: &Path) -> Vec<(String, String)> {
    let config = AnalysisConfig {
        default_locale: "en".into(),
        locales: vec!["en".into(), "tr".into()],
        include: vec!["src/**/*.content.ts".into()],
        exclude: vec![],
    };
    let options = AnalysisOptions {
        runtime: false,
        unused: true,
        ..AnalysisOptions::default()
    };
    let analysis = analyze_project(root, &config, &options).unwrap();
    analysis
        .issues
        .iter()
        .map(|i| (i.code.to_string(), i.message.clone()))
        .collect()
}

#[test]
fn edits_of_the_same_size_are_seen() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    write(
        root,
        "src/a.content.ts",
        r#"export default defineDictionary("a", { en: { x: "1" }, tr: { x: "2" } });"#,
    );
    write(root, "src/page.ts", r#"t("a.x"); t("a.y");"#);

    let before = codes(root);
    assert!(
        before
            .iter()
            .any(|(c, m)| c == "unknown-path" && m.contains("a.y")),
        "{before:?}"
    );

    // same length, written again straight away: the key `y` now exists, `x` does not
    write(
        root,
        "src/a.content.ts",
        r#"export default defineDictionary("a", { en: { y: "1" }, tr: { y: "2" } });"#,
    );
    // and the source file changes too, with one character swapped
    write(root, "src/page.ts", r#"t("a.y"); t("a.z");"#);

    let after = codes(root);
    assert!(!after.iter().any(|(_, m)| m.contains("a.y")), "{after:?}");
    assert!(
        after
            .iter()
            .any(|(c, m)| c == "unknown-path" && m.contains("a.z")),
        "{after:?}"
    );
    assert_ne!(before, after);
}

#[test]
fn unchanged_projects_give_the_same_issues() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    write(
        root,
        "src/a.content.ts",
        r#"export default defineDictionary("a", { en: { x: "1", only: "e" }, tr: { x: "2" } });"#,
    );
    assert_eq!(codes(root), codes(root));
}
