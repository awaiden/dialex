use std::path::PathBuf;
use std::process::ExitCode;

use dialex_cli::check::{run as run_check, CheckOptions};
use dialex_cli::fallback::run_node;
use dialex_cli::generate::{render, write, Options};
use dialex_cli::logger::{color_enabled, Logger};
use dialex_cli::paths::relative;

/// `generate` with only the options the native path understands; `None` hands over to Node.
struct GenerateArgs {
    options: Options,
    json: bool,
}

fn parse_generate(args: &[String]) -> Option<GenerateArgs> {
    let mut options = Options::default();
    let mut json = false;
    let mut iter = args.iter().skip(1);
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--json" => json = true,
            "-o" | "--output" => options.output = Some(iter.next()?.clone()),
            "-c" | "--config" => options.config = Some(iter.next()?.clone()),
            _ => return None, // --watch, --help, unknown flags: Node decides
        }
    }
    Some(GenerateArgs { options, json })
}

/// `check` with only the options the native path understands (not `--fix`).
fn parse_check(args: &[String]) -> Option<CheckOptions> {
    let mut options = CheckOptions::default();
    let mut iter = args.iter().skip(1).peekable();
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--json" => options.json = true,
            "--github" => options.github = true,
            "--fail-on-stale" => options.fail_on_stale = true,
            "-c" | "--config" => options.config = Some(iter.next()?.clone()),
            "--src" => {
                // variadic: takes every value up to the next option
                let mut globs = Vec::new();
                while let Some(next) = iter.peek() {
                    if next.starts_with('-') {
                        break;
                    }
                    globs.push(iter.next().unwrap().clone());
                }
                if globs.is_empty() {
                    return None;
                }
                options.src = Some(globs);
            }
            _ => return None, // --fix, --help, unknown flags: Node decides
        }
    }
    Some(options)
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let native = std::env::var("DIALEX_NATIVE")
        .map(|v| v != "0")
        .unwrap_or(true);
    let strict = std::env::var("DIALEX_NATIVE")
        .map(|v| v == "1")
        .unwrap_or(false);

    if native && args.len() == 1 && (args[0] == "--version" || args[0] == "-V") {
        println!("{}", env!("CARGO_PKG_VERSION"));
        return ExitCode::SUCCESS;
    }

    if native {
        if let Some(command) = args.first() {
            if command == "generate" || command == "gen" {
                if let Some(parsed) = parse_generate(&args) {
                    let root: PathBuf = std::env::current_dir().unwrap_or_default();
                    match render(&root, &parsed.options) {
                        Ok(rendered) => {
                            if write(&rendered).is_ok() {
                                print_generate(&root, &rendered, parsed.json, &args);
                                return ExitCode::SUCCESS;
                            }
                        }
                        Err(reason) => {
                            if strict {
                                eprintln!("dialex: native generate declined: {}", reason.0);
                                return ExitCode::from(1);
                            }
                        }
                    }
                }
            }
        }
    }

    if native {
        if let Some(command) = args.first() {
            if command == "check" || command == "lint" {
                if let Some(options) = parse_check(&args) {
                    let root: PathBuf = std::env::current_dir().unwrap_or_default();
                    let logger = Logger {
                        color: color_enabled(&args),
                    };
                    match run_check(&root, &options, &logger) {
                        Ok(code) => return ExitCode::from(code),
                        Err(reason) => {
                            if strict {
                                eprintln!("dialex: native check declined: {}", reason.0);
                                return ExitCode::from(1);
                            }
                        }
                    }
                }
            }
        }
    }
    run_node(&args)
}

fn print_generate(
    root: &std::path::Path,
    rendered: &dialex_cli::generate::Rendered,
    json: bool,
    args: &[String],
) {
    let rel = |p: &std::path::Path| relative(root, p);
    if json {
        let files: Vec<String> = rendered.files.iter().map(|f| rel(f)).collect();
        let value = serde_json::json!({
            "success": true,
            "files": files,
            "outputPath": rel(&rendered.output_path),
            "dtsPath": rel(&rendered.dts_path),
            "notes": rendered.notes,
        });
        println!("{}", serde_json::to_string_pretty(&value).unwrap());
        return;
    }
    let logger = Logger {
        color: color_enabled(args),
    };
    if rendered.config_file.is_none() {
        logger.info("No dialex.config.* found, using defaults (run `dialex init` to add one).");
    }
    let count = rendered.files.len();
    logger.success(&format!(
        "Generated dictionaries for {count} file{}:",
        if count == 1 { "" } else { "s" }
    ));
    logger.info(&format!("→ {}", rel(&rendered.output_path)));
    logger.info(&format!("→ {}", rel(&rendered.dts_path)));
    for note in &rendered.notes {
        logger.info(note);
    }
}
