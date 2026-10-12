//! ICU MessageFormat parsing and argument introspection, a port of `packages/core/src/icu`.
//!
//! The parser works on UTF-16 code units, like the JavaScript original, so error positions and the
//! order of selectors are identical.

mod introspect;
mod parse;

pub use introspect::{
    argument_signature, find_plurals, get_arguments, is_icu_structured, js_key_order, message_type,
    Argument, ArgumentType,
};
pub use parse::{parse_message, Node, Options, SyntaxError};
