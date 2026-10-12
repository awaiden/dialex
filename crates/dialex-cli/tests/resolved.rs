//! The native CLI reads `.dialex/config.json`, which `@dialexjs/config` writes before every
//! command. Needs Node and a built `packages/config`; without them the test is skipped.

use std::fs;
use std::path::{Path, PathBuf};

use dialex_cli::resolved::{invalidate, load, Mode};

fn resolver() -> Option<PathBuf> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/config/dist/cli.mjs");
    let node = std::process::Command::new("node")
        .arg("--version")
        .output()
        .ok()?;
    (path.is_file() && node.status.success()).then(|| path.canonicalize().unwrap())
}

fn write(root: &Path, file: &str, text: &str) {
    let path = root.join(file);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, text).unwrap();
}

#[test]
fn the_config_is_written_again_for_every_load() {
    let Some(resolver) = resolver() else {
        eprintln!("skipped: packages/config is not built or node is missing");
        return;
    };
    std::env::set_var("DIALEX_CONFIG_RESOLVER", &resolver);
    std::env::remove_var("DIALEX_CONFIG_WRITTEN");

    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    // A spread: the syntax tree is not enough, so the file has to be run
    write(
        root,
        "base.ts",
        r#"export const base = { locales: ["en", "de"] };"#,
    );
    write(
        root,
        "dialex.config.ts",
        r#"import { base } from "./base";
export default { ...base, defaultLocale: "de", lint: { rules: { "unused-key": "off" } } };"#,
    );

    let first = load(root, &None, Mode::Run).unwrap();
    assert_eq!(first.config.locales, vec!["en", "de"]);
    assert_eq!(first.config.default_locale, "de");
    assert_eq!(first.config.lint.len(), 1);
    assert!(root.join(".dialex/config.json").is_file());

    // An imported file changed: nothing decides whether that matters, it is written again
    write(
        root,
        "base.ts",
        r#"export const base = { locales: ["en", "de", "fr"] };"#,
    );
    let changed = load(root, &None, Mode::Run).unwrap();
    assert_eq!(changed.config.locales, vec!["en", "de", "fr"]);

    // When the launcher already wrote the file, the binary reads it and starts nothing
    write(
        root,
        ".dialex/config.json",
        &fs::read_to_string(root.join(".dialex/config.json"))
            .unwrap()
            .replace("\"fr\"", "\"es\""),
    );
    std::env::set_var("DIALEX_CONFIG_WRITTEN", "1");
    let launcher = load(root, &None, Mode::Run).unwrap();
    assert_eq!(launcher.config.locales, vec!["en", "de", "es"]);
    std::env::remove_var("DIALEX_CONFIG_WRITTEN");

    // Editors never run project code: the same config is read as far as its syntax tree goes
    let editor = load(root, &None, Mode::Static).unwrap();
    assert!(editor.config.locales.is_empty());
    assert!(editor
        .notes
        .iter()
        .any(|n| n.contains("spreads or computed keys")));

    // A long-running server keeps what it loaded until it is told a config file changed
    write(
        root,
        "dialex.config.ts",
        r#"export default { locales: ["en"] };"#,
    );
    let cached = load(root, &None, Mode::Static).unwrap();
    assert!(cached.config.locales.is_empty());
    invalidate();
    let after = load(root, &None, Mode::Static).unwrap();
    assert_eq!(after.config.locales, vec!["en"]);

    // An editor must never run a resolver it finds inside the workspace: plant one and load
    std::env::remove_var("DIALEX_CONFIG_RESOLVER");
    let planted = tempfile::tempdir().unwrap();
    let marker = planted.path().join("ran");
    write(
        planted.path(),
        "node_modules/@dialexjs/config/dist/cli.mjs",
        &format!(
            "import fs from 'node:fs'; fs.writeFileSync({:?}, 'x');",
            marker.to_string_lossy()
        ),
    );
    write(
        planted.path(),
        "dialex.config.ts",
        r#"export default { locales: ["en"] };"#,
    );
    let _ = load(planted.path(), &None, Mode::Static);
    assert!(
        !marker.exists(),
        "the language server ran a script from the workspace"
    );
}
