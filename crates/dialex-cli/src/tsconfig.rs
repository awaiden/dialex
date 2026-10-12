use std::path::{Path, PathBuf};

use serde_json::Value;

/// Parses JSON with comments and trailing commas, as `parseJsonc` does.
pub fn parse_jsonc(text: &str) -> Option<Value> {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut in_string = false;
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if in_string {
            out.push(c);
            if c == '\\' {
                i += 1;
                if let Some(next) = chars.get(i) {
                    out.push(*next);
                }
            } else if c == '"' {
                in_string = false;
            }
        } else if c == '"' {
            in_string = true;
            out.push(c);
        } else if c == '/' && chars.get(i + 1) == Some(&'/') {
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            out.push('\n');
            continue;
        } else if c == '/' && chars.get(i + 1) == Some(&'*') {
            i += 2;
            while i < chars.len() && !(chars[i] == '*' && chars.get(i + 1) == Some(&'/')) {
                i += 1;
            }
            i += 1;
        } else {
            out.push(c);
        }
        i += 1;
    }
    // trailing commas: `,` followed by whitespace and a closing bracket
    let mut cleaned = String::with_capacity(out.len());
    let bytes: Vec<char> = out.chars().collect();
    let mut in_str = false;
    let mut k = 0;
    while k < bytes.len() {
        let c = bytes[k];
        if in_str {
            cleaned.push(c);
            if c == '\\' {
                k += 1;
                if let Some(n) = bytes.get(k) {
                    cleaned.push(*n);
                }
            } else if c == '"' {
                in_str = false;
            }
        } else if c == '"' {
            in_str = true;
            cleaned.push(c);
        } else if c == ',' {
            let mut j = k + 1;
            while j < bytes.len() && bytes[j].is_whitespace() {
                j += 1;
            }
            if !matches!(bytes.get(j), Some('}') | Some(']')) {
                cleaned.push(c);
            }
        } else {
            cleaned.push(c);
        }
        k += 1;
    }
    serde_json::from_str(&cleaned).ok()
}

#[derive(Default, Clone)]
struct Resolved {
    module_resolution: Option<String>,
    include: Option<Vec<String>>,
    references: Vec<PathBuf>,
}

fn config_file(from: &Path) -> Option<PathBuf> {
    if from.is_file() {
        return Some(from.to_path_buf());
    }
    let with_ext = PathBuf::from(format!("{}.json", from.display()));
    if with_ext.is_file() {
        return Some(with_ext);
    }
    let inside = from.join("tsconfig.json");
    inside.is_file().then_some(inside)
}

fn package_config(from: &Path, specifier: &str) -> Option<PathBuf> {
    let mut dir = Some(from);
    while let Some(current) = dir {
        if let Some(found) = config_file(&current.join("node_modules").join(specifier)) {
            return Some(found);
        }
        dir = current.parent();
    }
    None
}

fn read(file: &Path, depth: u32) -> Resolved {
    let mut result = Resolved::default();
    let Some(json) = std::fs::read_to_string(file)
        .ok()
        .and_then(|text| parse_jsonc(&text))
    else {
        return result;
    };
    let dir = file.parent().unwrap_or(Path::new("."));

    let parents: Vec<String> = match json.get("extends") {
        Some(Value::String(one)) => vec![one.clone()],
        Some(Value::Array(many)) => many
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        _ => Vec::new(),
    };
    for specifier in parents {
        if depth >= 5 {
            continue;
        }
        let parent = if specifier.starts_with('.') {
            config_file(&crate::paths::resolve(dir, &specifier))
        } else {
            package_config(dir, &specifier)
        };
        if let Some(parent) = parent {
            let inherited = read(&parent, depth + 1);
            if inherited.module_resolution.is_some() {
                result.module_resolution = inherited.module_resolution;
            }
            if inherited.include.is_some() {
                result.include = inherited.include;
            }
            if !inherited.references.is_empty() {
                result.references = inherited.references;
            }
        }
    }

    let options = json.get("compilerOptions");
    let module = options
        .and_then(|o| o.get("module"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_lowercase());
    let resolution = options
        .and_then(|o| o.get("moduleResolution"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_lowercase())
        .or_else(|| match module.as_deref() {
            Some("node16") | Some("nodenext") => module.clone(),
            _ => None,
        });
    if resolution.is_some() {
        result.module_resolution = resolution;
    }
    if let Some(Value::Array(include)) = json.get("include") {
        result.include = Some(
            include
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect(),
        );
    }
    result.references = json
        .get("references")
        .and_then(|v| v.as_array())
        .map(|refs| {
            refs.iter()
                .filter_map(|r| r.get("path").and_then(|p| p.as_str()))
                .filter_map(|p| config_file(&crate::paths::resolve(dir, p)))
                .collect()
        })
        .unwrap_or_default();
    result
}

/// The extension for relative imports in generated files: `.js` for `node16`/`nodenext` (and when
/// there is no tsconfig), none otherwise.
pub fn relative_import_extension(root: &Path) -> &'static str {
    let Some(file) = config_file(&root.join("tsconfig.json")) else {
        return ".js";
    };

    let mut resolved = read(&file, 0);
    if resolved.module_resolution.is_none() && !resolved.references.is_empty() {
        // A "solution" tsconfig: use the referenced project that covers src/.
        let projects: Vec<Resolved> = resolved.references.iter().map(|p| read(p, 0)).collect();
        let covers_src = |p: &Resolved| {
            p.include.as_ref().is_some_and(|include| {
                include.iter().any(|entry| {
                    let entry = entry.strip_prefix("./").unwrap_or(entry);
                    entry == "src" || entry.starts_with("src/")
                })
            })
        };
        if let Some(project) = projects.iter().find(|p| covers_src(p)).or(projects.first()) {
            resolved = project.clone();
        }
    }
    match resolved.module_resolution.as_deref() {
        Some("node16") | Some("nodenext") => ".js",
        _ => "",
    }
}
