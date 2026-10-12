//! Project analysis (a port of `analyzeProject` in `analysis.ts`).
//!
//! With `runtime: true` (what `dialex check` does) a dictionary the syntax tree cannot describe
//! needs the project's code to be run, so the analysis hands over to Node. With `runtime: false`
//! (the editor) such a dictionary is reported as not analyzable instead.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::{Mutex, OnceLock};

use dialex_syntax::{Dictionary, LeafKind, LintLevel, ParseError};
use rayon::prelude::*;

use crate::generate::Fallback;
use crate::icu_check::{check_icu, LocaleStrings};
use crate::lockfile::{read_lock, Lockfile};
use crate::refs::{scan_text, tokens, RefKind, Reference};
use crate::scan::{scan, Kind};
use crate::sources::{settled, stamp_of, Loaded, Stamp};

pub const TODO_PREFIX: &str = "[TODO] ";
pub const DEFAULT_SOURCE_GLOB: &str = "**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Error,
    Warning,
    Info,
}

/// A zero-based line and UTF-16 column, as editors count.
pub type Position = (u32, u32);

#[derive(Debug, Clone, PartialEq)]
pub struct Range {
    pub start: Position,
    pub end: Position,
}

#[derive(Debug, Clone)]
pub struct Issue {
    pub file: PathBuf,
    pub level: Level,
    pub code: &'static str,
    pub message: String,
    pub range: Option<Range>,
    pub dictionary: Option<String>,
    pub locale: Option<String>,
    pub path: Option<Vec<String>>,
    /// For `missing-key`: a locale that has the key, to copy it from.
    pub source_locale: Option<String>,
}

impl Issue {
    /// Zero-based line of the start of the range.
    pub fn line(&self) -> Option<u32> {
        self.range.as_ref().map(|r| r.start.0)
    }
}

pub struct AnalysisConfig {
    pub default_locale: String,
    pub locales: Vec<String>,
    pub include: Vec<String>,
    pub exclude: Vec<String>,
    /// `lint.rules`: `Off` drops an issue, `Warn` and `Error` set its level.
    pub lint: Vec<(String, LintLevel)>,
}

pub struct AnalysisOptions<'a> {
    pub runtime: bool,
    /// Report possibly unused keys and dictionaries.
    pub unused: bool,
    /// Report translations whose source text changed (`dialex.lock.json`).
    pub lock: bool,
    /// Globs to scan for references; `None` is the default set, an empty list skips scanning.
    pub src: Option<&'a [String]>,
    /// More ignore globs, relative to the root (nested projects).
    pub ignore: &'a [String],
}

impl Default for AnalysisOptions<'_> {
    fn default() -> Self {
        AnalysisOptions {
            runtime: true,
            unused: true,
            lock: true,
            src: None,
            ignore: &[],
        }
    }
}

pub struct LeafInfo {
    pub kind: LeafKind,
    pub value: Option<String>,
}

/// One dictionary file that could be read from its syntax tree.
pub struct AnalyzedDictionary {
    pub name: String,
    pub file: PathBuf,
    pub loaded: Arc<Loaded>,
    /// Locales in source order, duplicates included.
    pub locales: Vec<String>,
    /// `locale -> [(dotted path, leaf)]`, a repeated path keeping its first position.
    pub leaves: Vec<(String, Vec<(String, LeafInfo)>)>,
    /// Union of dotted leaf paths across locales, in order of first appearance.
    pub paths: Vec<String>,
}

pub struct Analysis {
    pub issues: Vec<Issue>,
    pub dictionaries: Vec<Arc<AnalyzedDictionary>>,
    pub files: Vec<PathBuf>,
}

/// Zero-based line and UTF-16 column of a byte offset.
pub fn position_at(text: &str, offset: usize) -> Position {
    let offset = offset.min(text.len());
    let before = &text[..offset];
    let line = before.bytes().filter(|&b| b == b'\n').count() as u32;
    let line_start = before.rfind('\n').map(|i| i + 1).unwrap_or(0);
    let column = text[line_start..offset].encode_utf16().count() as u32;
    (line, column)
}

fn range_of(text: &str, span: (u32, u32)) -> Range {
    Range {
        start: position_at(text, span.0 as usize),
        end: position_at(text, span.1 as usize),
    }
}

