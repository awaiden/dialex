//! Reads Dialex dictionary files and `dialex.config.*` from their syntax tree, without running
//! them. It mirrors `packages/cli/src/utils/dictionary-edit.ts` and `static-config.ts`.

mod config;
mod dictionary;
mod edit;

pub use config::{
    parse_static_config, ConfigValue, Lazy, LintLevel, StaticConfig, StaticConfigResult,
};
pub use dictionary::{
    parse_dictionary, Dictionary, Leaf, LeafKind, Locale, Member, Object, ParseError, Property,
    Value,
};
pub use edit::{copy_leaf, property_at, set_string};
