//! `dialex generate`: `dialex.generated.ts` and `dialex-env.d.ts` from the dictionary files.
//! A port of `renderGenerated` and `generateDictionaries` for the non-lazy case.

use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};

use dialex_icu::message_type;
use dialex_syntax::{Dictionary, Lazy, LeafKind, ParseError};
use serde_json::{json, Value};

use crate::adapters::detect_adapters;
use crate::collate::locale_compare;
use crate::paths::{relative, resolve};
use crate::scan::scan_files;
use crate::tsconfig::relative_import_extension;

/// Why the native path declined; the Node CLI then runs the command.
#[derive(Debug)]
pub struct Fallback(pub String);

impl From<crate::scan::Unsupported> for Fallback {
    fn from(error: crate::scan::Unsupported) -> Self {
        Fallback(format!("unsupported: {}", error.0))
    }
}

#[derive(Debug, Default, Clone)]
pub struct Options {
    pub output: Option<String>,
    pub config: Option<String>,
}

#[derive(Debug)]
pub struct Rendered {
    pub files: Vec<PathBuf>,
    pub output_path: PathBuf,
    pub content: String,
    pub dts_path: PathBuf,
    pub dts_content: Option<String>,
    pub config_file: Option<PathBuf>,
    pub notes: Vec<String>,
}

fn json_string(text: &str) -> String {
    serde_json::to_string(text).unwrap()
}

/// `path.relative(dir, file)` with the `.ts` extension replaced, as a module specifier.
fn import_path(dir: &Path, file: &Path, extension: &str) -> String {
    let mut relative = relative(dir, file);
    if let Some(stripped) = relative.strip_suffix(".ts") {
        relative = format!("{stripped}{extension}");
    }
    if !relative.starts_with('.') {
        relative = format!("./{relative}");
    }
    relative
}

/// The settings of `dialex.config.*`, from the file `@dialexjs/config` resolved (it is run again
/// when that file is stale). The config may be run, so spreads and computed values are resolved.
pub fn load_config(
    root: &Path,
    config: &Option<String>,
) -> Result<(dialex_syntax::StaticConfig, Vec<String>, Option<PathBuf>), Fallback> {
    let resolved = crate::resolved::load(root, config, crate::resolved::Mode::Run)?;
    Ok((resolved.config, resolved.notes, resolved.file))
}

/// Like [`load_config`], but never runs project code: a config with spreads or computed keys is
/// read as far as its syntax tree goes (with a note). For editors, which never run project code.
pub fn load_config_lenient(
    root: &Path,
    config: &Option<String>,
) -> Result<(dialex_syntax::StaticConfig, Vec<String>, Option<PathBuf>), Fallback> {
    let resolved = crate::resolved::load(root, config, crate::resolved::Mode::Static)?;
    Ok((resolved.config, resolved.notes, resolved.file))
}

