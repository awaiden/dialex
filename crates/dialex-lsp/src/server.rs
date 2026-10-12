//! The LSP loop (a port of `server.ts`): one thread, whole-file analysis from disk, debounced
//! refreshes, and the same request/response shapes as the Node server.

use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

use crossbeam_channel::RecvTimeoutError;
use dialex_cli::analysis::{analyze_project, AnalysisConfig, AnalysisOptions, Issue, Level, Range};
use dialex_cli::generate::{load_config_lenient, render, write, Options};
use dialex_cli::scan::forget_walks;
use lsp_server::{Connection, ErrorCode, Message, Notification, Request, RequestId, Response};
use serde_json::{json, Value};
use url::Url;

use crate::features::{
    add_missing_keys, add_unknown_key, build_hover, completion_context_at, completion_entries,
    definition_for, find_bindings, find_reference_at, project_for_file, CompletionContext,
    EntryKind, MissingKey, Project,
};
use crate::projects::{discover_projects, ProjectRoot};
use crate::text::{end_position, line_text, offset_at};

/// What the client can configure under the `dialex` section.
#[derive(Clone)]
pub struct Settings {
    pub enable: bool,
    pub unused_keys: bool,
    pub auto_generate: bool,
    pub config_path: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            enable: true,
            unused_keys: false,
            auto_generate: true,
            config_path: None,
        }
    }
}

const WATCHED_GLOBS: [&str; 4] = [
    "**/*.content.ts",
    "**/dialex.config.*",
    "**/i18n.config.*",
    "**/.gitignore",
];

const REFRESH_DELAY: Duration = Duration::from_millis(300);
const GENERATE_DELAY: Duration = Duration::from_millis(250);
const POLL_EVERY: Duration = Duration::from_millis(1000);

fn uri_to_path(uri: &str) -> Option<PathBuf> {
    Url::parse(uri).ok()?.to_file_path().ok()
}

fn path_to_uri(path: &Path) -> String {
    Url::from_file_path(path)
        .map(|u| u.to_string())
        .unwrap_or_default()
}

struct Server {
    connection: Connection,
    folders: Vec<PathBuf>,
    can_configure: bool,
    client_watches: bool,
    settings: Settings,
    documents: HashMap<String, String>,
    projects: Vec<Project>,
    layout: HashMap<PathBuf, Vec<ProjectRoot>>,
    /// Files may have appeared or gone since the tree was last walked.
    layout_dirty: bool,
    /// What each file's diagnostics were when last sent, so only changes are sent again.
    published: HashMap<String, Vec<Value>>,
    refresh_at: Option<Instant>,
    generate_at: Option<Instant>,
    next_poll: Instant,
    /// Modification times of the watched files, when the server watches the disk itself.
    watch_state: Option<u64>,
    next_id: i32,
    pending_config: Option<RequestId>,
}

pub fn run() -> Result<(), Box<dyn std::error::Error + Sync + Send>> {
    let (connection, io_threads) = Connection::stdio();
    let (id, params) = connection.initialize_start()?;
    let mut server = Server::new(connection);
    let result = server.initialize(&params);
    server.connection.initialize_finish(id, result)?;
    server.on_initialized();
    server.main_loop()?;
    drop(server);
    io_threads.join()?;
    Ok(())
}

impl Server {
    fn new(connection: Connection) -> Self {
        Server {
            connection,
            folders: Vec::new(),
            can_configure: false,
            client_watches: false,
            settings: Settings::default(),
            documents: HashMap::new(),
            projects: Vec::new(),
            layout: HashMap::new(),
            layout_dirty: true,
            published: HashMap::new(),
            refresh_at: None,
            generate_at: None,
            next_poll: Instant::now() + POLL_EVERY,
            watch_state: None,
            next_id: 1,
            pending_config: None,
        }
    }

