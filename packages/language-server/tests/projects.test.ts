import { afterEach, describe, expect, it } from "vite-plus/test";

import { discoverProjects } from "../src/features/projects.js";
import { cleanup, writeProject } from "./helpers.js";

afterEach(cleanup);

describe("discoverProjects", () => {
  it("finds a project by its config file", () => {
    const dir = writeProject({ "dialex.config.ts": "export default {}", "src/a.content.ts": "" });
    expect(discoverProjects(dir)).toEqual([{ root: dir, ignore: [] }]);
  });

  it("finds several projects in a monorepo and excludes nested ones from their parent", () => {
    const dir = writeProject({
      "dialex.config.ts": "export default {}",
      "packages/web/dialex.config.ts": "export default {}",
      "packages/web/i18n.config.json": "{}",
      "apps/admin/i18n.config.ts": "export default {}",
    });
    const projects = discoverProjects(dir);

    expect(projects.map((p) => p.root.replace(dir, "")).sort()).toEqual([
      "",
      "/apps/admin",
      "/packages/web",
    ]);
    expect(projects.find((p) => p.root === dir)!.ignore.sort()).toEqual([
      "apps/admin/**",
      "packages/web/**",
    ]);
    expect(projects.find((p) => p.root.endsWith("web"))!.ignore).toEqual([]);
  });

  it("uses the folder itself when there is no config but there are dictionaries", () => {
    const dir = writeProject({ "src/home.content.ts": "export default {}" });
    expect(discoverProjects(dir)).toEqual([{ root: dir, ignore: [] }]);
  });

  it("ignores node_modules and finds nothing in unrelated folders", () => {
    const dir = writeProject({
      "node_modules/pkg/dialex.config.ts": "export default {}",
      "node_modules/pkg/a.content.ts": "",
      "src/app.ts": "",
    });
    expect(discoverProjects(dir)).toEqual([]);
  });

  it("attributes dictionaries outside any configured project to the nearest package", () => {
    const dir = writeProject({
      "packages/web/dialex.config.ts": "export default {}",
      "packages/web/src/a.content.ts": "",
      "packages/api/package.json": "{}",
      "packages/api/src/deep/b.content.ts": "",
      "loose/c.content.ts": "",
    });
    const roots = discoverProjects(dir)
      .map((p) => p.root.replace(dir, ""))
      .sort();

    // web has a config, api is found through its package.json, and loose falls back to the workspace
    expect(roots).toEqual(["", "/packages/api", "/packages/web"]);
  });

  it("does not double-count a dictionary inside a configured project", () => {
    const dir = writeProject({
      "packages/web/dialex.config.ts": "export default {}",
      "packages/web/package.json": "{}",
      "packages/web/src/a.content.ts": "",
    });
    expect(discoverProjects(dir).map((p) => p.root.replace(dir, ""))).toEqual(["/packages/web"]);
  });
});