pub fn render(root: &Path, options: &Options) -> Result<Rendered, Fallback> {
    let (config, notes, config_file) = load_config(root, &options.config)?;
    if !notes.is_empty() {
        return Err(Fallback(format!("config not static: {}", notes[0])));
    }
    if config.lazy != Lazy::Off {
        return Err(Fallback("lazy loading".into()));
    }

    let found = scan_files(root, &config.include, &config.exclude)?;

    let src_dir = if root.join("src").exists() {
        root.join("src")
    } else {
        root.to_path_buf()
    };
    let output_option = options.output.clone().or(config.output.clone());
    let output_path = match &output_option {
        Some(output) => resolve(root, output),
        None => src_dir.join("dialex.generated.ts"),
    };
    let output_dir = output_path.parent().unwrap_or(root).to_path_buf();

    // A broad `include` would otherwise match the files generated here
    let files: Vec<PathBuf> = found
        .into_iter()
        .filter(|file| {
            *file != output_path
                && !file.to_string_lossy().ends_with(".d.ts")
                && file.file_name().and_then(|n| n.to_str()) != Some("dialex.generated.ts")
        })
        .collect();

    let loaded: Vec<std::sync::Arc<crate::sources::Loaded>> =
        crate::sources::load_dictionaries(&files)
            .into_iter()
            .map(|loaded| loaded.map_err(Fallback))
            .collect::<Result<_, _>>()?;
    let mut dictionaries: Vec<Option<&Dictionary>> = Vec::with_capacity(files.len());
    for item in &loaded {
        match &item.parsed {
            Ok(dictionary) => dictionaries.push(dictionary.as_ref()),
            Err(ParseError::Syntax(message)) => {
                return Err(Fallback(format!("syntax error: {message}")))
            }
            Err(ParseError::Unsupported(message)) => return Err(Fallback(message.clone())),
        }
    }

    // Locales: configured, or the ones the dictionaries define
    let mut inferred: Vec<String> = Vec::new();
    for dictionary in dictionaries.iter().flatten() {
        for locale in dictionary.locale_names() {
            if !inferred.contains(&locale) {
                inferred.push(locale);
            }
        }
    }
    let locales = if config.locales.is_empty() {
        inferred
    } else {
        config.locales.clone()
    };

    let client_config = {
        let fallbacks: serde_json::Map<String, Value> = config
            .fallbacks
            .iter()
            .map(|(k, v)| (k.clone(), json!(v)))
            .collect();
        json!({
            "defaultLocale": config.default_locale,
            "locales": locales,
            "fallbacks": fallbacks,
            "prefixDefault": config.prefix_default,
            "lazy": false,
        })
    };

    let extension = relative_import_extension(root);
    let header = "// Auto-generated by dialex CLI. Do not edit directly.\n/* eslint-disable */\n// @ts-nocheck";
    let config_json = serde_json::to_string_pretty(&client_config).unwrap();
    let locales_block = if locales.is_empty() {
        "export const locales: readonly string[] = [];\nexport type Locale = string;".to_string()
    } else {
        format!(
            "export const locales = {} as const;\nexport type Locale = (typeof locales)[number];",
            serde_json::to_string(&locales).unwrap()
        )
    };
    let config_export = format!("export const config = {config_json};\n\n{locales_block}");

    let ids: Vec<String> = (0..files.len()).map(|i| format!("dict_{i}")).collect();
    let dict_list = if ids.len() <= 1 {
        format!("[{}]", ids.join(", "))
    } else {
        format!("[\n  {}\n]", ids.join(",\n  "))
    };
    let imports: Vec<String> = files
        .iter()
        .zip(&ids)
        .map(|(file, id)| {
            format!(
                "import {id} from \"{}\";",
                import_path(&output_dir, file, extension)
            )
        })
        .collect();
    let map_lines: Vec<String> = ids
        .iter()
        .map(|id| format!("  [{id}.name]: {id}.dictionary,"))
        .collect();
    let content = format!(
        "{header}\n{imports}\n\nexport const dictionaries = {dict_list};\n\nexport const dictionaryMap = {{\n{map}\n}};\n\n{config_export}\n\nexport const dialex = {{ dictionaries, config }};\n\nexport default dictionaries;\n",
        imports = imports.join("\n"),
        map = map_lines.join("\n"),
    );

    // Types of ICU arguments, read from each dictionary's reference locale
    let arguments = message_arguments(&dictionaries, &config.default_locale)?;
    let dts_dir = if output_option.is_some() {
        Some(output_dir.clone())
    } else {
        None
    };
    let dts = render_dts(
        root,
        &files,
        &locales,
        &arguments,
        dts_dir.as_deref(),
        &src_dir,
    )?;

    let dts_default = if output_option.is_some() {
        &output_dir
    } else {
        &src_dir
    };
    let (dts_path, dts_content) = match dts {
        Some((path, content)) => (path, Some(content)),
        None => (dts_default.join("dialex-env.d.ts"), None),
    };

    Ok(Rendered {
        files,
        output_path,
        content,
        dts_path,
        dts_content,
        config_file,
        notes,
    })
}

fn message_arguments(
    dictionaries: &[Option<&Dictionary>],
    default_locale: &str,
) -> Result<Vec<(String, String)>, Fallback> {
    let mut result: Vec<(String, String)> = Vec::new();
    for dictionary in dictionaries.iter().flatten() {
        let Some(name) = &dictionary.name else {
            continue;
        };
        let names = dictionary.locale_names();
        let reference = if names.iter().any(|l| l == default_locale) {
            Some(default_locale.to_string())
        } else {
            names.first().cloned()
        };
        let Some(reference) = reference else { continue };
        let Some(locale) = dictionary.locale(&reference) else {
            continue;
        };
        for leaf in &locale.leaves {
            if leaf.kind != LeafKind::String {
                continue;
            }
            let Some(value) = &leaf.value else { continue };
            if let Some(kind) = message_type(value) {
                let key = format!("{name}.{}", leaf.path.join("."));
                match result.iter_mut().find(|(existing, _)| *existing == key) {
                    Some(entry) => entry.1 = kind,
                    None => result.push((key, kind)),
                }
            }
        }
    }
    Ok(result)
}

