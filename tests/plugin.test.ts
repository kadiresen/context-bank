import { describe, expect, it } from "vitest";
import fs from "fs-extra";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const pkg = JSON.parse(read("package.json")) as { version: string };

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

describe("plugin and README on v3", () => {
  const pluginFiles = walk(path.join(root, "plugin"))
    .filter((f) => /\.(md|mjs|json)$/.test(f))
    .map((f) => path.relative(root, f));

  it("does not mention story.md anywhere in plugin/", () => {
    for (const f of pluginFiles) expect(read(f), f).not.toMatch(/story\.md/);
  });

  it("mentions story.md in README only inside the upgrade section", () => {
    const md = read("README.md");
    const start = md.indexOf("## Upgrading an existing bank");
    const end = md.indexOf("\n## ", start + 1);
    expect(start).toBeGreaterThan(-1);
    const outside = md.slice(0, start) + md.slice(end);
    expect(outside).not.toMatch(/story\.md/);
  });

  it("session-start compact suggestion does not list story", () => {
    const hook = read("plugin/hooks/session-start.mjs");
    const line = hook.split("\n").find((l) => /suggest \/context-bank:compact/.test(l));
    expect(line).toBeDefined();
    expect(line).toMatch(/active-context or roadmap/);
    expect(line).not.toMatch(/story/);
    expect(hook).toMatch(/legacyStory[\s\S]*single-file story/);
  });

  it("pins the CLI version to package.json everywhere in plugin/", () => {
    const plugin = JSON.parse(read("plugin/.claude-plugin/plugin.json")) as { version: string };
    expect(plugin.version).toBe(pkg.version);
    for (const f of pluginFiles) {
      for (const m of read(f).matchAll(/context-bank@(\d+\.\d+\.\d+)/g)) {
        if (m[1] !== undefined) expect(m[1], f).toBe(pkg.version);
      }
    }
  });
});
