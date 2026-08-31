import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { migrateBank } from "../src/lib/migrate.js";
import { tmpDir, writeAi } from "./helpers.js";

const V1_AGENTS = `# AI Agent Instructions

This project uses **Context Bank**. The single source of truth is **\`.ai/rules.md\`**.

MANDATORY: After EVERY task, you MUST update these .ai/ files:
1. active-context.md
Do NOT ask permission. Do NOT skip. Just update them.
`;

describe("migrateBank", () => {
  it("replaces the v1 AGENTS.md contract", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V1_AGENTS,
      "CLAUDE.md": "@AGENTS.md\n\n## Claude Code\nupdate all four files\n",
      ".ai/rules.md": "# rules\nAFTER EVERY TASK you must...\n",
      ".ai/active-context.md":
        "> **⚠️ MANDATORY AI AGENT INSTRUCTION:**\n>\n> AFTER EVERY TASK — no matter how small — you MUST update this file\n>\n> **DO NOT SKIP THIS UPDATE.**\n\n## Current Focus\n- keep me\n",
      ".gitattributes": `# Context Bank: branch-aware merge strategies
.ai/active-context.md merge=ours
.ai/story.md merge=union
`,
    });

    await migrateBank(root, {});
    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf-8");
    expect(agents).not.toMatch(/AFTER EVERY TASK/i);
    expect(agents).toContain("Do not preload");

    const claude = await fs.readFile(path.join(root, "CLAUDE.md"), "utf-8");
    expect(claude).toContain("@AGENTS.md");
    expect(claude).not.toMatch(/AFTER EVERY TASK/i);

    const attrs = await fs.readFile(path.join(root, ".gitattributes"), "utf-8");
    expect(attrs).not.toContain("merge=ours");
    expect(attrs).not.toContain("merge=union");
  });
});