fn render_dts(
    root: &Path,
    files: &[PathBuf],
    locales: &[String],
    arguments: &[(String, String)],
    directory: Option<&Path>,
    src_dir: &Path,
) -> Result<Option<(PathBuf, String)>, Fallback> {
    if files.is_empty() {
        return Ok(None);
    }
    let dts_dir = match directory {
        Some(dir) => dir.to_path_buf(),
        None => {
            if root.join("src").exists() {
                src_dir.to_path_buf()
            } else {
                root.to_path_buf()
            }
        }
    };

    let mut imports = Vec::new();
    let mut records = Vec::new();
    for (index, file) in files.iter().enumerate() {
        let mut rel = relative(&dts_dir, file);
        if let Some(stripped) = rel.strip_suffix(".ts") {
            rel = stripped.to_string();
        }
        if !rel.starts_with('.') {
            rel = format!("./{rel}");
        }
        imports.push(format!("import dict{index} from '{rel}';"));
        records.push(format!(
            "Record<typeof dict{index}['name'], typeof dict{index}['dictionary'][keyof typeof dict{index}['dictionary']]>"
        ));
    }

    let locales_type = if locales.is_empty() {
        "string".to_string()
    } else {
        locales
            .iter()
            .map(|l| format!("\"{l}\""))
            .collect::<Vec<_>>()
            .join(" | ")
    };
    let registry = records.join(",\n    ");

    let mut sorted: Vec<&(String, String)> = arguments.iter().collect();
    let mut unsupported = false;
    sorted.sort_by(|a, b| match locale_compare(&a.0, &b.0) {
        Some(ordering) => ordering,
        None => {
            unsupported = true;
            Ordering::Equal
        }
    });
    if unsupported {
        return Err(Fallback("non-ASCII argument keys".into()));
    }
    let entries: Vec<String> = sorted
        .iter()
        .map(|(key, kind)| format!("    {}: {kind};", json_string(key)))
        .collect();
    let message_entries = entries.join("\n");

    let adapter_blocks: String = detect_adapters(root)
        .iter()
        .map(|adapter| {
            format!(
                "\ndeclare module 'dialexjs/{adapter}' {{\n  export interface DictionaryRegistry extends {registry} {{}}\n}}\n"
            )
        })
        .collect();

    let entries_block = if message_entries.is_empty() {
        String::new()
    } else {
        format!("\n{message_entries}\n  ")
    };
    let content = format!(
        "/* eslint-disable */\n// @ts-nocheck\n// Generated by dialex\n{imports}\n\ndeclare module 'dialexjs' {{\n  export interface Register {{\n    locales: {locales_type};\n  }}\n  export interface DictionaryRegistry extends {records} {{}}\n  export interface MessageArguments {{{entries_block}}}\n}}\n{adapter_blocks}\n",
        imports = imports.join("\n"),
        records = records.join(",\n    "),
    );
    Ok(Some((dts_dir.join("dialex-env.d.ts"), content)))
}

fn write_if_changed(file: &Path, content: &str) -> std::io::Result<()> {
    if fs::read_to_string(file)
        .map(|existing| existing == content)
        .unwrap_or(false)
    {
        return Ok(());
    }
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(file, content)
}

/// Writes the files, and removes leftovers of per-locale modules, as `generateDictionaries` does.
pub fn write(rendered: &Rendered) -> std::io::Result<()> {
    if let Some(content) = &rendered.dts_content {
        write_if_changed(&rendered.dts_path, content)?;
    }
    write_if_changed(&rendered.output_path, &rendered.content)?;

    let dir = rendered
        .output_path
        .parent()
        .unwrap_or(Path::new("."))
        .join("dialex.locales");
    if dir.is_dir() {
        for entry in fs::read_dir(&dir)?.flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|e| e == "ts") {
                fs::remove_file(path)?;
            }
        }
        if fs::read_dir(&dir)?.next().is_none() {
            fs::remove_dir(&dir)?;
        }
    }
    Ok(())
}