impl AnalyzedDictionary {
    pub fn text(&self) -> &str {
        &self.loaded.text
    }

    pub fn dictionary(&self) -> &Dictionary {
        self.loaded
            .parsed
            .as_ref()
            .ok()
            .and_then(|d| d.as_ref())
            .expect("parsed dictionary")
    }

    pub fn leaves_of(&self, locale: &str) -> Option<&Vec<(String, LeafInfo)>> {
        self.leaves
            .iter()
            .find(|(l, _)| l == locale)
            .map(|(_, entries)| entries)
    }

    pub fn has(&self, locale: &str, path: &str) -> bool {
        self.leaves_of(locale)
            .is_some_and(|e| e.iter().any(|(p, _)| p == path))
    }

    pub fn get(&self, locale: &str, path: &str) -> Option<&LeafInfo> {
        self.leaves_of(locale)?
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, leaf)| leaf)
    }

    /// `locationOf(df, locale)`: the key of the first locale of that name.
    pub fn locale_range(&self, locale: &str) -> Option<Range> {
        let found = self.dictionary().locale(locale)?;
        Some(range_of(self.text(), found.key_span))
    }

    /// `locationOf(df, locale, path)`: the key at that path, by segments (leaves and groups).
    pub fn key_range(&self, locale: &str, path: &[String]) -> Option<Range> {
        let property = dialex_syntax::property_at(self.dictionary(), locale, path)?;
        Some(range_of(self.text(), property.key_span))
    }

    /// `dictionaryLocation(df)`: the object whose keys are locales.
    pub fn dictionary_range(&self) -> Range {
        range_of(self.text(), self.dictionary().locales_span)
    }

    /// The source of a leaf's value (a function's code, or a string with its quotes).
    pub fn leaf_source(&self, locale: &str, path: &[String]) -> Option<String> {
        use dialex_syntax::Value;
        let property = dialex_syntax::property_at(self.dictionary(), locale, path)?;
        let text = self.text();
        match &property.value {
            Value::Leaf { span, kind, .. } => {
                let whole = &text[property.span.0 as usize..property.span.1 as usize];
                let method = *kind == LeafKind::Function
                    && whole
                        .trim_start()
                        .starts_with(&format!("{}(", path.last()?));
                if method {
                    Some(whole.to_string())
                } else {
                    Some(text[span.0 as usize..span.1 as usize].to_string())
                }
            }
            Value::Object(_) => None,
        }
    }
}

fn build(file: &Path, loaded: Arc<Loaded>) -> Option<AnalyzedDictionary> {
    let dictionary = loaded.parsed.as_ref().ok()?.as_ref()?;
    // Anything the syntax tree cannot fully describe needs the runtime
    if !dictionary.complete {
        return None;
    }
    let name = dictionary.name.clone().filter(|n| !n.is_empty())?;
    let locales = dictionary.locale_names();

    let mut leaves: Vec<(String, Vec<(String, LeafInfo)>)> = Vec::new();
    for locale in &locales {
        let mut entries: Vec<(String, LeafInfo)> = Vec::new();
        if let Some(found) = dictionary.locale(locale) {
            for leaf in &found.leaves {
                let key = leaf.path.join(".");
                let info = LeafInfo {
                    kind: leaf.kind,
                    value: leaf.value.clone(),
                };
                match entries.iter_mut().find(|(path, _)| *path == key) {
                    Some(existing) => existing.1 = info,
                    None => entries.push((key, info)),
                }
            }
        }
        match leaves.iter_mut().find(|(l, _)| l == locale) {
            Some(existing) => existing.1 = entries,
            None => leaves.push((locale.clone(), entries)),
        }
    }

    let mut paths: Vec<String> = Vec::new();
    for locale in &locales {
        let entries = &leaves.iter().find(|(l, _)| l == locale).unwrap().1;
        for (path, _) in entries {
            if !paths.contains(path) {
                paths.push(path.clone());
            }
        }
    }
    Some(AnalyzedDictionary {
        name,
        file: file.to_path_buf(),
        loaded: loaded.clone(),
        locales,
        leaves,
        paths,
    })
}

