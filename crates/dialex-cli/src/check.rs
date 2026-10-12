//! `dialex check` (a port of `commands/check.ts` for the read-only case).

use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Map, Value};

use crate::analysis::{analyze_project, AnalysisConfig, AnalysisOptions, Level};
use crate::generate::{load_config, render, Fallback, Options};
use crate::logger::Logger;
use crate::paths::relative;
use crate::scan::scan_files;

#[derive(Debug, Default, Clone)]
pub struct CheckOptions {
    pub config: Option<String>,
    pub json: bool,
    pub github: bool,
    pub fail_on_stale: bool,
    pub src: Option<Vec<String>>,
}

/// What a formatter can change without changing the code: quote style, quoted keys, whitespace and
/// trailing commas (`normalizeGenerated`).
pub fn normalize_generated(text: &str) -> String {
    let quotes: Vec<char> = text.replace('\'', "\"").chars().collect();

    // "identifier": -> identifier:
    let is_start = |c: char| c.is_ascii_alphabetic() || c == '_' || c == '$';
    let is_part = |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '$';
    let mut unquoted = String::with_capacity(quotes.len());
    let mut i = 0;
    while i < quotes.len() {
        if quotes[i] == '"' && quotes.get(i + 1).is_some_and(|c| is_start(*c)) {
            let mut j = i + 1;
            while j < quotes.len() && is_part(quotes[j]) {
                j += 1;
            }
            if quotes.get(j) == Some(&'"') {
                let mut k = j + 1;
                while k < quotes.len() && quotes[k].is_whitespace() {
                    k += 1;
                }
                if quotes.get(k) == Some(&':') {
                    unquoted.extend(&quotes[i + 1..j]);
                    unquoted.push(':');
                    i = k + 1;
                    continue;
                }
            }
        }
        unquoted.push(quotes[i]);
        i += 1;
    }

    let compact: Vec<char> = unquoted.chars().filter(|c| !c.is_whitespace()).collect();
    let mut out = String::with_capacity(compact.len());
    for (index, c) in compact.iter().enumerate() {
        if *c == ',' && matches!(compact.get(index + 1), Some(']') | Some('}') | Some(')')) {
            continue;
        }
        out.push(*c);
    }
    out
}

#[derive(Default)]
struct Diagnostic {
    file: String,
    name: Option<String>,
    errors: Vec<String>,
    warnings: Vec<String>,
    annotations: Vec<(Level, String, Option<u32>)>,
}

impl Diagnostic {
    fn to_json(&self) -> Value {
        let annotations: Vec<Value> = self
            .annotations
            .iter()
            .map(|(level, message, line)| {
                let mut object = Map::new();
                object.insert(
                    "level".into(),
                    json!(if *level == Level::Error {
                        "error"
                    } else {
                        "warning"
                    }),
                );
                object.insert("message".into(), json!(message));
                if let Some(line) = line {
                    object.insert("line".into(), json!(line));
                }
                Value::Object(object)
            })
            .collect();
        let mut object = Map::new();
        object.insert("file".into(), json!(self.file));
        object.insert("errors".into(), json!(self.errors));
        object.insert("warnings".into(), json!(self.warnings));
        object.insert("annotations".into(), Value::Array(annotations));
        if let Some(name) = &self.name {
            object.insert("name".into(), json!(name));
        }
        Value::Object(object)
    }
}

fn escape_annotation(value: &str) -> String {
    value
        .replace('%', "%25")
        .replace('\r', "%0D")
        .replace('\n', "%0A")
}

