//! The native Dialex language server: diagnostics, hover, go to definition, completion and quick
//! fixes over the same static analysis as `dx check` (a port of `@dialexjs/language-server`).

pub mod features;
pub mod projects;
pub mod server;
pub mod text;
