use std::io::IsTerminal;

/// Whether `picocolors` would colorize: not with `NO_COLOR` or `--no-color`, and then with
/// `FORCE_COLOR`, `--color`, Windows, a terminal that is not `dumb`, or `CI`.
pub fn color_enabled(args: &[String]) -> bool {
    let env = |name: &str| std::env::var_os(name).is_some();
    if env("NO_COLOR") || args.iter().any(|a| a == "--no-color") {
        return false;
    }
    env("FORCE_COLOR")
        || args.iter().any(|a| a == "--color")
        || cfg!(windows)
        || (std::io::stdout().is_terminal()
            && std::env::var("TERM").map(|t| t != "dumb").unwrap_or(true))
        || env("CI")
}

pub struct Logger {
    pub color: bool,
}

impl Logger {
    fn paint(&self, open: &str, close: &str, text: &str) -> String {
        if self.color {
            format!("\x1b[{open}m{text}\x1b[{close}m")
        } else {
            text.to_string()
        }
    }

    pub fn info(&self, message: &str) {
        println!("{}{message}", self.paint("34", "39", "ℹ "));
    }

    pub fn success(&self, message: &str) {
        println!(
            "{}{}",
            self.paint("32", "39", "✔ "),
            self.paint("1", "22", message)
        );
    }

    pub fn warn(&self, message: &str) {
        eprintln!("{}{message}", self.paint("33", "39", "⚠ "));
    }

    pub fn bold(&self, text: &str) -> String {
        self.paint("1", "22", text)
    }

    pub fn dim(&self, text: &str) -> String {
        self.paint("2", "22", text)
    }

    pub fn underline(&self, text: &str) -> String {
        self.paint("4", "24", text)
    }

    pub fn red(&self, text: &str) -> String {
        self.paint("31", "39", text)
    }

    pub fn yellow(&self, text: &str) -> String {
        self.paint("33", "39", text)
    }

    pub fn error(&self, message: &str) {
        eprintln!(
            "{}{}",
            self.paint("31", "39", "✖ "),
            self.paint("1", "22", message)
        );
    }
}
