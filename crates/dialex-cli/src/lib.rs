//! The native Dialex CLI. It runs the commands whose result can be worked out from the syntax tree
//! and hands everything else to the Node CLI (see `fallback`).

pub mod adapters;
pub mod analysis;
pub mod check;
pub mod collate;
pub mod fallback;
pub mod generate;
pub mod icu_check;
pub mod lockfile;
pub mod logger;
pub mod paths;
pub mod plural;
pub mod plural_data;
pub mod refs;
pub mod resolved;
pub mod scan;
pub mod sources;
pub mod tsconfig;