/// Work that only depends on one file is kept between analyses (an editor runs one on each save):
/// a dictionary is rebuilt and re-checked, and a source file re-scanned, only when the file or
/// what its issues depend on changed. A one-shot command never hits these, so it pays only a lock.
struct DictionaryEntry {
    loaded: Arc<Loaded>,
    analyzed: Option<Arc<AnalyzedDictionary>>,
}

/// What the issues of one dictionary depend on besides its own content.
#[derive(PartialEq)]
struct IssueKey {
    default_locale: String,
    locales: Vec<String>,
    /// The lockfile's stamp (`None` when it is absent or not read).
    lock: Option<Stamp>,
}

struct IssueEntry {
    loaded: Arc<Loaded>,
    key: IssueKey,
    issues: Vec<Issue>,
}

struct FileScan {
    tokens: Vec<String>,
    refs: Vec<(Reference, Range)>,
    /// Dictionary names registered inline with `dictionaries: { name: ... }`.
    inline: Vec<String>,
}

#[derive(Default)]
struct Caches {
    dictionaries: HashMap<PathBuf, DictionaryEntry>,
    issues: HashMap<PathBuf, IssueEntry>,
    sources: HashMap<PathBuf, (Stamp, Arc<FileScan>)>,
}

fn caches() -> &'static Mutex<Caches> {
    static CACHES: OnceLock<Mutex<Caches>> = OnceLock::new();
    CACHES.get_or_init(Default::default)
}

fn build_cached(file: &Path, loaded: &Arc<Loaded>) -> Option<Arc<AnalyzedDictionary>> {
    let mut caches = caches().lock().unwrap();
    if let Some(entry) = caches.dictionaries.get(file) {
        if Arc::ptr_eq(&entry.loaded, loaded) {
            return entry.analyzed.clone();
        }
    }
    let analyzed = build(file, loaded.clone()).map(Arc::new);
    caches.dictionaries.insert(
        file.to_path_buf(),
        DictionaryEntry {
            loaded: loaded.clone(),
            analyzed: analyzed.clone(),
        },
    );
    analyzed
}

fn issues_cached(
    d: &AnalyzedDictionary,
    config: &AnalysisConfig,
    lock: Option<&Lockfile>,
    lock_stamp: Option<Stamp>,
) -> Result<Vec<Issue>, Fallback> {
    let key = IssueKey {
        default_locale: config.default_locale.clone(),
        locales: config.locales.clone(),
        lock: if lock.is_some() { lock_stamp } else { None },
    };
    {
        let caches = caches().lock().unwrap();
        if let Some(entry) = caches.issues.get(&d.file) {
            if Arc::ptr_eq(&entry.loaded, &d.loaded) && entry.key == key {
                return Ok(entry.issues.clone());
            }
        }
    }
    let issues = dictionary_issues(d, config, lock)?;
    caches().lock().unwrap().issues.insert(
        d.file.clone(),
        IssueEntry {
            loaded: d.loaded.clone(),
            key,
            issues: issues.clone(),
        },
    );
    Ok(issues)
}

fn plain(file: &Path, level: Level, code: &'static str, message: String) -> Issue {
    Issue {
        file: file.to_path_buf(),
        level,
        code,
        message,
        range: None,
        dictionary: None,
        locale: None,
        path: None,
        source_locale: None,
    }
}

