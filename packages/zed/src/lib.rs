//! Zed extension for Dialex.
//!
//! Zed extensions cannot draw diagnostics or hovers themselves, so this one only finds and starts
//! the `@dialexjs/language-server` package (Node, speaks LSP over stdio). All the editor features
//! live in that server.

use std::fs;

use zed_extension_api::{
    self as zed,
    serde_json::{self, json, Value},
    settings::LspSettings,
    LanguageServerId, Result, Worktree,
};

const SERVER_ID: &str = "dialex";
const PACKAGE_NAME: &str = "@dialexjs/language-server";
/// Where `npm install` puts the server's entry file, relative to a `node_modules` parent.
const SERVER_ENTRY: &str = "node_modules/@dialexjs/language-server/dist/index.mjs";

/// Packages whose presence in `package.json` means the project uses Dialex.
const DIALEX_PACKAGES: &[&str] = &["dialexjs", "@dialexjs/cli", PACKAGE_NAME];
/// Config files Dialex reads, relative to the worktree root.
const CONFIG_FILES: &[&str] = &[
    "dialex.config.ts",
    "dialex.config.mts",
    "dialex.config.js",
    "dialex.config.mjs",
    "dialex.config.json",
    "i18n.config.ts",
    "i18n.config.js",
];

struct DialexExtension;

fn parse_package_json(text: &str) -> Option<Value> {
    serde_json::from_str(text).ok()
}

fn has_dependency(package_json: &Value, name: &str) -> bool {
    ["dependencies", "devDependencies", "peerDependencies"]
        .iter()
        .any(|section| !package_json[*section][name].is_null())
}

fn is_dialex_package_json(package_json: &Value) -> bool {
    DIALEX_PACKAGES
        .iter()
        .any(|name| has_dependency(package_json, name))
}

fn is_dialex_project_with(
    mut has_file: impl FnMut(&str) -> bool,
    read_package_json: impl FnOnce() -> Option<String>,
) -> bool {
    if CONFIG_FILES.iter().any(|file| has_file(file)) {
        return true;
    }
    read_package_json()
        .and_then(|text| parse_package_json(&text))
        .is_some_and(|package_json| is_dialex_package_json(&package_json))
}

fn resolve_install_version(
    installed_entry_exists: bool,
    latest: std::result::Result<String, String>,
    installed: Option<String>,
) -> Result<Option<String>> {
    let needs_install = match &latest {
        Ok(latest) => !installed_entry_exists || installed.as_ref() != Some(latest),
        // Offline: keep what is there, fail only when nothing is installed yet.
        Err(_) => !installed_entry_exists,
    };

    if !needs_install {
        return Ok(None);
    }

    let version = latest
        .map_err(|error| format!("could not look up the latest {PACKAGE_NAME} version: {error}"))?;
    Ok(Some(version))
}

fn worktree_server_entry(root_path: &str) -> String {
    std::path::Path::new(root_path)
        .join(SERVER_ENTRY)
        .to_string_lossy()
        .to_string()
}

fn binary_command(
    command: String,
    args: Option<Vec<String>>,
    env: Vec<(String, String)>,
) -> zed::Command {
    zed::Command {
        command,
        args: args.unwrap_or_else(|| vec!["--stdio".to_string()]),
        env,
    }
}

fn node_server_command(
    node_path: String,
    entry: String,
    env: Vec<(String, String)>,
) -> zed::Command {
    zed::Command {
        command: node_path,
        args: vec![entry, "--stdio".to_string()],
        env,
    }
}

fn wrap_workspace_configuration(settings: Option<Value>) -> Value {
    json!({ "dialex": settings.unwrap_or_else(|| json!({})) })
}

impl DialexExtension {
    /// The project's `package.json`, if it can be read and parsed.
    fn package_json(worktree: &Worktree) -> Option<Value> {
        let text = worktree.read_text_file("package.json").ok()?;
        parse_package_json(&text)
    }

    /// Whether the worktree looks like a Dialex project. Zed starts a server for every
    /// TypeScript project, so this keeps Dialex from installing and running in the others.
    fn is_dialex_project(worktree: &Worktree) -> bool {
        is_dialex_project_with(
            |file| worktree.read_text_file(file).is_ok(),
            || worktree.read_text_file("package.json").ok(),
        )
    }

    /// Installs or updates the server package in the extension's own directory.
    fn install_server(&self, language_server_id: &LanguageServerId) -> Result<String> {
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );

        let installed_entry_exists = fs::metadata(SERVER_ENTRY).is_ok_and(|stat| stat.is_file());
        let latest = zed::npm_package_latest_version(PACKAGE_NAME);
        let installed = zed::npm_package_installed_version(PACKAGE_NAME)
            .ok()
            .flatten();

        if let Some(version) = resolve_install_version(installed_entry_exists, latest, installed)? {
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Downloading,
            );
            if let Err(error) = zed::npm_install_package(PACKAGE_NAME, &version) {
                if !fs::metadata(SERVER_ENTRY).is_ok_and(|stat| stat.is_file()) {
                    return Err(format!("failed to install {PACKAGE_NAME}: {error}"));
                }
            }
            if !fs::metadata(SERVER_ENTRY).is_ok_and(|stat| stat.is_file()) {
                return Err(format!(
                    "installed {PACKAGE_NAME} did not contain {SERVER_ENTRY}"
                ));
            }
        }

        let absolute = std::env::current_dir()
            .map_err(|error| format!("could not find the extension directory: {error}"))?
            .join(SERVER_ENTRY);
        Ok(absolute.to_string_lossy().to_string())
    }
}

impl zed::Extension for DialexExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<zed::Command> {
        let settings = LspSettings::for_worktree(SERVER_ID, worktree)?;

        // 1. A binary the user pointed at in their settings.
        if let Some(binary) = settings.binary {
            if let Some(path) = binary.path {
                return Ok(binary_command(path, binary.arguments, worktree.shell_env()));
            }
        }

        if !Self::is_dialex_project(worktree) {
            return Err(
                "this does not look like a Dialex project (no dialex.config.* and no dialexjs in package.json)"
                    .to_string(),
            );
        }

        // 2. The language server installed in the project itself.
        if Self::package_json(worktree)
            .is_some_and(|package_json| has_dependency(&package_json, PACKAGE_NAME))
        {
            let entry = worktree_server_entry(&worktree.root_path());
            return Ok(node_server_command(
                zed::node_binary_path()?,
                entry,
                worktree.shell_env(),
            ));
        }

        // 3. A `dialex-language-server` on the PATH.
        if let Some(path) = worktree.which("dialex-language-server") {
            return Ok(binary_command(path, None, worktree.shell_env()));
        }