    fn initialize(&mut self, params: &Value) -> Value {
        self.folders = params["workspaceFolders"]
            .as_array()
            .map(|list| {
                list.iter()
                    .filter_map(|f| f["uri"].as_str().and_then(uri_to_path))
                    .collect()
            })
            .unwrap_or_default();
        if self.folders.is_empty() {
            if let Some(root) = params["rootUri"].as_str().and_then(uri_to_path) {
                self.folders = vec![root];
            }
        }
        let workspace = &params["capabilities"]["workspace"];
        self.can_configure = workspace["configuration"] == json!(true);
        self.client_watches =
            workspace["didChangeWatchedFiles"]["dynamicRegistration"] == json!(true);

        json!({
            "capabilities": {
                "textDocumentSync": { "openClose": true, "change": 2, "save": { "includeText": false } },
                "hoverProvider": true,
                "definitionProvider": true,
                "completionProvider": { "triggerCharacters": ["\"", "'", "`", "."] },
                "codeActionProvider": { "codeActionKinds": ["quickfix"] }
            },
            "serverInfo": { "name": "dialex-language-server", "version": env!("CARGO_PKG_VERSION") }
        })
    }

    fn on_initialized(&mut self) {
        if self.client_watches {
            let watchers: Vec<Value> = WATCHED_GLOBS
                .iter()
                .map(|glob| json!({ "globPattern": glob }))
                .collect();
            self.request(
                "client/registerCapability",
                json!({ "registrations": [{
                    "id": "dialex-watch",
                    "method": "workspace/didChangeWatchedFiles",
                    "registerOptions": { "watchers": watchers }
                }] }),
            );
        }
        self.request_settings();
        self.schedule_refresh();
        self.schedule_generate();
    }

    // --- sending -----------------------------------------------------------------------------

    fn send(&self, message: Message) {
        let _ = self.connection.sender.send(message);
    }

    fn notify(&self, method: &str, params: Value) {
        self.send(Message::Notification(Notification {
            method: method.into(),
            params,
        }));
    }

    fn request(&mut self, method: &str, params: Value) -> RequestId {
        let id = RequestId::from(self.next_id);
        self.next_id += 1;
        self.send(Message::Request(Request {
            id: id.clone(),
            method: method.into(),
            params,
        }));
        id
    }

    fn log(&self, level: u8, message: String) {
        self.notify(
            "window/logMessage",
            json!({ "type": level, "message": message }),
        );
    }

    fn request_settings(&mut self) {
        if self.can_configure {
            let id = self.request(
                "workspace/configuration",
                json!({ "items": [{ "section": "dialex" }] }),
            );
            self.pending_config = Some(id);
        }
    }

    // --- main loop ---------------------------------------------------------------------------

    fn main_loop(&mut self) -> Result<(), Box<dyn std::error::Error + Sync + Send>> {
        loop {
            let now = Instant::now();
            let mut wake = self.next_poll;
            for deadline in [self.refresh_at, self.generate_at].into_iter().flatten() {
                wake = wake.min(deadline);
            }
            let timeout = wake.saturating_duration_since(now);

            match self.connection.receiver.recv_timeout(timeout) {
                Ok(Message::Request(request)) => {
                    if self.connection.handle_shutdown(&request)? {
                        return Ok(());
                    }
                    self.on_request(request);
                }
                Ok(Message::Notification(notification)) => {
                    if notification.method == "exit" {
                        return Ok(());
                    }
                    self.on_notification(notification);
                }
                Ok(Message::Response(response)) => self.on_response(response),
                Err(RecvTimeoutError::Timeout) => {}
                Err(_) => return Ok(()),
            }
            self.fire_timers();
        }
    }

    fn fire_timers(&mut self) {
        let now = Instant::now();
        if self.generate_at.is_some_and(|t| t <= now) {
            self.generate_at = None;
            self.regenerate();
        }
        if self.refresh_at.is_some_and(|t| t <= now) {
            self.refresh_at = None;
            self.refresh();
        }
        if self.next_poll <= now {
            self.next_poll = now + POLL_EVERY;
            self.poll_disk();
        }
    }