pub fn analyze_project(
    root: &Path,
    config: &AnalysisConfig,
    options: &AnalysisOptions,
) -> Result<Analysis, Fallback> {
    let mut exclude = config.exclude.clone();
    exclude.extend(options.ignore.iter().cloned());
    let files = scan(root, &config.include, &exclude, Kind::Dictionary)?;
    let lock = if options.lock { read_lock(root) } else { None };

    let mut issues: Vec<Issue> = Vec::new();
    let lock_stamp = if options.lock {
        stamp_of(&root.join("dialex.lock.json"))
    } else {
        None
    };
    let mut data: Vec<Arc<AnalyzedDictionary>> = Vec::with_capacity(files.len());
    // dictionary files in the order of `files`; unreadable ones yield issues instead
    for (file, loaded) in files.iter().zip(crate::sources::load_dictionaries(&files)) {
        let loaded = loaded.map_err(Fallback)?;
        match &loaded.parsed {
            Ok(Some(_)) => match build_cached(file, &loaded) {
                Some(dictionary) => data.push(dictionary),
                None => {
                    if options.runtime {
                        return Err(Fallback(format!("{} needs the runtime", file.display())));
                    }
                    issues.push(plain(file, Level::Info, "unanalyzable",
                        "This dictionary uses spreads, computed keys, imported values, or a computed name, so it cannot be analyzed statically.".into()));
                }
            },
            Ok(None) => {
                if options.runtime {
                    return Err(Fallback(format!(
                        "{} has no editable shape",
                        file.display()
                    )));
                }
                issues.push(plain(file, Level::Info, "unanalyzable",
                    "This dictionary uses spreads, computed keys, imported values, or a computed name, so it cannot be analyzed statically.".into()));
            }
            Err(ParseError::Syntax(message)) => {
                if options.runtime {
                    return Err(Fallback(format!("syntax error: {message}")));
                }
                for line in format!("Failed to parse dictionary: {message}").split('\n') {
                    issues.push(plain(
                        file,
                        Level::Error,
                        "invalid-dictionary",
                        line.to_string(),
                    ));
                }
            }
            Err(ParseError::Unsupported(message)) => return Err(Fallback(message.clone())),
        }
    }

    // Dictionary issues are independent, so they are found in parallel and joined in order
    let per_dictionary: Vec<Result<Vec<Issue>, Fallback>> = data
        .par_iter()
        .map(|d| issues_cached(d, config, lock.as_ref(), lock_stamp))
        .collect();
    // keep the file order of the issues found while loading, then the dictionary ones
    let mut ordered: Vec<Issue> = Vec::new();
    {
        let analyzed: std::collections::HashSet<&PathBuf> = data.iter().map(|d| &d.file).collect();
        let mut loading = issues.into_iter().peekable();
        let mut per = per_dictionary.into_iter();
        for file in &files {
            while loading.peek().is_some_and(|i| i.file == *file) {
                ordered.push(loading.next().unwrap());
            }
            if analyzed.contains(file) {
                if let Some(result) = per.next() {
                    ordered.extend(result?);
                }
            }
        }
        ordered.extend(loading);
    }
    issues = ordered;

    source_issues(root, config, options, &files, &data, &exclude, &mut issues)?;

    if !config.lint.is_empty() {
        issues.retain_mut(
            |issue| match config.lint.iter().find(|(code, _)| *code == issue.code) {
                Some((_, LintLevel::Off)) => false,
                Some((_, LintLevel::Warn)) => {
                    issue.level = Level::Warning;
                    true
                }
                Some((_, LintLevel::Error)) => {
                    issue.level = Level::Error;
                    true
                }
                None => true,
            },
        );
    }

    Ok(Analysis {
        issues,
        dictionaries: data,
        files,
    })
}

