//! The resolved config: `.dialex/config.json`, written by `@dialexjs/config`.
//!
//! The native CLI and language server do not parse or run `dialex.config.*`. They read this file,
//! which the Node package produced once. It records what it was made from (the config file, what
//! that imported, the environment variables it read, and which config names did not exist), so it
//! is checked again on every run with a hash per file. When it is stale or missing, the package is
//! run to write it again; that is the only time Node is involved.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use dialex_syntax::{Lazy, LintLevel, StaticConfig};
use serde_json::Value;

use crate::generate::Fallback;
use crate::paths::{relative, resolve};

const ARTIFACT: &str = ".dialex/config.json";
const VERSION: u64 = 1;

/// What the caller needs from the config.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// The CLI: the config file may be run, so spreads and computed values are resolved.
    Run,
    /// Editors: project code is never executed. Whatever the syntax tree holds is used.
    Static,
}

/// The config of a project, as the resolved file describes it.
pub struct Resolved {
    pub config: StaticConfig,
    pub notes: Vec<String>,
    /// The config file the values came from, absolute.
    pub file: Option<PathBuf>,
}

/// FNV-1a, 64-bit, in 16 hex digits. The same function as `hashBytes` of `@dialexjs/config`.
fn fnv1a(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{hash:016x}")
}

/// The file still describes the project: every input hashes the same, no missing config file
/// appeared, and the environment variables it read have the same values.
fn is_fresh(root: &Path, value: &Value) -> bool {
    let inputs = &value["inputs"];
    let Some(files) = inputs["files"].as_array() else {
        return false;
    };
    for input in files {
        let (Some(path), Some(hash)) = (input["path"].as_str(), input["hash"].as_str()) else {
            return false;
        };
        match fs::read(root.join(path)) {
            Ok(bytes) if fnv1a(&bytes) == hash => {}
            _ => return false,
        }
    }
    if let Some(missing) = inputs["missing"].as_array() {
        for path in missing.iter().filter_map(Value::as_str) {
            if root.join(path).exists() {
                return false;
            }
        }
    }
    if let Some(env) = inputs["env"].as_object() {
        for (name, expected) in env {
            let actual = std::env::var(name).ok();
            if actual.as_deref() != expected.as_str() {
                return false;
            }
        }
    }
    true
}

/// Whether a (fresh) file can serve a caller that asked for `mode`.
fn satisfies(value: &Value, mode: Mode) -> bool {
    let made_by = value["mode"].as_str().unwrap_or("");
    let complete = value["complete"].as_bool().unwrap_or(false);
    match mode {
        // A file made by running the config is as good as it gets; a static one only if complete
        Mode::Run => made_by == "run" || complete,
        // Editors take whatever was made: a run file came from a user action they trust
        Mode::Static => made_by == "run" || made_by == "static",
    }
}

fn read_artifact(root: &Path) -> Option<Value> {
    let text = fs::read_to_string(root.join(ARTIFACT)).ok()?;
    let value: Value = serde_json::from_str(&text).ok()?;
    (value["version"].as_u64() == Some(VERSION)).then_some(value)
}

/// `node_modules/@dialexjs/config/dist/cli.mjs`: `DIALEX_CONFIG_RESOLVER` when set (the launcher
/// sets it), otherwise the nearest one above the project.
fn resolver_path(root: &Path) -> Option<PathBuf> {
    if let Ok(path) = std::env::var("DIALEX_CONFIG_RESOLVER") {
        let path = PathBuf::from(path);
        return path.is_file().then_some(path);
    }
    root.ancestors()
        .map(|dir| dir.join("node_modules/@dialexjs/config/dist/cli.mjs"))
        .find(|path| path.is_file())
}

