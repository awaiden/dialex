//! `dialex-language-server --stdio`

fn main() {
    if std::env::args().any(|a| a == "--version" || a == "-V") {
        println!("{}", env!("CARGO_PKG_VERSION"));
        return;
    }
    // `--stdio` is accepted for clients that pass it; stdio is the only transport
    if let Err(error) = dialex_lsp::server::run() {
        eprintln!("dialex-language-server: {error}");
        std::process::exit(1);
    }
}