fn dictionary_issues(
    d: &AnalyzedDictionary,
    config: &AnalysisConfig,
    lock: Option<&Lockfile>,
) -> Result<Vec<Issue>, Fallback> {
    let default_locale = &config.default_locale;
    let mut issues: Vec<Issue> = Vec::new();
    let mut add = |level: Level,
                   code: &'static str,
                   message: String,
                   range: Option<Range>,
                   locale: Option<&str>,
                   path: Option<Vec<String>>,
                   source_locale: Option<String>| {
        issues.push(Issue {
            file: d.file.clone(),
            level,
            code,
            message,
            range,
            dictionary: Some(d.name.clone()),
            locale: locale.map(String::from),
            path,
            source_locale,
        });
    };
    let split = |path: &str| -> Vec<String> { path.split('.').map(String::from).collect() };

    for required in &config.locales {
        if !d.locales.contains(required) {
            add(
                Level::Error,
                "missing-locale",
                format!("Missing configured locale \"{required}\""),
                Some(d.dictionary_range()),
                Some(required),
                None,
                None,
            );
        }
    }

    for locale in &d.locales {
        for path in &d.paths {
            if d.has(locale, path) {
                continue;
            }
            // a locale that has the key, the default locale first
            let source_locale = std::iter::once(default_locale)
                .chain(d.locales.iter())
                .find(|l| *l != locale && d.has(l, path))
                .cloned();
            add(
                Level::Error,
                "missing-key",
                format!("Locale \"{locale}\" is missing key \"{path}\""),
                d.locale_range(locale),
                Some(locale),
                Some(split(path)),
                source_locale,
            );
        }
    }

    let mut strings: LocaleStrings = Vec::new();
    for locale in &d.locales {
        let mut entries: Vec<(String, String)> = Vec::new();
        for (path, leaf) in d.leaves_of(locale).into_iter().flatten() {
            let Some(value) = leaf
                .value
                .as_ref()
                .filter(|_| leaf.kind == LeafKind::String)
            else {
                continue;
            };
            entries.push((path.clone(), value.clone()));
            if value.starts_with(TODO_PREFIX) {
                let segments = split(path);
                add(
                    Level::Warning,
                    "todo-placeholder",
                    format!(
                        "Locale \"{locale}\" key \"{path}\" still has a {} placeholder",
                        TODO_PREFIX.trim()
                    ),
                    d.key_range(locale, &segments),
                    Some(locale),
                    Some(segments),
                    None,
                );
            }
        }
        match strings.iter_mut().find(|(l, _)| l == locale) {
            Some(existing) => existing.1 = entries,
            None => strings.push((locale.clone(), entries)),
        }
    }

    // Translations made from source text that has changed since (dialex.lock.json)
    if let Some(lock) = lock {
        if let Some(source_locale) = &lock.source_locale {
            if d.leaves_of(source_locale).is_some() {
                for locale in &d.locales {
                    if locale == source_locale {
                        continue;
                    }
                    for (path, leaf) in d.leaves_of(locale).into_iter().flatten() {
                        let Some(value) = leaf
                            .value
                            .as_ref()
                            .filter(|_| leaf.kind == LeafKind::String)
                        else {
                            continue;
                        };
                        if value.starts_with(TODO_PREFIX) {
                            continue;
                        }
                        let Some(source) = d.get(source_locale, path) else {
                            continue;
                        };
                        let Some(source_text) = source
                            .value
                            .as_ref()
                            .filter(|_| source.kind == LeafKind::String)
                        else {
                            continue;
                        };
                        if !lock.is_stale(locale, &format!("{}.{path}", d.name), source_text) {
                            continue;
                        }
                        let segments = split(path);
                        add(
                            Level::Warning,
                            "stale-translation",
                            format!(
                                "Locale \"{locale}\" key \"{path}\" is out of date: the \"{source_locale}\" text changed after it was translated"
                            ),
                            d.key_range(locale, &segments),
                            Some(locale),
                            Some(segments),
                            Some(source_locale.clone()),
                        );
                    }
                }
            }
        }
    }

    let findings = check_icu(&d.name, &strings, default_locale)
        .ok_or_else(|| Fallback("locale tag needs Intl".into()))?;
    for finding in findings {
        let segments = split(&finding.key[d.name.len() + 1..]);
        add(
            if finding.error {
                Level::Error
            } else {
                Level::Warning
            },
            finding.code,
            finding.message,
            d.key_range(&finding.locale, &segments),
            Some(&finding.locale),
            Some(segments),
            None,
        );
    }
    Ok(issues)
}

