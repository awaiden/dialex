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

impl DialexExtension {
    /// The project's `package.json`, if it can be read and parsed.
    fn package_json(worktree: &Worktree) -> Option<Value> {
        let text = worktree.read_text_file("package.json").ok()?;
        serde_json::from_str(&text).ok()
    }

    fn has_dependency(package_json: &Value, name: &str) -> bool {
        ["dependencies", "devDependencies", "peerDependencies"]
            .iter()
            .any(|section| !package_json[*section][name].is_null())
    }

    /// Whether the worktree looks like a Dialex project. Zed starts a server for every
    /// TypeScript project, so this keeps Dialex from installing and running in the others.
    fn is_dialex_project(worktree: &Worktree) -> bool {
        if CONFIG_FILES
            .iter()
            .any(|file| worktree.read_text_file(file).is_ok())
        {
            return true;
        }
        Self::package_json(worktree).is_some_and(|package_json| {
            DIALEX_PACKAGES
                .iter()
                .any(|name| Self::has_dependency(&package_json, name))
        })
    }

    /// Installs or updates the server package in the extension's own directory.
    fn install_server(&self, language_server_id: &LanguageServerId) -> Result<String> {
        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );

        let installed_entry_exists = fs::metadata(SERVER_ENTRY).is_ok_and(|stat| stat.is_file());
        let latest = zed::npm_package_latest_version(PACKAGE_NAME);
        let installed = zed::npm_package_installed_version(PACKAGE_NAME).ok().flatten();

        let needs_install = match &latest {
            Ok(latest) => !installed_entry_exists || installed.as_ref() != Some(latest),
            // Offline: keep what is there, fail only when nothing is installed yet.
            Err(_) => !installed_entry_exists,
        };

        if needs_install {
            let version = latest.map_err(|error| {
                format!("could not look up the latest {PACKAGE_NAME} version: {error}")
            })?;
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
        let args = vec!["--stdio".to_string()];

        // 1. A binary the user pointed at in their settings.
        if let Some(binary) = settings.binary {
            if let Some(path) = binary.path {
                return Ok(zed::Command {
                    command: path,
                    args: binary.arguments.unwrap_or(args),
                    env: worktree.shell_env(),
                });
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
            .is_some_and(|package_json| Self::has_dependency(&package_json, PACKAGE_NAME))
        {
            let entry = std::path::Path::new(&worktree.root_path())
                .join(SERVER_ENTRY)
                .to_string_lossy()
                .to_string();
            let mut node_args = vec![entry];
            node_args.extend(args);
            return Ok(zed::Command {
                command: zed::node_binary_path()?,
                args: node_args,
                env: worktree.shell_env(),
            });
        }

        // 3. A `dialex-language-server` on the PATH.
        if let Some(path) = worktree.which("dialex-language-server") {
            return Ok(zed::Command {
                command: path,
                args,
                env: worktree.shell_env(),
            });
        }

        // 4. Install it into the extension's own directory.
        let entry = self.install_server(language_server_id)?;
        let mut node_args = vec![entry];
        node_args.extend(args);
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: node_args,
            env: worktree.shell_env(),
        })
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
        // The server asks for the `dialex` section: unusedKeys, autoGenerate, configPath, enable.
        let settings = LspSettings::for_worktree(SERVER_ID, worktree)?
            .settings
            .unwrap_or_else(|| json!({}));
        Ok(Some(json!({ "dialex": settings })))
    }
}

zed::register_extension!(DialexExtension);