    fn schedule_refresh(&mut self) {
        self.refresh_at = Some(Instant::now() + REFRESH_DELAY);
    }

    fn schedule_generate(&mut self) {
        self.generate_at = Some(Instant::now() + GENERATE_DELAY);
    }

    // --- notifications and responses ---------------------------------------------------------

    fn on_notification(&mut self, notification: Notification) {
        let params = &notification.params;
        match notification.method.as_str() {
            "textDocument/didOpen" => {
                let doc = &params["textDocument"];
                if let (Some(uri), Some(text)) = (doc["uri"].as_str(), doc["text"].as_str()) {
                    self.documents.insert(uri.to_string(), text.to_string());
                }
            }
            "textDocument/didChange" => {
                let Some(uri) = params["textDocument"]["uri"].as_str() else {
                    return;
                };
                let Some(text) = self.documents.get_mut(uri) else {
                    return;
                };
                for change in params["contentChanges"].as_array().into_iter().flatten() {
                    let new_text = change["text"].as_str().unwrap_or("");
                    match change.get("range").filter(|r| r.is_object()) {
                        None => *text = new_text.to_string(),
                        Some(range) => {
                            let at = |p: &Value| {
                                offset_at(
                                    text,
                                    p["line"].as_u64().unwrap_or(0) as u32,
                                    p["character"].as_u64().unwrap_or(0) as u32,
                                )
                            };
                            let start = at(&range["start"]);
                            let end = at(&range["end"]).max(start);
                            text.replace_range(start..end, new_text);
                        }
                    }
                }
            }
            "textDocument/didClose" => {
                if let Some(uri) = params["textDocument"]["uri"].as_str() {
                    self.documents.remove(uri);
                }
            }
            "textDocument/didSave" => {
                self.schedule_refresh();
                self.schedule_generate();
            }
            "workspace/didChangeConfiguration" => {
                self.request_settings();
                self.schedule_refresh();
            }
            "workspace/didChangeWatchedFiles" => {
                let changes = params["changes"].as_array().cloned().unwrap_or_default();
                // An edit cannot change which projects exist; a file appearing or going can.
                if changes.iter().any(|c| c["type"] != json!(2)) {
                    self.layout.clear();
                }
                if changes
                    .iter()
                    .any(|c| c["uri"].as_str().is_some_and(|u| u.ends_with(".gitignore")))
                {
                    self.layout.clear();
                }
                self.schedule_refresh();
                self.schedule_generate();
            }
            _ => {}
        }
    }

    fn on_response(&mut self, response: Response) {
        if self.pending_config.as_ref() != Some(&response.id) {
            return;
        }
        self.pending_config = None;
        let mut settings = Settings::default();
        if let Some(value) = response.result.as_ref().and_then(|r| r.get(0)) {
            if let Some(v) = value["enable"].as_bool() {
                settings.enable = v;
            }
            if let Some(v) = value["unusedKeys"].as_bool() {
                settings.unused_keys = v;
            }
            if let Some(v) = value["autoGenerate"].as_bool() {
                settings.auto_generate = v;
            }
            if let Some(v) = value["configPath"].as_str().filter(|s| !s.is_empty()) {
                settings.config_path = Some(v.to_string());
            }
        }
        self.settings = settings;
        self.layout_dirty = true;
        self.schedule_refresh();
        self.schedule_generate();
    }

    // --- analysis ----------------------------------------------------------------------------

    fn projects_in(&mut self, folder: &Path) -> Vec<(PathBuf, Vec<String>)> {
        self.layout
            .entry(folder.to_path_buf())
            .or_insert_with(|| discover_projects(folder))
            .iter()
            .map(|p| (p.root.clone(), p.ignore.clone()))
            .collect()
    }

