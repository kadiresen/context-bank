import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { initializeBank } from "../src/lib/init-bank.js";
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
});
