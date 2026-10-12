use std::path::{Path, PathBuf};

use globset::GlobSetBuilder;
use ignore::gitignore::{Gitignore, GitignoreBuilder};
use walkdir::WalkDir;

/// Folders that never hold dictionaries (`BUILTIN_IGNORE` in `utils/files.ts`).
const BUILTIN_DIRS: [&str; 4] = ["node_modules", "dist", ".next", "dialex.locales"];

/// The glob features fast-glob supports that this scanner does not. The caller then falls back to
/// Node instead of guessing.
#[derive(Debug)]
pub struct Unsupported(pub String);

fn check_pattern(pattern: &str) -> Result<String, Unsupported> {
    let pattern = pattern.strip_prefix("./").unwrap_or(pattern);
    let bad = pattern.starts_with('!')
        || pattern.starts_with('/')
        || pattern.starts_with('.')
        || pattern.contains("../")
        || pattern.contains("/.")
        || pattern.contains('\\')
        || ["@(", "!(", "+(", "?(", "*("]
            .iter()
            .any(|p| pattern.contains(p));
    if bad {
        return Err(Unsupported(format!("glob pattern {pattern:?}")));
    }
    Ok(pattern.to_string())
}

struct Scope {
    dir: PathBuf,
    matcher: Gitignore,
}

fn read_scope(dir: &Path) -> Option<Scope> {
    let file = dir.join(".gitignore");
    if !file.is_file() {
        return None;
    }
    let mut builder = GitignoreBuilder::new(dir);
    builder.add(&file);
    builder.build().ok().map(|matcher| Scope {
        dir: dir.to_path_buf(),
        matcher,
    })
}

/// The nearest directory at or above `root` with a `.git`, or `root`.
fn repository_root(root: &Path) -> PathBuf {
    let mut dir = Some(root);
    while let Some(current) = dir {
        if current.join(".git").exists() {
            return current.to_path_buf();
        }
        dir = current.parent();
    }
    root.to_path_buf()
}

/// The project tree, walked once per process: every file with its path segments, and the
/// `.gitignore` scopes that apply (the project's own, its parents up to the repository root, and
/// nested ones).
struct Walk {
    files: Vec<(PathBuf, Vec<String>)>,
    scopes: Vec<Scope>,
}

type WalkCache = std::sync::Mutex<std::collections::HashMap<PathBuf, std::sync::Arc<Walk>>>;

fn walk_cache() -> &'static WalkCache {
    static CACHE: std::sync::OnceLock<WalkCache> = std::sync::OnceLock::new();
    CACHE.get_or_init(Default::default)
}

/// Forgets the walked trees, so the next scan sees files that appeared or went away. A one-shot
/// command never needs it; the language server calls it before each analysis.
pub fn forget_walks() {
    walk_cache().lock().unwrap().clear();
}

fn walk_tree(root: &Path) -> std::sync::Arc<Walk> {
    use std::sync::Arc;
    let cache = walk_cache();
    if let Some(found) = cache.lock().unwrap().get(root) {
        return found.clone();
    }

    let mut scopes: Vec<Scope> = Vec::new();
    let top = repository_root(root);
    let mut dir = Some(root);
    while let Some(current) = dir {
        if let Some(scope) = read_scope(current) {
            scopes.push(scope);
        }
        if current == top {
            break;
        }
        dir = current.parent();
    }

    let mut files: Vec<(PathBuf, Vec<String>)> = Vec::new();
    let walker = WalkDir::new(root)
        .follow_links(true)
        .into_iter()
        .filter_entry(|entry| {
            if entry.depth() == 0 || !entry.file_type().is_dir() {
                return true;
            }
            let name = entry.file_name().to_string_lossy();
            name != "node_modules" && name != ".git"
        });
    for entry in walker.flatten() {
        if entry.file_type().is_dir() {
            continue;
        }
        let path = entry.path();
        let Ok(relative) = path.strip_prefix(root) else {
            continue;
        };
        let segments: Vec<String> = relative
            .components()
            .map(|c| c.as_os_str().to_string_lossy().into_owned())
            .collect();

        if entry.file_name() == ".gitignore" {
            let dir = path.parent().unwrap();
            // folders the glob skips cannot hold files that matter
            if dir != root && !segments.iter().any(|s| BUILTIN_DIRS.contains(&s.as_str())) {
                if let Some(scope) = read_scope(dir) {
                    scopes.push(scope);
                }
            }
            continue;
        }
        files.push((path.to_path_buf(), segments));
    }

    let walk = Arc::new(Walk { files, scopes });
    cache
        .lock()
        .unwrap()
        .insert(root.to_path_buf(), walk.clone());
    walk
}