/// Runs `@dialexjs/config` to write the file again.
fn run_resolver(root: &Path, mode: Mode, config: &Option<String>) -> Result<(), Fallback> {
    let resolver = resolver_path(root).ok_or_else(|| {
        Fallback("the resolved config is stale and @dialexjs/config is not installed".into())
    })?;
    let node = std::env::var("DIALEX_NODE").unwrap_or_else(|_| "node".into());
    let mut command = Command::new(node);
    command.arg(resolver).arg(root);
    if mode == Mode::Static {
        command.arg("--static");
    }
    if let Some(file) = config {
        command.arg("--config").arg(file);
    }
    let output = command
        .output()
        .map_err(|e| Fallback(format!("cannot start node to resolve the config: {e}")))?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(Fallback(format!(
            "resolving the config failed: {}",
            stderr.trim()
        )))
    }
}

fn strings(value: &Value) -> Option<Vec<String>> {
    value
        .as_array()?
        .iter()
        .map(|item| item.as_str().map(str::to_string))
        .collect()
}

fn lint_level(setting: &Value) -> Option<LintLevel> {
    match setting {
        Value::String(text) => LintLevel::parse(text),
        Value::Array(items) => LintLevel::parse(items.first()?.as_str()?),
        _ => None,
    }
}

/// The settings of the file's `config` object, which the package has already validated.
fn to_config(value: &Value) -> Result<StaticConfig, String> {
    let mut config = StaticConfig::default();
    let bad = |key: &str| format!("the resolved config has an invalid \"{key}\"");

    if let Some(v) = value.get("defaultLocale") {
        config.default_locale = v.as_str().ok_or_else(|| bad("defaultLocale"))?.to_string();
    }
    if let Some(v) = value.get("locales") {
        config.locales = strings(v).ok_or_else(|| bad("locales"))?;
    }
    if let Some(v) = value.get("include") {
        config.include = match v {
            Value::String(text) => vec![text.clone()],
            other => strings(other).ok_or_else(|| bad("include"))?,
        };
    }
    if let Some(v) = value.get("exclude") {
        config.exclude = strings(v).ok_or_else(|| bad("exclude"))?;
    }
    if let Some(v) = value.get("output") {
        config.output = Some(v.as_str().ok_or_else(|| bad("output"))?.to_string());
    }
    if let Some(v) = value.get("fallbacks") {
        let object = v.as_object().ok_or_else(|| bad("fallbacks"))?;
        config.fallbacks = object
            .iter()
            .map(|(locale, chain)| strings(chain).map(|chain| (locale.clone(), chain)))
            .collect::<Option<_>>()
            .ok_or_else(|| bad("fallbacks"))?;
    }
    if let Some(v) = value.get("prefixDefault") {
        config.prefix_default = v.as_bool().ok_or_else(|| bad("prefixDefault"))?;
    }
    if let Some(v) = value.get("lazy") {
        config.lazy = match v {
            Value::Bool(true) => Lazy::On,
            Value::Bool(false) => Lazy::Off,
            Value::String(text) if text == "locale" => Lazy::PerLocale,
            _ => return Err(bad("lazy")),
        };
    }
    if let Some(rules) = value.get("lint").and_then(|lint| lint.get("rules")) {
        let object = rules.as_object().ok_or_else(|| bad("lint"))?;
        config.lint = object
            .iter()
            .map(|(code, setting)| lint_level(setting).map(|level| (code.clone(), level)))
            .collect::<Option<_>>()
            .ok_or_else(|| bad("lint"))?;
    }
    Ok(config)
}