/// Runs `check`. `Err` hands the command to Node; `Ok` is the exit code.
pub fn run(root: &Path, options: &CheckOptions, logger: &Logger) -> Result<u8, Fallback> {
    let (config, notes, _file) = load_config(root, &options.config)?;
    if !notes.is_empty() {
        return Err(Fallback(format!("config not static: {}", notes[0])));
    }
    if config.lazy != dialex_syntax::Lazy::Off {
        return Err(Fallback("lazy loading".into()));
    }

    let files = scan_files(root, &config.include, &config.exclude)?;
    if files.is_empty() {
        if options.json {
            let empty = json!({
                "success": true,
                "diagnostics": [],
                "totalIssues": 0,
                "totalWarnings": 0,
                "fixed": 0,
            });
            println!("{}", serde_json::to_string_pretty(&empty).unwrap());
        } else {
            logger.warn(&format!(
                "No dictionary files found matching \"{}\".",
                config.include.join(", ")
            ));
        }
        return Ok(0);
    }

    // Generated files that exist but no longer match
    let rendered = render(
        root,
        &Options {
            output: None,
            config: options.config.clone(),
        },
    )?;
    let mut stale: Vec<(String, String)> = Vec::new();
    let mut targets: Vec<(&PathBuf, &Option<String>)> = Vec::new();
    let content = Some(rendered.content.clone());
    targets.push((&rendered.output_path, &content));
    targets.push((&rendered.dts_path, &rendered.dts_content));
    for (file, expected) in targets {
        let Some(expected) = expected else { continue };
        if !file.exists() {
            continue;
        }
        let actual = fs::read_to_string(file).unwrap_or_default();
        // Identical text needs no normalizing, which is the common case and a large file
        if actual == *expected || normalize_generated(&actual) == normalize_generated(expected) {
            continue;
        }
        stale.push((
            relative(root, file),
            "Out of date with your dictionaries or config. Run `dx generate` (or `dx check --fix`)."
                .to_string(),
        ));
    }

    let analysis = analyze_project(
        root,
        &AnalysisConfig {
            default_locale: config.default_locale.clone(),
            locales: config.locales.clone(),
            include: config.include.clone(),
            exclude: config.exclude.clone(),
        },
        &AnalysisOptions {
            src: options.src.as_deref().filter(|s| !s.is_empty()),
            ..AnalysisOptions::default()
        },
    )?;

    // Group issues per file, in the order they were found
    let dictionary_files: std::collections::HashSet<&PathBuf> = analysis.files.iter().collect();
    let mut diagnostics: Vec<Diagnostic> = Vec::new();
    let mut index_of: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut relative_cache: std::collections::HashMap<PathBuf, String> =
        std::collections::HashMap::new();
    for mut issue in analysis.issues {
        if options.fail_on_stale && issue.code == "stale-translation" {
            issue.level = Level::Error;
        }
        if issue.level == Level::Info {
            continue;
        }
        let rel = relative_cache
            .entry(issue.file.clone())
            .or_insert_with(|| relative(root, &issue.file))
            .clone();
        let index = match index_of.get(&rel) {
            Some(index) => *index,
            None => {
                diagnostics.push(Diagnostic {
                    file: rel.clone(),
                    ..Default::default()
                });
                index_of.insert(rel.clone(), diagnostics.len() - 1);
                diagnostics.len() - 1
            }
        };
        let diag = &mut diagnostics[index];
        if dictionary_files.contains(&issue.file) && diag.name.is_none() {
            if let Some(name) = &issue.dictionary {
                diag.name = Some(name.clone());
            }
        }
        match issue.level {
            Level::Error => diag.errors.push(issue.message.clone()),
            Level::Warning => diag.warnings.push(issue.message.clone()),
            Level::Info => continue,
        }
        diag.annotations.push((
            issue.level,
            issue.message.clone(),
            issue.line().map(|l| l + 1),
        ));
    }
    for (file, message) in stale {
        let index = match index_of.get(&file) {
            Some(index) => *index,
            None => {
                diagnostics.push(Diagnostic {
                    file: file.clone(),
                    ..Default::default()
                });
                index_of.insert(file.clone(), diagnostics.len() - 1);
                diagnostics.len() - 1
            }
        };
        diagnostics[index].errors.push(message.clone());
        diagnostics[index]
            .annotations
            .push((Level::Error, message, None));
    }

    let total_issues: usize = diagnostics.iter().map(|d| d.errors.len()).sum();
    let total_warnings: usize = diagnostics.iter().map(|d| d.warnings.len()).sum();
    let reported: Vec<&Diagnostic> = diagnostics
        .iter()
        .filter(|d| !d.errors.is_empty() || !d.warnings.is_empty())
        .collect();

    if options.github {
        for d in &reported {
            for (level, message, line) in &d.annotations {
                let location = match line {
                    Some(line) => format!("file={},line={line}", d.file),
                    None => format!("file={}", d.file),
                };
                let level = if *level == Level::Error {
                    "error"
                } else {
                    "warning"
                };
                println!(
                    "::{level} {location},title=dialex::{}",
                    escape_annotation(message)
                );
            }
        }
    }

    if options.json {
        let result = json!({
            "success": total_issues == 0,
            "diagnostics": reported.iter().map(|d| d.to_json()).collect::<Vec<_>>(),
            "totalIssues": total_issues,
            "totalWarnings": total_warnings,
            "fixed": 0,
        });
        println!("{}", serde_json::to_string_pretty(&result).unwrap());
    } else if !reported.is_empty() {
        // One write for the report: the output can run to thousands of lines
        let mut out = String::from("\n");
        if total_issues > 0 {
            {
                use std::io::Write;
                let _ = std::io::stdout().flush();
            }
            let with_errors = reported.iter().filter(|d| !d.errors.is_empty()).count();
            // the blank line before it is part of the same report, written first
            print!("{out}");
            out.clear();
            logger.error(&format!(
                "Found {total_issues} issue{} across {with_errors} file{}:",
                if total_issues == 1 { "" } else { "s" },
                if reported.len() == 1 { "" } else { "s" },
            ));
        }
        out.push('\n');
        for d in &reported {
            let name = d
                .name
                .as_ref()
                .map(|n| logger.dim(&format!("({n})")))
                .unwrap_or_default();
            out.push_str(&format!(
                "  {} {name}:\n",
                logger.underline(&logger.bold(&d.file))
            ));
            for (level, message, line) in &d.annotations {
                let where_ = line
                    .map(|l| logger.dim(&format!(":{l}")))
                    .unwrap_or_default();
                let mark = if *level == Level::Error {
                    logger.red("✖")
                } else {
                    logger.yellow("⚠")
                };
                out.push_str(&format!("    {mark} {message}{where_}\n"));
            }
            out.push('\n');
        }
        use std::io::Write;
        let mut stdout = std::io::stdout().lock();
        let _ = stdout.write_all(out.as_bytes());
        let _ = stdout.flush();
    }

    if total_issues > 0 {
        return Ok(1);
    }
    if !options.json {
        let note = if total_warnings > 0 {
            format!(
                " ({total_warnings} warning{})",
                if total_warnings == 1 { "" } else { "s" }
            )
        } else {
            String::new()
        };
        logger.success(&format!(
            "All {} dictionary file{} passed checks with 0 issues{note}!",
            files.len(),
            if files.len() == 1 { "" } else { "s" },
        ));
    }
    Ok(0)
}