fn source_issues(
    root: &Path,
    config: &AnalysisConfig,
    options: &AnalysisOptions,
    files: &[PathBuf],
    data: &[Arc<AnalyzedDictionary>],
    exclude: &[String],
    issues: &mut Vec<Issue>,
) -> Result<(), Fallback> {
    let globs: Vec<String> = match options.src {
        Some(globs) => globs.to_vec(),
        None => vec![DEFAULT_SOURCE_GLOB.to_string()],
    };
    let _ = config;
    let dictionary_files: std::collections::HashSet<&PathBuf> = files.iter().collect();
    let source_files: Vec<PathBuf> = if globs.is_empty() {
        Vec::new()
    } else {
        scan(root, &globs, exclude, Kind::Source)?
            .into_iter()
            .filter(|f| !dictionary_files.contains(f))
            .collect()
    };
    if source_files.is_empty() {
        return Ok(());
    }

    let known: HashMap<&str, &AnalyzedDictionary> =
        data.iter().map(|d| (d.name.as_str(), &**d)).collect();

    struct Scanned {
        file: PathBuf,
        scan: Arc<FileScan>,
    }
    let scanned: Vec<Option<Scanned>> = source_files
        .par_iter()
        .map(|file| {
            let stamp = stamp_of(file)?;
            if let Some((seen, scan)) = caches().lock().unwrap().sources.get(file) {
                if *seen == stamp && settled(&Some(stamp)) {
                    return Some(Scanned {
                        file: file.clone(),
                        scan: scan.clone(),
                    });
                }
            }
            let bytes = fs::read(file).ok()?;
            let text = String::from_utf8_lossy(&bytes);
            let found = scan_text(&text);
            let refs = found
                .references
                .into_iter()
                .map(|r| {
                    let range = range_of(&text, (r.start as u32, r.end as u32));
                    (r, range)
                })
                .collect();
            let scan = Arc::new(FileScan {
                tokens: tokens(&text).into_iter().map(String::from).collect(),
                refs,
                inline: found.inline,
            });
            caches()
                .lock()
                .unwrap()
                .sources
                .insert(file.clone(), (stamp, scan.clone()));
            Some(Scanned {
                file: file.clone(),
                scan,
            })
        })
        .collect();

    let scanned: Vec<Scanned> = scanned.into_iter().flatten().collect();
    // borrowed from the (shared) scans: the union is built on every analysis
    let mut all_tokens: std::collections::HashSet<&str> = std::collections::HashSet::new();
    for scanned in &scanned {
        all_tokens.extend(scanned.scan.tokens.iter().map(String::as_str));
    }
    // dictionaries registered in code are known project-wide, wherever they are read
    let inline: std::collections::HashSet<&str> = scanned
        .iter()
        .flat_map(|s| s.scan.inline.iter().map(String::as_str))
        .collect();
    for scanned in &scanned {
        let Scanned { file, scan } = scanned;
        for (reference, range) in &scan.refs {
            let (reference, range) = (reference.clone(), range.clone());
            if reference.kind == RefKind::Dictionary {
                if !known.contains_key(reference.value.as_str())
                    && !inline.contains(reference.value.as_str())
                {
                    let mut issue = plain(
                        file,
                        Level::Error,
                        "unknown-dictionary",
                        format!("Unknown dictionary \"{}\"", reference.value),
                    );
                    issue.range = Some(range);
                    issue.dictionary = Some(reference.value.clone());
                    issues.push(issue);
                }
                continue;
            }
            let mut parts = reference.value.split('.');
            let name = parts.next().unwrap_or("");
            let rest: Vec<String> = parts.map(String::from).collect();
            let Some(dictionary) = known.get(name) else {
                continue;
            };
            let key_path = rest.join(".");
            let prefix = format!("{key_path}.");
            let exists = dictionary
                .paths
                .iter()
                .any(|p| *p == key_path || p.starts_with(&prefix));
            if !exists {
                let mut issue = plain(
                    file,
                    Level::Error,
                    "unknown-path",
                    format!("Unknown translation path \"{}\"", reference.value),
                );
                issue.range = Some(range);
                issue.dictionary = Some(name.to_string());
                issue.path = Some(rest);
                issues.push(issue);
            }
        }
    }

    if options.unused {
        for d in data {
            if !all_tokens.contains(d.name.as_str()) {
                let mut issue = plain(
                    &d.file,
                    Level::Warning,
                    "unused-dictionary",
                    format!("Dictionary \"{}\" is never referenced", d.name),
                );
                issue.range = Some(d.dictionary_range());
                issue.dictionary = Some(d.name.clone());
                issues.push(issue);
                continue;
            }
            for path in &d.paths {
                let last = path.rsplit('.').next().unwrap_or(path);
                if all_tokens.contains(last) {
                    continue;
                }
                let holder = d.locales.iter().find(|l| d.has(l, path));
                let segments: Vec<String> = path.split('.').map(String::from).collect();
                let mut issue = plain(
                    &d.file,
                    Level::Warning,
                    "unused-key",
                    format!("Key \"{path}\" is possibly unused"),
                );
                issue.range = holder.and_then(|l| d.key_range(l, &segments));
                issue.dictionary = Some(d.name.clone());
                issue.path = Some(segments);
                issues.push(issue);
            }
        }
    }
    Ok(())
}