    /// Forgets the walked tree when files may have appeared or gone. A client that sends file
    /// events says so; without them every pass has to look again.
    fn forget_layout(&mut self) {
        if self.layout_dirty || !self.client_watches {
            forget_walks();
            self.layout_dirty = false;
        }
    }

    fn refresh(&mut self) {
        let started = Instant::now();
        self.forget_layout();
        let mut projects: Vec<Project> = Vec::new();

        if self.settings.enable {
            for folder in self.folders.clone() {
                for (root, ignore) in self.projects_in(&folder) {
                    let (config, notes) =
                        match load_config_lenient(&root, &self.settings.config_path) {
                            Ok((config, notes, _)) => (config, notes),
                            Err(error) => {
                                self.log(
                                    1,
                                    format!("[{}] config failed: {}", root.display(), error.0),
                                );
                                continue;
                            }
                        };
                    for note in notes {
                        self.log(3, format!("[{}] {note}", root.display()));
                    }
                    let analysis = analyze_project(
                        &root,
                        &AnalysisConfig {
                            default_locale: config.default_locale.clone(),
                            locales: config.locales.clone(),
                            include: config.include.clone(),
                            exclude: config.exclude.clone(),
                        },
                        &AnalysisOptions {
                            runtime: false,
                            unused: self.settings.unused_keys,
                            ignore: &ignore,
                            ..AnalysisOptions::default()
                        },
                    );
                    match analysis {
                        Ok(analysis) => projects.push(Project {
                            root,
                            default_locale: config.default_locale,
                            analysis,
                        }),
                        Err(error) => self.log(
                            1,
                            format!("[{}] analysis failed: {}", root.display(), error.0),
                        ),
                    }
                }
            }
        }
        let dictionaries: usize = projects.iter().map(|p| p.analysis.dictionaries.len()).sum();
        self.projects = projects;
        self.publish();
        self.watch_state = self.disk_signature();
        self.log(
            4,
            format!(
                "analyzed {dictionaries} dictionaries in {} ms",
                started.elapsed().as_millis()
            ),
        );
    }

    fn publish(&mut self) {
        let mut by_file: BTreeMap<PathBuf, Vec<Value>> = BTreeMap::new();
        for project in &self.projects {
            for issue in &project.analysis.issues {
                by_file
                    .entry(issue.file.clone())
                    .or_default()
                    .push(to_diagnostic(issue));
            }
        }

        let mut next: HashMap<String, Vec<Value>> = HashMap::new();
        for (file, diagnostics) in by_file {
            let uri = path_to_uri(&file);
            if self.published.get(&uri) != Some(&diagnostics) {
                self.notify(
                    "textDocument/publishDiagnostics",
                    json!({ "uri": uri, "diagnostics": diagnostics }),
                );
            }
            next.insert(uri, diagnostics);
        }
        // Files that had problems before and have none now need an explicit empty list.
        for uri in self.published.keys() {
            if !next.contains_key(uri) {
                self.notify(
                    "textDocument/publishDiagnostics",
                    json!({ "uri": uri, "diagnostics": [] }),
                );
            }
        }
        self.published = next;
    }

    /// Keeps `dialex.generated.ts` and `dialex-env.d.ts` current in the projects that already
    /// have one, reading the config from its syntax tree so no project code runs.
    fn regenerate(&mut self) {
        if !self.settings.auto_generate || !self.settings.enable {
            return;
        }
        self.forget_layout();
        for folder in self.folders.clone() {
            for (root, _) in self.projects_in(&folder) {
                let options = Options {
                    config: self.settings.config_path.clone(),
                    output: None,
                };
                let rendered = match render(&root, &options) {
                    Ok(rendered) => rendered,
                    Err(error) => {
                        self.log(
                            3,
                            format!(
                                "[{}] not regenerated by the native server ({}); run dx generate",
                                root.display(),
                                error.0
                            ),
                        );
                        continue;
                    }
                };
                // projects without a generated file do not use one
                let Ok(before) = fs::read_to_string(&rendered.output_path) else {
                    continue;
                };
                match write(&rendered) {
                    Ok(()) => {
                        if before != rendered.content {
                            let relative = rendered
                                .output_path
                                .strip_prefix(&root)
                                .unwrap_or(&rendered.output_path)
                                .display()
                                .to_string();
                            self.log(
                                3,
                                format!(
                                    "[{}] regenerated {relative} ({} dictionaries)",
                                    root.display(),
                                    rendered.files.len()
                                ),
                            );
                        }
                    }
                    Err(error) => {
                        self.log(1, format!("[{}] generate failed: {error}", root.display()))
                    }
                }
            }
        }
    }

