import fs from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { withI18n } from "../src/next.js";

describe("withI18n Next.js plugin", () => {
  it("wraps an object nextConfig and sets up aliases", () => {
    const nextConfig = {
      reactStrictMode: true,
    };

    const enhanced = withI18n(nextConfig, {
      defaultLocale: "en",
      locales: ["en", "tr"],
    });

    expect(enhanced.reactStrictMode).toBe(true);
    expect(typeof enhanced.webpack).toBe("function");

    // Test webpack alias injection
    const dummyWebpackConfig: any = {
      resolve: { alias: {} },
      plugins: [],
    };

    const resultWebpackConfig = enhanced.webpack(dummyWebpackConfig, {});
    expect(resultWebpackConfig.resolve.alias["virtual:dialex-dictionaries"]).toBeDefined();
    expect(resultWebpackConfig.resolve.alias["virtual:dialex-config"]).toBeDefined();

    // Test Turbopack aliases
    expect(enhanced.turbopack.resolveAlias["virtual:dialex-dictionaries"]).toBeDefined();
    expect(enhanced.turbopack.resolveAlias["virtual:dialex-config"]).toBeDefined();
    expect(enhanced.experimental.turbo.resolveAlias["virtual:dialex-dictionaries"]).toBeDefined();
  });

  it("generates a dictionaries module with the lazy-loading exports and a client-safe config", () => {
    const enhanced = withI18n(
      {},
      {
        defaultLocale: "en",
        locales: ["en", "tr"],
        translate: { provider: { name: "secret-provider", translate: async () => [] } },
      },
    );

    const alias = enhanced.turbopack.resolveAlias;
    const dictionaries = fs.readFileSync(alias["virtual:dialex-dictionaries"], "utf-8");
    expect(dictionaries).toContain("export const lazy = false;");
    expect(dictionaries).toContain("export function loadDictionary(name)");

    const config = fs.readFileSync(alias["virtual:dialex-config"], "utf-8");
    expect(config).toContain('"defaultLocale":"en"');
    expect(config).not.toContain("secret-provider");
  });

  it("preserves custom user webpack config", () => {
    let customWebpackCalled = false;
    const nextConfig = {
      webpack(config: any) {
        customWebpackCalled = true;
        config.customFlag = true;
        return config;
      },
    };

    const enhanced = withI18n(nextConfig);
    const webpackConfig: any = { resolve: { alias: {} }, plugins: [] };
    const res = enhanced.webpack(webpackConfig, {});

    expect(customWebpackCalled).toBe(true);
    expect(res.customFlag).toBe(true);
    expect(res.resolve.alias["virtual:dialex-dictionaries"]).toBeDefined();
  });

  it("handles functional nextConfig", async () => {
    const nextConfigFn = (phase: string) => ({
      env: { PHASE: phase },
    });

    const enhancedFn = withI18n(nextConfigFn);
    expect(typeof enhancedFn).toBe("function");

    const resolved = enhancedFn("phase-development-server", {});
    expect(resolved.env.PHASE).toBe("phase-development-server");
    expect(typeof resolved.webpack).toBe("function");
  });

  it("handles async functional nextConfig", async () => {
    const asyncNextConfigFn = async (phase: string) => ({
      env: { PHASE: phase },
    });

    const enhancedFn = withI18n(asyncNextConfigFn);
    expect(typeof enhancedFn).toBe("function");

    const resolved = await enhancedFn("phase-production-build", {});
    expect(resolved.env.PHASE).toBe("phase-production-build");
    expect(typeof resolved.webpack).toBe("function");
  });
});
