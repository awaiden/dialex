use std::fs;
use std::path::Path;

use serde_json::Value;
use sha1::{Digest, Sha1};

pub struct Lockfile {
    pub source_locale: Option<String>,
    locales: Value,
}

/// A short, stable fingerprint of a source string (the first 8 hex digits of its SHA-1).
pub fn hash_source(text: &str) -> String {
    let digest = Sha1::digest(text.as_bytes());
    digest
        .iter()
        .take(4)
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

pub fn read_lock(root: &Path) -> Option<Lockfile> {
    let text = fs::read_to_string(root.join("dialex.lock.json")).ok()?;
    let data: Value = serde_json::from_str(&text).ok()?;
    if data.get("version")?.as_u64()? != 1 || !data.get("locales")?.is_object() {
        return None;
    }
    Some(Lockfile {
        source_locale: data
            .get("sourceLocale")
            .and_then(|v| v.as_str())
            .map(String::from),
        locales: data["locales"].clone(),
    })
}

impl Lockfile {
    /// True when `key` was recorded for `locale` from different source text than `source_text`.
    pub fn is_stale(&self, locale: &str, key: &str, source_text: &str) -> bool {
        match self
            .locales
            .get(locale)
            .and_then(|l| l.get(key))
            .and_then(|v| v.as_str())
        {
            Some(recorded) => recorded != hash_source(source_text),
            None => false,
        }
    }
}