        // 4. Install it into the extension's own directory.
        let entry = self.install_server(language_server_id)?;
        Ok(node_server_command(
            zed::node_binary_path()?,
            entry,
            worktree.shell_env(),
        ))
    }

    fn language_server_initialization_options(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<Option<Value>> {
        Ok(LspSettings::for_worktree(SERVER_ID, worktree)?.initialization_options)
    }

    fn language_server_workspace_configuration(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<Option<Value>> {
        // The server asks for the `dialex` section: diagnostics, unusedKeys, autoGenerate, configPath, enable.
        let settings = LspSettings::for_worktree(SERVER_ID, worktree)?.settings;
        Ok(Some(wrap_workspace_configuration(settings)))
    }
}

zed::register_extension!(DialexExtension);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_package_json_valid_and_invalid() {
        assert!(parse_package_json(r#"{"name": "app"}"#).is_some());
        assert!(parse_package_json("{not json").is_none());
        assert!(parse_package_json("").is_none());
    }

    #[test]
    fn has_dependency_checks_all_supported_sections() {
        let pkg = json!({
            "dependencies": { "dialexjs": "^1.0.0" },
            "devDependencies": { "@dialexjs/cli": "^1.0.0" },
            "peerDependencies": { "@dialexjs/language-server": "^1.0.0" },
            "optionalDependencies": { "ignored-pkg": "^1.0.0" }
        });

        assert!(has_dependency(&pkg, "dialexjs"));
        assert!(has_dependency(&pkg, "@dialexjs/cli"));
        assert!(has_dependency(&pkg, "@dialexjs/language-server"));
        assert!(!has_dependency(&pkg, "ignored-pkg"));
        assert!(!has_dependency(&pkg, "missing"));

        let null_dep = json!({ "dependencies": { "dialexjs": null } });
        assert!(!has_dependency(&null_dep, "dialexjs"));
    }

    #[test]
    fn is_dialex_package_json_matches_known_packages() {
        assert!(is_dialex_package_json(&json!({
            "dependencies": { "dialexjs": "1.0.0" }
        })));
        assert!(is_dialex_package_json(&json!({
            "devDependencies": { "@dialexjs/cli": "1.0.0" }
        })));
        assert!(is_dialex_package_json(&json!({
            "peerDependencies": { "@dialexjs/language-server": "1.0.0" }
        })));
        assert!(!is_dialex_package_json(&json!({
            "dependencies": { "react": "19.0.0" }
        })));
        assert!(!is_dialex_package_json(&json!({})));
    }

    #[test]
    fn is_dialex_project_with_detects_config_files_before_package_json() {
        for config_file in CONFIG_FILES {
            let mut read_pkg_called = false;
            let detected = is_dialex_project_with(
                |file| file == *config_file,
                || {
                    read_pkg_called = true;
                    None
                },
            );
            assert!(detected, "expected {config_file} to mark Dialex project");
            assert!(
                !read_pkg_called,
                "config file {config_file} should short-circuit package.json read"
            );
        }
    }

    #[test]
    fn is_dialex_project_with_falls_back_to_package_json() {
        assert!(is_dialex_project_with(
            |_| false,
            || Some(r#"{"devDependencies":{"dialexjs":"^0.1.0"}}"#.to_string()),
        ));
        assert!(!is_dialex_project_with(
            |_| false,
            || Some(r#"{"dependencies":{"typescript":"^5.0.0"}}"#.to_string()),
        ));
        assert!(!is_dialex_project_with(
            |_| false,
            || Some("invalid json".to_string()),
        ));
        assert!(!is_dialex_project_with(|_| false, || None));
    }

    #[test]
    fn resolve_install_version_handles_online_and_offline_cases() {
        assert_eq!(
            resolve_install_version(false, Ok("1.2.3".to_string()), None),
            Ok(Some("1.2.3".to_string()))
        );
        assert_eq!(
            resolve_install_version(true, Ok("1.2.3".to_string()), Some("1.0.0".to_string())),
            Ok(Some("1.2.3".to_string()))
        );
        assert_eq!(
            resolve_install_version(true, Ok("1.2.3".to_string()), Some("1.2.3".to_string())),
            Ok(None)
        );
        assert_eq!(
            resolve_install_version(false, Ok("1.2.3".to_string()), Some("1.2.3".to_string())),
            Ok(Some("1.2.3".to_string()))
        );
        assert_eq!(
            resolve_install_version(true, Err("offline".to_string()), Some("1.0.0".to_string())),
            Ok(None)
        );

        let err = resolve_install_version(false, Err("offline".to_string()), None)
            .expect_err("offline with no existing install should fail");
        assert!(err.contains(PACKAGE_NAME));
        assert!(err.contains("offline"));
    }

    #[test]
    fn worktree_server_entry_joins_server_entry() {
        let expected = std::path::Path::new("/repo/app")
            .join(SERVER_ENTRY)
            .to_string_lossy()
            .to_string();
        assert_eq!(worktree_server_entry("/repo/app"), expected);
        assert_eq!(worktree_server_entry("/repo/app/"), expected);
    }

    #[test]
    fn binary_and_node_commands_preserve_env_and_args() {
        let env = vec![("PATH".to_string(), "/usr/bin".to_string())];

        let default_cmd = binary_command("dialex-language-server".to_string(), None, env.clone());
        assert_eq!(default_cmd.command, "dialex-language-server");
        assert_eq!(default_cmd.args, vec!["--stdio"]);
        assert_eq!(default_cmd.env, env);

        let custom_cmd = binary_command(
            "/custom/server".to_string(),
            Some(vec!["--stdio".to_string(), "--debug".to_string()]),
            env.clone(),
        );
        assert_eq!(custom_cmd.command, "/custom/server");
        assert_eq!(custom_cmd.args, vec!["--stdio", "--debug"]);
        assert_eq!(custom_cmd.env, env);

        let node_cmd = node_server_command(
            "/usr/local/bin/node".to_string(),
            "/repo/node_modules/@dialexjs/language-server/dist/index.mjs".to_string(),
            env.clone(),
        );
        assert_eq!(node_cmd.command, "/usr/local/bin/node");
        assert_eq!(
            node_cmd.args,
            vec![
                "/repo/node_modules/@dialexjs/language-server/dist/index.mjs",
                "--stdio"
            ]
        );
        assert_eq!(node_cmd.env, env);
    }

    #[test]
    fn wrap_workspace_configuration_wraps_or_defaults_settings() {
        assert_eq!(wrap_workspace_configuration(None), json!({ "dialex": {} }));
        assert_eq!(
            wrap_workspace_configuration(Some(json!({ "enable": true, "unusedKeys": false }))),
            json!({ "dialex": { "enable": true, "unusedKeys": false } })
        );
    }
}
