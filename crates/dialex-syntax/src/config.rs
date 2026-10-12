//! The settings of `dialex.config.*` that `generate` and `check` use.
//!
//! The config is not read here. `@dialexjs/config` resolves it once and writes
//! `.dialex/config.json`; `dialex-cli` reads that file into a [`StaticConfig`].

/// How `lazy` is set.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lazy {
    Off,
    On,
    PerLocale,
}

/// How loudly a `lint.rules` entry reports.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LintLevel {
    Off,
    Warn,
    Error,
}

impl LintLevel {
    /// `"off"`, `"warn"` or `"error"`.
    pub fn parse(text: &str) -> Option<LintLevel> {
        match text {
            "off" => Some(LintLevel::Off),
            "warn" => Some(LintLevel::Warn),
            "error" => Some(LintLevel::Error),
            _ => None,
        }
    }
}

/// The settings `generate` and `check` use, with the defaults of `DEFAULT_STATIC_CONFIG`.
#[derive(Debug, Clone, PartialEq)]
pub struct StaticConfig {
    pub default_locale: String,
    pub locales: Vec<String>,
    pub include: Vec<String>,
    pub exclude: Vec<String>,
    pub output: Option<String>,
    pub fallbacks: Vec<(String, Vec<String>)>,
    pub prefix_default: bool,
    pub lazy: Lazy,
    /// `lint.rules`: the level of each check, by diagnostic code.
    pub lint: Vec<(String, LintLevel)>,
}

impl Default for StaticConfig {
    fn default() -> Self {
        StaticConfig {
            default_locale: "en".into(),
            locales: Vec::new(),
            include: vec!["**/*.content.ts".into()],
            exclude: Vec::new(),
            output: None,
            fallbacks: Vec::new(),
            prefix_default: true,
            lazy: Lazy::Off,
            lint: Vec::new(),
        }
    }
}
