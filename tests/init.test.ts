import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { initializeBank } from "../src/lib/init-bank.js";
import { V3_AGENTS_MD, V3_CLAUDE_MD, V3_RULES_PROTOCOL } from "../src/lib/contract.js";
import { tmpDir } from "./helpers.js";

describe("initializeBank", () => {
  it("creates .ai files, AGENTS.md and CLAUDE.md without legacy pointers", async () => {
    const root = await tmpDir();
    await initializeBank(root, {});

    expect(await fs.pathExists(path.join(root, ".ai/rules.md"))).toBe(true);
    expect(await fs.pathExists(path.join(root, ".ai/active-context.md"))).toBe(
      true,
    );
    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf-8");
    expect(agents).toContain("Context Bank");
    expect(agents).not.toMatch(/AFTER EVERY TASK/i);
    expect(agents).toContain("Do not preload");

    const claude = await fs.readFile(path.join(root, "CLAUDE.md"), "utf-8");
    expect(claude).toContain("@AGENTS.md");

    expect(await fs.pathExists(path.join(root, ".cursor"))).toBe(false);
    expect(await fs.pathExists(path.join(root, ".windsurf"))).toBe(false);
    expect(
      await fs.pathExists(path.join(root, ".github/copilot-instructions.md")),
    ).toBe(false);
    expect(await fs.pathExists(path.join(root, "CONVENTIONS.md"))).toBe(false);
    expect(await fs.pathExists(path.join(root, "GEMINI.md"))).toBe(false);
    expect(await fs.pathExists(path.join(root, ".aider.conf.yml"))).toBe(false);
    expect(await fs.pathExists(path.join(root, ".claude/settings.json"))).toBe(
      false,
    );
  });

  it("does not overwrite an existing .ai/rules.md", async () => {
    const root = await tmpDir();
    await fs.ensureDir(path.join(root, ".ai"));
    await fs.writeFile(path.join(root, ".ai/rules.md"), "CUSTOM RULES\n");
    await initializeBank(root, {});
    const rules = await fs.readFile(path.join(root, ".ai/rules.md"), "utf-8");
    expect(rules).toBe("CUSTOM RULES\n");
  });

  it("writes legacy pointers only when requested", async () => {
    const root = await tmpDir();
    await initializeBank(root, { legacyPointers: true });
    expect(await fs.pathExists(path.join(root, ".cursor/rules"))).toBe(true);
    expect(await fs.pathExists(path.join(root, "CONVENTIONS.md"))).toBe(true);
    expect(await fs.pathExists(path.join(root, "GEMINI.md"))).toBe(true);
    const cursor = await fs.readFile(
      path.join(root, ".cursor/rules/context-bank.mdc"),
      "utf-8",
    );
    expect(cursor).not.toMatch(/AFTER EVERY TASK/i);
  });

  it("writes v3 contract and an inception decision instead of story.md", async () => {
    const root = await tmpDir();
    await initializeBank(root, {});
    expect(await fs.pathExists(path.join(root, ".ai/story.md"))).toBe(false);
    const today = new Date().toISOString().slice(0, 10);
    const inception = await fs.readFile(
      path.join(root, `.ai/story/${today}-project-inception.md`),
      "utf-8",
    );
    expect(inception.startsWith("# Project inception")).toBe(true);
    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf-8");
    expect(agents).toBe(V3_AGENTS_MD);
    expect(agents).toContain(".ai/story/");
    expect(agents).not.toContain("story.md");
    expect(await fs.readFile(path.join(root, "CLAUDE.md"), "utf-8")).toBe(
      V3_CLAUDE_MD,
    );
    const rules = await fs.readFile(path.join(root, ".ai/rules.md"), "utf-8");
    expect(rules).toContain(V3_RULES_PROTOCOL);
  });

  it("does not add an inception decision when .ai/story/ already has one", async () => {
    const root = await tmpDir();
    await fs.ensureDir(path.join(root, ".ai/story"));
    await fs.writeFile(path.join(root, ".ai/story/2026-01-01-old.md"), "# Old\n");
    await initializeBank(root, {});
    expect(await fs.readdir(path.join(root, ".ai/story"))).toEqual([
      "2026-01-01-old.md",
    ]);
  });

  it("templates contain no em dash and no story.md reference", async () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates");
    const walk = async (d: string): Promise<string[]> => {
      const out: string[] = [];
      for (const e of await fs.readdir(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) out.push(...(await walk(p)));
        else out.push(p);
      }
      return out;
    };
    const files = await walk(dir);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const text = await fs.readFile(f, "utf-8");
      expect(text, f).not.toContain("\u2014");
      expect(text, f).not.toContain("story.md");
    }
  });

  it("v3 contract texts have no em dash", () => {
    for (const t of [V3_AGENTS_MD, V3_CLAUDE_MD, V3_RULES_PROTOCOL]) {
      expect(t).not.toContain("\u2014");
    }
  });
});
