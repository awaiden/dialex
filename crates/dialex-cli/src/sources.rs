//! Dictionary files read and parsed once per process, shared by `generate` and `check`.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use dialex_syntax::{parse_dictionary, Dictionary, ParseError};
use rayon::prelude::*;

/// Modification time and size, to tell whether a file changed since it was read.
pub type Stamp = (Option<std::time::SystemTime>, u64);

/// Whether a file with this stamp was last modified long enough ago that an equal stamp means an
/// equal file. A file written again within the timestamp's resolution, with the same size, would
/// look unchanged, so a recently modified file is never trusted (the same "racy" rule as git).
pub fn settled(stamp: &Option<Stamp>) -> bool {
    let Some((Some(modified), _)) = stamp else {
        return false;
    };
    std::time::SystemTime::now()
        .duration_since(*modified)
        .is_ok_and(|age| age > std::time::Duration::from_secs(2))
}

pub fn stamp_of(file: &std::path::Path) -> Option<Stamp> {
    let meta = fs::metadata(file).ok()?;
    Some((meta.modified().ok(), meta.len()))
}

pub struct Loaded {
    stamp: Option<Stamp>,
    pub text: String,
    pub parsed: Result<Option<Dictionary>, ParseError>,
}

type Cache = Mutex<HashMap<PathBuf, Arc<Loaded>>>;

fn cache() -> &'static Cache {
    static CACHE: OnceLock<Cache> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Reads and parses `files` (in parallel for those not seen yet), in the order given.
pub fn load_dictionaries(files: &[PathBuf]) -> Vec<Result<Arc<Loaded>, String>> {
    let missing: Vec<&PathBuf> = {
        let known = cache().lock().unwrap();
        files
            .iter()
            .filter(|file| match known.get(*file) {
                Some(loaded) => {
                    let now = stamp_of(file);
                    loaded.stamp != now || !settled(&now)
                }
                None => true,
            })
            .collect()
    };

    let fresh: Vec<(PathBuf, Result<Arc<Loaded>, String>)> = missing
        .par_iter()
        .map(|file| {
            let loaded = fs::read_to_string(file)
                .map_err(|e| format!("{}: {e}", file.display()))
                .map(|text| {
                    let parsed = parse_dictionary(&file.to_string_lossy(), &text);
                    Arc::new(Loaded {
                        stamp: stamp_of(file),
                        text,
                        parsed,
                    })
                });
            ((*file).clone(), loaded)
        })
        .collect();

    let mut known = cache().lock().unwrap();
    let mut errors: HashMap<PathBuf, String> = HashMap::new();
    for (file, result) in fresh {
        match result {
            Ok(loaded) => {
                known.insert(file, loaded);
            }
            Err(message) => {
                errors.insert(file, message);
            }
        }
    }
    files
        .iter()
        .map(|file| match known.get(file) {
            Some(loaded) => Ok(loaded.clone()),
            None => Err(errors
                .remove(file)
                .unwrap_or_else(|| format!("{}: not loaded", file.display()))),
        })
        .collect()
}
