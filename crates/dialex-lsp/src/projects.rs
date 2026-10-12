//! Finding the Dialex projects inside a workspace folder (`features/projects.ts`).

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use dialex_cli::scan::scan_files;

pub struct ProjectRoot {
    pub root: PathBuf,
    /// Globs (relative to `root`) for nested projects that belong to someone else.
    pub ignore: Vec<String>,
}

// The Node server also ignores `**/.git/**` and `**/.nuxt/**`; the scan skips every dot folder
// already, so nothing needs listing on top of the built-in names and `.gitignore` files.

/// The nearest folder at or above `dir` (but inside `folder`) that has a package.json.
fn package_root(folder: &Path, dir: &Path) -> PathBuf {
    let mut current = dir;
    while current.starts_with(folder) {
        if current.join("package.json").exists() {
            return current.to_path_buf();
        }
        if current == folder {
            break;
        }
        match current.parent() {
            Some(parent) => current = parent,
            None => break,
        }
    }
    folder.to_path_buf()
}

/// - Every directory with a `dialex.config.*` or `i18n.config.*` is a project.
/// - A `*.content.ts` file that no such project contains belongs to the nearest folder with a
///   `package.json` (or the workspace folder), which then uses the default settings.
/// - A project excludes the projects nested inside it, so one dictionary is never reported twice.
pub fn discover_projects(folder: &Path) -> Vec<ProjectRoot> {
    let ignore: Vec<String> = Vec::new();
    let patterns = vec![
        "**/dialex.config.*".to_string(),
        "**/i18n.config.*".to_string(),
    ];
    let configs = scan_files(folder, &patterns, &ignore).unwrap_or_default();
    let configured: BTreeSet<PathBuf> = configs
        .iter()
        .filter_map(|f| f.parent().map(Path::to_path_buf))
        .collect();
    let mut roots: BTreeSet<PathBuf> = configured.clone();

    let dictionaries =
        scan_files(folder, &["**/*.content.ts".to_string()], &ignore).unwrap_or_default();
    for file in dictionaries {
        if !configured.iter().any(|root| file.starts_with(root)) {
            if let Some(dir) = file.parent() {
                roots.insert(package_root(folder, dir));
            }
        }
    }

    let mut all: Vec<PathBuf> = roots.into_iter().collect();
    // by path length, then path, so the order is stable
    all.sort_by(|a, b| {
        a.as_os_str()
            .len()
            .cmp(&b.as_os_str().len())
            .then_with(|| a.cmp(b))
    });
    all.iter()
        .map(|root| ProjectRoot {
            root: root.clone(),
            ignore: all
                .iter()
                .filter(|other| *other != root && other.starts_with(root))
                .map(|other| {
                    let relative = other.strip_prefix(root).unwrap();
                    let parts: Vec<String> = relative
                        .components()
                        .map(|c| c.as_os_str().to_string_lossy().into_owned())
                        .collect();
                    format!("{}/**", parts.join("/"))
                })
                .collect(),
        })
        .collect()
}