/// Which built-in ignore list applies.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Dictionary,
    Source,
}

/// What the source scan skips on top of [`BUILTIN_DIRS`] (`SOURCE_BUILTIN_IGNORE`).
const SOURCE_DIRS: [&str; 7] = [
    ".nuxt",
    ".output",
    ".svelte-kit",
    ".astro",
    ".turbo",
    "coverage",
    "graphify-out",
];

fn skipped_source_file(name: &str) -> bool {
    name.ends_with(".d.ts")
        || name.starts_with("dialex.generated.")
        || name.starts_with("dialex.config.")
        || name.starts_with("i18n.config.")
}

/// Dictionary files: `scanFiles(root, patterns, { exclude })`.
pub fn scan_files(
    root: &Path,
    patterns: &[String],
    exclude: &[String],
) -> Result<Vec<PathBuf>, Unsupported> {
    scan(root, patterns, exclude, Kind::Dictionary)
}

/// Finds files under `root` the way `scanFiles` does: glob `patterns`, minus the built-in and
/// `exclude` ignores and what `.gitignore` files ignore. Returns sorted absolute paths.
pub fn scan(
    root: &Path,
    patterns: &[String],
    exclude: &[String],
    kind: Kind,
) -> Result<Vec<PathBuf>, Unsupported> {
    let mut include = GlobSetBuilder::new();
    for pattern in patterns {
        let pattern = check_pattern(pattern)?;
        let glob = globset::GlobBuilder::new(&pattern)
            .literal_separator(true)
            .build()
            .map_err(|e| Unsupported(e.to_string()))?;
        include.add(glob);
    }
    let include = include.build().map_err(|e| Unsupported(e.to_string()))?;

    let mut excluded = GlobSetBuilder::new();
    for pattern in exclude {
        if !pattern.contains('*') {
            return Err(Unsupported(format!("exclude pattern {pattern:?}")));
        }
        let pattern = check_pattern(pattern)?;
        excluded.add(
            globset::GlobBuilder::new(&pattern)
                .literal_separator(true)
                .build()
                .map_err(|e| Unsupported(e.to_string()))?,
        );
    }
    let excluded = excluded.build().map_err(|e| Unsupported(e.to_string()))?;

    let walk = walk_tree(root);

    let mut candidates: Vec<(PathBuf, String)> = Vec::new();
    for (path, segments) in &walk.files {
        let name = &segments[segments.len() - 1];
        if segments.iter().any(|s| s.starts_with('.')) {
            continue; // `dot: false`
        }
        let directories = &segments[..segments.len() - 1];
        if directories
            .iter()
            .any(|s| BUILTIN_DIRS.contains(&s.as_str()))
        {
            continue;
        }
        if kind == Kind::Source {
            if directories
                .iter()
                .any(|s| SOURCE_DIRS.contains(&s.as_str()))
            {
                continue;
            }
            if skipped_source_file(name) {
                continue;
            }
        }
        let relative_text = segments.join("/");
        if include.is_match(&relative_text) && !excluded.is_match(&relative_text) {
            candidates.push((path.clone(), relative_text));
        }
    }
    let scopes = &walk.scopes;

    let mut files: Vec<PathBuf> = candidates
        .into_iter()
        .filter(|(path, _)| {
            !scopes
                .iter()
                .any(|scope| match path.strip_prefix(&scope.dir) {
                    Ok(relative) if !relative.as_os_str().is_empty() => scope
                        .matcher
                        .matched_path_or_any_parents(relative, false)
                        .is_ignore(),
                    _ => false,
                })
        })
        .map(|(path, _)| path)
        .collect();
    files.sort_by(|a, b| {
        a.to_string_lossy()
            .encode_utf16()
            .cmp(b.to_string_lossy().encode_utf16())
    });
    Ok(files)
}
