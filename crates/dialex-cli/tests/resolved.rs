//! The native CLI reads `.dialex/config.json` and runs `@dialexjs/config` only when it is stale.
//! Needs Node and a built `packages/config`; without them the test is skipped.

use std::fs;
use std::path::{Path, PathBuf};

use dialex_cli::resolved::{load, Mode};

fn resolver() -> Option<PathBuf> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/config/dist/cli.mjs");
    let node = std::process::Command::new("node").arg("--version").output().ok()?;
    (path.is_file() && node.status.success()).then(|| path.canonicalize().unwrap())
}

fn write(root: &Path, file: &str, text: &str) {
    let path = root.join(file);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, text).unwrap();
}

#[test]
fn runs_the_resolver_only_when_the_file_is_stale() {
    let Some(resolver) = resolver() else {
        eprintln!("skipped: packages/config is not built or node is missing");
        return;
    };
    std::env::set_var("DIALEX_CONFIG_RESOLVER", &resolver);

    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();
    // A spread: the syntax tree is not enough, so the resolver has to run the file
    write(root, "base.ts", r#"export const base = { locales: ["en", "de"] };"#);
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
    let written = fs::metadata(root.join(".dialex/config.json")).unwrap().modified().unwrap();

    // Nothing changed: the file is read as it is, not written again
    std::thread::sleep(std::time::Duration::from_millis(20));
    let again = load(root, &None, Mode::Run).unwrap();
    assert_eq!(again.config, first.config);
    assert_eq!(
        fs::metadata(root.join(".dialex/config.json")).unwrap().modified().unwrap(),
        written
    );

    // A file the config imported changed: the file is stale, so it is resolved again
    write(root, "base.ts", r#"export const base = { locales: ["en", "de", "fr"] };"#);
    let changed = load(root, &None, Mode::Run).unwrap();
    assert_eq!(changed.config.locales, vec!["en", "de", "fr"]);

    // Editors never run project code: the same config is read as far as its syntax tree goes
    fs::remove_dir_all(root.join(".dialex")).unwrap();
    let editor = load(root, &None, Mode::Static).unwrap();
    assert!(editor.config.locales.is_empty());
    assert!(editor.notes.iter().any(|n| n.contains("spreads or computed keys")));
}
