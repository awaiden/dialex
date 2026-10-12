//! Reads Dialex dictionary files from their syntax tree, without running them. It mirrors
//! `packages/cli/src/utils/dictionary-edit.ts`.

mod config;
mod dictionary;
mod edit;

pub use config::{Lazy, LintLevel, StaticConfig};
pub use dictionary::{
    parse_dictionary, Dictionary, Leaf, LeafKind, Locale, Member, Object, ParseError, Property,
    Value,
};
pub use edit::{copy_leaf, property_at, set_string};
