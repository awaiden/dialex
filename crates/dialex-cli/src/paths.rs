use std::path::{Component, Path, PathBuf};

/// `path.resolve(root, p)`: joins and normalizes, without touching the file system.
pub fn resolve(root: &Path, relative: &str) -> PathBuf {
    let joined = if Path::new(relative).is_absolute() {
        PathBuf::from(relative)
    } else {
        root.join(relative)
    };
    normalize(&joined)
}

/// Removes `.` and resolves `..` lexically.
pub fn normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                if !out.pop() {
                    out.push("..");
                }
            }
            other => out.push(other.as_os_str()),
        }
    }
    out
}

/// `path.relative(from, to)` with forward slashes.
pub fn relative(from: &Path, to: &Path) -> String {
    let relative = pathdiff::diff_paths(to, from).unwrap_or_else(|| to.to_path_buf());
    relative.to_string_lossy().replace('\\', "/")
}
