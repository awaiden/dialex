use std::path::Path;

/// Every adapter entry point that has its own `DictionaryRegistry` to augment (the order of
/// `REGISTRY_ADAPTERS` in `packages/cli/src/utils/scanner.ts`).
pub const REGISTRY_ADAPTERS: [&str; 22] = [
    "react",
    "server",
    "hono",
    "express",
    "fastify",
    "koa",
    "nestjs",
    "elysia",
    "sveltekit",
    "astro",
    "vue",
    "web",
    "h3",
    "angular",
    "svelte",
    "solid",
    "preact",
    "qwik",
    "lit",
    "hapi",
    "adonis",
    "trpc",
];

/// Dependencies that tell which `dialexjs/*` entry points a project can import.
pub const ADAPTER_DEPENDENCIES: [(&str, &[&str]); 35] = [
    ("react", &["react"]),
    ("react-dom", &["react"]),
    ("next", &["react", "server"]),
    ("hono", &["hono"]),
    ("express", &["express"]),
    ("fastify", &["fastify"]),
    ("koa", &["koa"]),
    ("@nestjs/core", &["nestjs"]),
    ("@nestjs/common", &["nestjs"]),
    ("elysia", &["elysia"]),
    ("@sveltejs/kit", &["sveltekit"]),
    ("astro", &["astro"]),
    ("vue", &["vue"]),
    ("nuxt", &["vue", "h3"]),
    ("h3", &["h3"]),
    ("nitropack", &["h3"]),
    ("@angular/core", &["angular"]),
    ("svelte", &["svelte"]),
    ("solid-js", &["solid"]),
    ("preact", &["preact"]),
    ("@builder.io/qwik", &["qwik"]),
    ("lit", &["lit"]),
    ("@hapi/hapi", &["hapi"]),
    ("@adonisjs/core", &["adonis"]),
    ("@adonisjs/http-server", &["adonis"]),
    ("@trpc/server", &["trpc"]),
    ("react-native", &["react"]),
    ("expo", &["react"]),
    ("react-router", &["web"]),
    ("react-router-dom", &["web"]),
    ("@remix-run/react", &["web"]),
    ("@remix-run/node", &["web"]),
    ("@tanstack/react-start", &["web"]),
    ("@solidjs/start", &["web"]),
    ("wrangler", &["web"]),
];

/// The adapters to augment for a project, read from its `package.json`; all of them when nothing is
/// recognised or the file cannot be read.
pub fn detect_adapters(root: &Path) -> Vec<String> {
    let all = || {
        REGISTRY_ADAPTERS
            .iter()
            .map(|a| a.to_string())
            .collect::<Vec<_>>()
    };
    let Ok(text) = std::fs::read_to_string(root.join("package.json")) else {
        return all();
    };
    let Ok(package) = serde_json::from_str::<serde_json::Value>(&text) else {
        return all();
    };

    let mut found: Vec<&str> = Vec::new();
    for section in ["dependencies", "devDependencies", "peerDependencies"] {
        let Some(deps) = package.get(section).and_then(|v| v.as_object()) else {
            continue;
        };
        for name in deps.keys() {
            if let Some((_, adapters)) = ADAPTER_DEPENDENCIES.iter().find(|(dep, _)| dep == name) {
                found.extend(adapters.iter());
            }
        }
    }
    if found.is_empty() {
        return all();
    }
    REGISTRY_ADAPTERS
        .iter()
        .filter(|adapter| found.contains(adapter))
        .map(|adapter| adapter.to_string())
        .collect()
}