    // --- watching the disk when the client does not ------------------------------------------

    /// A fingerprint of the files that decide the analysis, for clients that send no file events.
    fn disk_signature(&self) -> Option<u64> {
        if self.client_watches {
            return None;
        }
        let mut hash: u64 = 1469598103934665603;
        let mut mix = |value: u64| {
            hash ^= value;
            hash = hash.wrapping_mul(1099511628211);
        };
        for project in &self.projects {
            let mut files: Vec<&PathBuf> = project.analysis.files.iter().collect();
            files.sort();
            for file in files {
                if let Ok(meta) = fs::metadata(file) {
                    let seconds = meta
                        .modified()
                        .ok()
                        .and_then(|m| m.duration_since(SystemTime::UNIX_EPOCH).ok())
                        .map_or(0, |d| d.as_nanos() as u64);
                    mix(seconds);
                    mix(meta.len());
                }
            }
            for name in ["dialex.config.ts", "i18n.config.ts", "dialex.lock.json"] {
                if let Ok(meta) = fs::metadata(project.root.join(name)) {
                    mix(meta.len());
                    mix(meta
                        .modified()
                        .ok()
                        .and_then(|m| m.duration_since(SystemTime::UNIX_EPOCH).ok())
                        .map_or(0, |d| d.as_nanos() as u64));
                }
            }
        }
        Some(hash)
    }

    fn poll_disk(&mut self) {
        if self.client_watches || self.refresh_at.is_some() || self.generate_at.is_some() {
            return;
        }
        let current = self.disk_signature();
        if current.is_some() && current != self.watch_state {
            self.watch_state = current;
            self.schedule_generate();
            self.schedule_refresh();
        }
    }

    // --- requests ----------------------------------------------------------------------------

    fn on_request(&mut self, request: Request) {
        let result = match request.method.as_str() {
            "textDocument/hover" => Ok(self.hover(&request.params)),
            "textDocument/definition" => Ok(self.definition(&request.params)),
            "textDocument/completion" => Ok(self.completion(&request.params)),
            "textDocument/codeAction" => Ok(self.code_action(&request.params)),
            other => Err(format!("method not found: {other}")),
        };
        let response = match result {
            Ok(value) => Response::new_ok(request.id, value),
            Err(message) => {
                Response::new_err(request.id, ErrorCode::MethodNotFound as i32, message)
            }
        };
        self.send(Message::Response(response));
    }

    /// The project model for a file, unless the features are turned off.
    fn project_for(&self, file: &Path) -> Option<&Project> {
        if !self.settings.enable {
            return None;
        }
        project_for_file(&self.projects, file)
    }

    /// The open document, its path and the project it belongs to.
    fn context_for(&self, params: &Value) -> Option<(&str, PathBuf, &Project)> {
        let uri = params["textDocument"]["uri"].as_str()?;
        let text = self.documents.get(uri)?;
        let file = uri_to_path(uri)?;
        let project = self.project_for(&file)?;
        Some((text.as_str(), file, project))
    }

