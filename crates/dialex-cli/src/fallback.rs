use std::path::PathBuf;
use std::process::{Command, ExitCode};

/// Where the Node CLI lives, in order: `DIALEX_NODE_CLI`, a `@dialexjs/cli` next to or above the
/// binary or the project, then the monorepo build.
fn find_node_cli(cwd: &std::path::Path) -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("DIALEX_NODE_CLI") {
        return Some(PathBuf::from(path));
    }
    let mut starts: Vec<PathBuf> = vec![cwd.to_path_buf()];
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // installed in place of the launcher: `node_modules/@dialexjs/cli/bin/<this file>`
            let beside = dir.join("../dist/index.mjs");
            if beside.is_file() {
                return Some(beside);
            }
            starts.push(dir.to_path_buf());
        }
    }
    for start in starts {
        let mut dir = Some(start.as_path());
        while let Some(current) = dir {
            for relative in [
                "node_modules/@dialexjs/cli/dist/index.mjs",
                "packages/cli/dist/index.mjs",
            ] {
                let candidate = current.join(relative);
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
            dir = current.parent();
        }
    }
    None
}

/// Runs the Node CLI with the same arguments and returns its exit code.
pub fn run_node(args: &[String]) -> ExitCode {
    let cwd = std::env::current_dir().unwrap_or_default();
    let Some(cli) = find_node_cli(&cwd) else {
        eprintln!(
            "dialex: this command needs the Node CLI (@dialexjs/cli), which was not found. \
             Install it or set DIALEX_NODE_CLI."
        );
        return ExitCode::from(1);
    };
    match Command::new("node").arg(cli).args(args).status() {
        Ok(status) => ExitCode::from(status.code().unwrap_or(1).clamp(0, 255) as u8),
        Err(error) => {
            eprintln!("dialex: could not start node: {error}");
            ExitCode::from(1)
        }
    }
}
