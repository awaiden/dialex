# Security policy

## Supported versions

Only the latest release of `dialexjs`, `@dialexjs/cli` and `@dialexjs/mcp` receives security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through
[GitHub security advisories](https://github.com/awaiden/dialex/security/advisories/new).

Include what is affected, how to reproduce it, and the version. You will get a first answer within a
few days, and a fix or a mitigation plan once the report is confirmed.

## Scope

The CLI reads dictionaries and configs from the syntax tree and does not execute project code,
except for the opt-in `runtime` analysis and `loadProject`. Reports about code execution outside
those opt-in paths, path traversal in the CLI or MCP server, or leaking provider API keys are in
scope.

Parts of this codebase are written with AI assistance. That does not change how reports are handled:
they are triaged and fixed like any other vulnerability.