    fn hover(&self, params: &Value) -> Value {
        let Some((text, _, project)) = self.context_for(params) else {
            return Value::Null;
        };
        let line = params["position"]["line"].as_u64().unwrap_or(0) as u32;
        let character = params["position"]["character"].as_u64().unwrap_or(0) as u32;
        let found = find_reference_at(line_text(text, line), character, &find_bindings(text));
        let Some(found) = found else {
            return Value::Null;
        };
        let Some(markdown) = build_hover(project, &found) else {
            return Value::Null;
        };
        json!({
            "contents": { "kind": "markdown", "value": markdown },
            "range": {
                "start": { "line": line, "character": found.start },
                "end": { "line": line, "character": found.end }
            }
        })
    }

    fn definition(&self, params: &Value) -> Value {
        let Some((text, _, project)) = self.context_for(params) else {
            return Value::Null;
        };
        let line = params["position"]["line"].as_u64().unwrap_or(0) as u32;
        let character = params["position"]["character"].as_u64().unwrap_or(0) as u32;
        let found = find_reference_at(line_text(text, line), character, &find_bindings(text));
        let Some(target) = found.and_then(|f| definition_for(project, &f)) else {
            return Value::Null;
        };
        json!({ "uri": path_to_uri(&target.file), "range": range_json(&target.range) })
    }

    fn completion(&self, params: &Value) -> Value {
        let Some((text, _, project)) = self.context_for(params) else {
            return json!([]);
        };
        let line = params["position"]["line"].as_u64().unwrap_or(0) as u32;
        let character = params["position"]["character"].as_u64().unwrap_or(0) as u32;
        let full = line_text(text, line);
        let cut = crate::text::byte_of_column(full, character);
        let before = &full[..cut];
        let Some(context) = completion_context_at(before, &find_bindings(text)) else {
            return json!([]);
        };
        let length = match &context {
            CompletionContext::Dictionary { length, .. } => *length,
            CompletionContext::Path { length, .. } => *length,
        };
        let range = json!({
            "start": { "line": line, "character": character.saturating_sub(length) },
            "end": { "line": line, "character": character }
        });
        let items: Vec<Value> = completion_entries(project, &context)
            .into_iter()
            .map(|entry| {
                let kind = match entry.kind {
                    EntryKind::Dictionary => 9,
                    EntryKind::Group => 19,
                    EntryKind::Leaf => 1,
                };
                json!({
                    "label": entry.label,
                    "kind": kind,
                    "detail": entry.detail,
                    "filterText": entry.label,
                    "textEdit": { "range": range, "newText": entry.insert_text }
                })
            })
            .collect();
        Value::Array(items)
    }

