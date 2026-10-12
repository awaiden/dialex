//! The native binary reports the version of the npm package it ships with.

#[test]
fn version_matches_the_cli_package() {
    let package = include_str!("../../../packages/cli/package.json");
    let value: serde_json::Value = serde_json::from_str(package).unwrap();
    assert_eq!(
        value["version"].as_str().unwrap(),
        env!("CARGO_PKG_VERSION"),
        "bump `version` in crates/Cargo.toml together with packages/cli/package.json"
    );
}
