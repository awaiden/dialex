//! The resolved config: `.dialex/config.json`, written by `@dialexjs/config`.
//!
//! The native CLI and language server do not parse or run `dialex.config.*`. They read this file,
//! which the Node package writes. It is written again before every command, so there is no
//! question of it being stale and nothing here checks. The launcher writes it before it starts the
//! binary (`DIALEX_CONFIG_WRITTEN`); a binary started without the launcher runs the package itself.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};

use dialex_syntax::{Lazy, LintLevel, StaticConfig};
use serde_json::Value;

use crate::generate::Fallback;

const ARTIFACT: &str = ".dialex/config.json";
const VERSION: u64 = 1;
const RESOLVER: &str = "node_modules/@dialexjs/config/dist/cli.mjs";

/// What the caller needs from the config.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// The CLI: the config file may be run, so spreads and computed values are resolved.
    Run,
    /// Editors: project code is never executed. Whatever the syntax tree holds is used.
    Static,
}

/// The config of a project, as the resolved file describes it.
#[derive(Debug, Clone)]
pub struct Resolved {
    pub config: StaticConfig,
    pub notes: Vec<String>,
    /// The config file the values came from, absolute.
    pub file: Option<PathBuf>,
}

type Key = (PathBuf, Option<String>);

/// What a long-running process (the language server) has loaded. A one-shot CLI never reuses it.
fn cache() -> &'static Mutex<HashMap<Key, Resolved>> {
    static CACHE: OnceLock<Mutex<HashMap<Key, Resolved>>> = OnceLock::new();
    CACHE.get_or_init(Default::default)
}

/// Forgets every loaded config, so the next [`load`] resolves it again. The language server calls
/// this when a config file changes.
pub fn invalidate() {
    cache().lock().unwrap().clear();
}

fn read_artifact(root: &Path) -> Option<Value> {
    let text = fs::read_to_string(root.join(ARTIFACT)).ok()?;
    let value: Value = serde_json::from_str(&text).ok()?;
    (value["version"].as_u64() == Some(VERSION)).then_some(value)
}

/// The `@dialexjs/config` script to run. `DIALEX_CONFIG_RESOLVER` when set, then the copy next to
/// this binary. Only the CLI also looks in the project: it runs the config file anyway, whereas an
/// editor must never run something it found inside the workspace.
fn resolver_path(root: &Path, mode: Mode) -> Option<PathBuf> {
    if let Ok(path) = std::env::var("DIALEX_CONFIG_RESOLVER") {
        let path = PathBuf::from(path);
        return path.is_file().then_some(path);
    }
    if let Ok(exe) = std::env::current_exe() {
        let beside = exe
            .ancestors()
            .map(|dir| dir.join(RESOLVER))
            .find(|path| path.is_file());
        if beside.is_some() {
            return beside;
        }
    }
    if mode == Mode::Run {
        return root
            .ancestors()
            .map(|dir| dir.join(RESOLVER))
            .find(|path| path.is_file());
    }
    None
}

/// Runs `@dialexjs/config`, which writes the file.
fn run_resolver(root: &Path, mode: Mode, config: &Option<String>) -> Result<(), Fallback> {
    let resolver = resolver_path(root, mode)
        .ok_or_else(|| Fallback("@dialexjs/config was not found to resolve the config".into()))?;
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

fn from_artifact(root: &Path, value: &Value, mode: Mode) -> Result<Resolved, Fallback> {
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
    // The CLI only trusts a config it could read in full; otherwise Node reports what is wrong
    if mode == Mode::Run && value["complete"].as_bool() != Some(true) && notes.is_empty() {
        return Err(Fallback("the resolved config is incomplete".into()));
    }

    let config = to_config(&value["config"]).map_err(Fallback)?;
    let file = value["file"].as_str().map(|path| root.join(path));
    Ok(Resolved {
        config,
        notes,
        file,
    })
}

/// The config of `root`. It is written first (by the launcher, which says so with
/// `DIALEX_CONFIG_WRITTEN`, or by running `@dialexjs/config` here) and then read: it is never
/// taken from an earlier run. `config` is a `--config` path relative to the root.
///
/// An editor, which cannot run what it finds in the workspace, falls back to the file of an
/// earlier run, or to the defaults with a note, when the package is not available.
pub fn load(root: &Path, config: &Option<String>, mode: Mode) -> Result<Resolved, Fallback> {
    let key: Key = (root.to_path_buf(), config.clone());
    if mode == Mode::Static {
        if let Some(found) = cache().lock().unwrap().get(&key) {
            return Ok(found.clone());
        }
    }

    let written = mode == Mode::Run && std::env::var("DIALEX_CONFIG_WRITTEN").as_deref() == Ok("1");
    let outcome = if written {
        Ok(())
    } else {
        run_resolver(root, mode, config)
    };

    let resolved = match (outcome, mode) {
        (Ok(()), _) => {
            let value = read_artifact(root)
                .ok_or_else(|| Fallback("the resolved config could not be read".into()))?;
            from_artifact(root, &value, mode)?
        }
        (Err(error), Mode::Run) => return Err(error),
        (Err(error), Mode::Static) => match read_artifact(root) {
            Some(value) => {
                let mut resolved = from_artifact(root, &value, mode)?;
                resolved.notes.push(format!(
                    "{} The config of the last `dialex` run is used.",
                    error.0
                ));
                resolved
            }
            None => Resolved {
                config: StaticConfig::default(),
                notes: vec![format!(
                    "{} Defaults are used until `dialex check` has run in this project.",
                    error.0
                )],
                file: None,
            },
        },
    };

    if mode == Mode::Static {
        cache().lock().unwrap().insert(key, resolved.clone());
    }
    Ok(resolved)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

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
}