    fn code_action(&self, params: &Value) -> Value {
        let Some(uri) = params["textDocument"]["uri"].as_str() else {
            return json!([]);
        };
        let (Some(file), Some(text)) = (uri_to_path(uri), self.documents.get(uri)) else {
            return json!([]);
        };
        if !self.settings.enable {
            return json!([]);
        }
        let project = self.project_for(&file);
        let file_name = file.to_string_lossy().into_owned();
        let mut actions: Vec<Value> = Vec::new();

        let replace_all = |text: &str, new_text: &str| -> Value {
            let (line, character) = end_position(text);
            json!({
                "range": {
                    "start": { "line": 0, "character": 0 },
                    "end": { "line": line, "character": character }
                },
                "newText": new_text
            })
        };

        for diagnostic in params["context"]["diagnostics"]
            .as_array()
            .into_iter()
            .flatten()
        {
            let data = &diagnostic["data"];
            if diagnostic["source"] != json!("dialex") || !data["path"].is_array() {
                continue;
            }
            let path: Vec<String> = data["path"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|s| s.as_str().map(String::from))
                .collect();
            let code = data["code"].as_str().unwrap_or("");

            if code == "missing-key" {
                if let Some(locale) = data["locale"].as_str() {
                    let missing = [MissingKey {
                        locale: locale.to_string(),
                        path: path.clone(),
                        source_locale: data["sourceLocale"].as_str().map(String::from),
                    }];
                    if let Some(updated) = add_missing_keys(&file_name, text, &missing) {
                        actions.push(json!({
                            "title": format!(
                                "Add \"{}\" to {locale} (marked [TODO])",
                                path.join(".")
                            ),
                            "kind": "quickfix",
                            "diagnostics": [diagnostic],
                            "isPreferred": true,
                            "edit": { "changes": { uri: [replace_all(text, &updated)] } }
                        }));
                    }
                }
            }

            if code == "unknown-path" {
                let Some(name) = data["dictionary"].as_str() else {
                    continue;
                };
                let Some(dictionary) = project.and_then(|p| p.dictionary(name)) else {
                    continue;
                };
                let dictionary_uri = path_to_uri(&dictionary.file);
                let dictionary_text = match self.documents.get(&dictionary_uri) {
                    Some(open) => open.clone(),
                    None => match fs::read_to_string(&dictionary.file) {
                        Ok(text) => text,
                        Err(_) => continue,
                    },
                };
                let dictionary_file = dictionary.file.to_string_lossy().into_owned();
                let Some(updated) = add_unknown_key(&dictionary_file, &dictionary_text, &path)
                else {
                    continue;
                };
                actions.push(json!({
                    "title": format!(
                        "Add \"{}\" to the \"{}\" dictionary",
                        path.join("."),
                        dictionary.name
                    ),
                    "kind": "quickfix",
                    "diagnostics": [diagnostic],
                    "edit": { "changes": { dictionary_uri: [replace_all(&dictionary_text, &updated)] } }
                }));
            }
        }

        // One action for every missing key in this dictionary file
        let missing: Vec<MissingKey> = self
            .projects
            .iter()
            .flat_map(|p| p.analysis.issues.iter())
            .filter(|i| i.file == file && i.code == "missing-key")
            .filter_map(|i| {
                Some(MissingKey {
                    locale: i.locale.clone()?,
                    path: i.path.clone()?,
                    source_locale: i.source_locale.clone(),
                })
            })
            .collect();
        if missing.len() > 1 {
            if let Some(updated) = add_missing_keys(&file_name, text, &missing) {
                actions.push(json!({
                    "title": format!("Add all {} missing keys (marked [TODO])", missing.len()),
                    "kind": "quickfix",
                    "edit": { "changes": { uri: [replace_all(text, &updated)] } }
                }));
            }
        }
        Value::Array(actions)
    }
}

fn range_json(range: &Range) -> Value {
    json!({
        "start": { "line": range.start.0, "character": range.start.1 },
        "end": { "line": range.end.0, "character": range.end.1 }
    })
}

fn to_diagnostic(issue: &Issue) -> Value {
    let hint = issue.code == "unused-key" || issue.code == "unused-dictionary";
    let severity = if hint {
        4
    } else {
        match issue.level {
            Level::Error => 1,
            Level::Warning => 2,
            Level::Info => 3,
        }
    };
    let range = issue.range.as_ref().map_or_else(
        || json!({ "start": { "line": 0, "character": 0 }, "end": { "line": 0, "character": 0 } }),
        range_json,
    );
    let mut data = serde_json::Map::new();
    data.insert("code".into(), json!(issue.code));
    if let Some(path) = &issue.path {
        data.insert("path".into(), json!(path));
    }
    if let Some(locale) = &issue.locale {
        data.insert("locale".into(), json!(locale));
    }
    if let Some(source) = &issue.source_locale {
        data.insert("sourceLocale".into(), json!(source));
    }
    if let Some(dictionary) = &issue.dictionary {
        data.insert("dictionary".into(), json!(dictionary));
    }
    let mut diagnostic = json!({
        "range": range,
        "message": issue.message,
        "severity": severity,
        "source": "dialex",
        "code": issue.code,
        "data": data,
    });
    if hint {
        diagnostic["tags"] = json!([1]);
    }
    diagnostic
}