/// The config of `root`: from `.dialex/config.json` while it is fresh, otherwise after running
/// `@dialexjs/config` to write it again. `config` is a `--config` path relative to the root.
pub fn load(root: &Path, config: &Option<String>, mode: Mode) -> Result<Resolved, Fallback> {
    let wanted_file = config
        .as_ref()
        .map(|file| relative(root, &resolve(root, file)));

    let usable = |value: &Value| {
        is_fresh(root, value)
            && satisfies(value, mode)
            && wanted_file
                .as_deref()
                .is_none_or(|file| value["file"].as_str() == Some(file))
    };

    let value = match read_artifact(root).filter(|v| usable(v)) {
        Some(value) => value,
        None => {
            run_resolver(root, mode, config)?;
            read_artifact(root)
                .filter(|v| is_fresh(root, v))
                .ok_or_else(|| Fallback("the resolved config could not be read".into()))?
        }
    };

    let mut notes: Vec<String> = value["notes"]
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|n| n.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    // A static read of a config with spreads or computed keys only sees its literal settings
    if value["mode"].as_str() == Some("static") && value["complete"].as_bool() == Some(false) {
        let note = "The config has spreads or computed keys; only literal settings are used.";
        if !notes.iter().any(|n| n == note) {
            notes.push(note.into());
        }
    }

    let config = to_config(&value["config"]).map_err(Fallback)?;
    let file = value["file"].as_str().map(|path| root.join(path));
    Ok(Resolved {
        config,
        notes,
        file,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn fnv1a_matches_the_node_package() {
        assert_eq!(fnv1a(b""), "cbf29ce484222325");
        assert_eq!(fnv1a(b"a"), "af63dc4c8601ec8c");
        assert_eq!(fnv1a(b"foobar"), "85944171f73967e8");
    }

    #[test]
    fn reads_every_setting() {
        let config = to_config(&json!({
            "defaultLocale": "tr",
            "locales": ["tr", "en"],
            "include": ["src/**/*.content.ts"],
            "exclude": ["legacy/**"],
            "output": "app",
            "fallbacks": { "pt-BR": ["pt", "es"] },
            "prefixDefault": false,
            "lazy": "locale",
            "lint": { "rules": { "unused-key": "off", "missing-key": ["warn", { "x": 1 }] } }
        }))
        .unwrap();
        assert_eq!(config.default_locale, "tr");
        assert_eq!(config.include, vec!["src/**/*.content.ts"]);
        assert_eq!(config.output.as_deref(), Some("app"));
        assert_eq!(
            config.fallbacks,
            vec![("pt-BR".into(), vec!["pt".into(), "es".into()])]
        );
        assert!(!config.prefix_default);
        assert_eq!(config.lazy, Lazy::PerLocale);
        assert_eq!(
            config.lint,
            vec![
                ("unused-key".to_string(), LintLevel::Off),
                ("missing-key".to_string(), LintLevel::Warn),
            ]
        );
    }

    #[test]
    fn a_string_include_is_a_single_glob_and_defaults_stay() {
        let config = to_config(&json!({ "include": "**/*.content.ts" })).unwrap();
        assert_eq!(config.include, vec!["**/*.content.ts"]);
        assert_eq!(config.default_locale, "en");
        assert!(config.prefix_default);
    }

    #[test]
    fn rejects_values_of_the_wrong_type() {
        assert!(to_config(&json!({ "locales": "en" })).is_err());
        assert!(to_config(&json!({ "lazy": "sometimes" })).is_err());
        assert!(to_config(&json!({ "lint": { "rules": { "a": "loud" } } })).is_err());
    }

    #[test]
    fn freshness_follows_the_inputs() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        fs::write(root.join("dialex.config.ts"), "export default {};").unwrap();
        let hash = fnv1a(b"export default {};");
        let value = json!({
            "inputs": {
                "files": [{ "path": "dialex.config.ts", "hash": hash }],
                "missing": ["i18n.config.ts"],
                "env": {}
            }
        });
        assert!(is_fresh(root, &value));

        fs::write(root.join("i18n.config.ts"), "x").unwrap();
        assert!(!is_fresh(root, &value), "a missing config file appeared");
        fs::remove_file(root.join("i18n.config.ts")).unwrap();

        fs::write(root.join("dialex.config.ts"), "export default { a: 1 };").unwrap();
        assert!(!is_fresh(root, &value), "an input changed");
    }

    #[test]
    fn static_files_serve_a_run_request_only_when_complete() {
        let incomplete = json!({ "mode": "static", "complete": false });
        let complete = json!({ "mode": "static", "complete": true });
        let ran = json!({ "mode": "run", "complete": true });
        assert!(!satisfies(&incomplete, Mode::Run));
        assert!(satisfies(&complete, Mode::Run));
        assert!(satisfies(&ran, Mode::Run));
        assert!(satisfies(&incomplete, Mode::Static));
        assert!(satisfies(&ran, Mode::Static));
    }
}
