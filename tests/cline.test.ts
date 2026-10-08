import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { diagnose } from "../src/lib/doctor.js";
import { migrateBank } from "../src/lib/migrate.js";
import { tmpDir, writeAi } from "./helpers.js";

const CLINE_RULES = `# Cline's Memory Bank

I am Cline. My memory resets completely between sessions.
I MUST read ALL memory bank files at the start of EVERY task - this is not optional.
`;

function clineBank(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "memory-bank/projectbrief.md": "# Project Brief\n\nA todo app for teams.\n",
    "memory-bank/productContext.md": "# Product Context\n\n## Why\nTeams lose tasks.\n",
    "memory-bank/systemPatterns.md": "# System Patterns\n\n## Layers\nAPI, worker, web.\n",
    "memory-bank/techContext.md": "# Tech Context\n\n## Stack\nTypeScript, Postgres.\n",
    "memory-bank/activeContext.md":
      "# Active Context\n\n## Current Work Focus\n- Sharing invites\n\n## Next Steps\n- Email templates\n",
    "memory-bank/progress.md": "# Progress\n\n## What works\n- Login\n\n## What's left\n- Billing\n",
    "memory-bank/features/sharing.md": "# Sharing spec\n\nDetails.\n",
    ".clinerules/memory-bank.md": CLINE_RULES,
    ...overrides,
  };
}

const read = (root: string, rel: string) =>
  fs.readFile(path.join(root, rel), "utf-8");

describe("migrateBank from a Cline Memory Bank", () => {
  it("maps the six core files into .ai/ and writes the v3 contract", async () => {
    const root = await tmpDir();
    await writeAi(root, clineBank());

    const result = await migrateBank(root, { date: "2026-09-26" });

    const rules = await read(root, ".ai/rules.md");
    expect(rules).toContain("## Context files");
    expect(rules).toContain("TypeScript, Postgres.");
    expect(rules).toContain("### Stack");

    const arch = await read(root, ".ai/architecture.md");
    expect(arch).toContain("A todo app for teams.");
    expect(arch).toContain("Teams lose tasks.");
    expect(arch).toContain("API, worker, web.");

    const active = await read(root, ".ai/active-context.md");
    expect(active).toContain("## Current Work Focus");
    expect(active).toContain("- Sharing invites");

    const roadmap = await read(root, ".ai/roadmap.md");
    expect(roadmap).toContain("- Billing");

    const story = await read(root, ".ai/story/2026-09-26-migrated-from-cline-memory-bank.md");
    expect(story).toContain("# Migrated from Cline Memory Bank");

    const agents = await read(root, "AGENTS.md");
    expect(agents).toContain("Do not preload");
    expect(result.changed).toContain(".ai/rules.md");
  });

  it("copies the whole memory bank into the archive and keeps the original", async () => {
    const root = await tmpDir();
    await writeAi(root, clineBank());

    const result = await migrateBank(root, { date: "2026-09-26" });

    const archived = path.join(root, ".ai/archive/cline-memory-bank");
    expect(await fs.pathExists(path.join(archived, "memory-bank/features/sharing.md"))).toBe(true);
    expect(await fs.pathExists(path.join(archived, "memory-bank/progress.md"))).toBe(true);
    expect(await fs.pathExists(path.join(root, "memory-bank/progress.md"))).toBe(true);
    expect(result.notes.some((n) => n.includes("memory-bank/"))).toBe(true);
  });

  it("repoints a dedicated .clinerules/memory-bank.md and archives the original", async () => {
    const root = await tmpDir();
    await writeAi(root, clineBank());

    await migrateBank(root, { date: "2026-09-26" });

    const rules = await read(root, ".clinerules/memory-bank.md");
    expect(rules).not.toMatch(/read ALL memory bank files/i);
    expect(rules).toContain("AGENTS.md");
    const backup = await read(
      root,
      ".ai/archive/cline-memory-bank/.clinerules/memory-bank.md",
    );
    expect(backup).toMatch(/read ALL memory bank files/i);
  });

  it("leaves a single .clinerules file alone and reports it", async () => {
    const root = await tmpDir();
    const files = clineBank({
      ".clinerules": `# Team rules\n- Use pnpm\n\n${CLINE_RULES}`,
    });
    delete files[".clinerules/memory-bank.md"];
    await writeAi(root, files);

    const result = await migrateBank(root, { date: "2026-09-26" });

    const rules = await read(root, ".clinerules");
    expect(rules).toContain("Use pnpm");
    expect(result.notes.some((n) => n.includes(".clinerules"))).toBe(true);
  });

  it("does not overwrite existing .ai files", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ...clineBank(),
      ".ai/rules.md": "# My rules\n\n## Context files\n- mine\n",
    });

    await migrateBank(root, { date: "2026-09-26" });

    const rules = await read(root, ".ai/rules.md");
    expect(rules).toContain("- mine");
    expect(rules).not.toContain("TypeScript, Postgres.");
    const arch = await read(root, ".ai/architecture.md");
    expect(arch).toContain("API, worker, web.");
  });

  it("keeps the current work focus when compacting a large activeContext", async () => {
    const root = await tmpDir();
    const recent = Array.from({ length: 200 }, (_, i) => `- change ${i}`).join("\n");
    await writeAi(
      root,
      clineBank({
        "memory-bank/activeContext.md": `# Active Context\n\n## Recent Changes\n${recent}\n\n## Current Work Focus\n- Sharing invites\n\n## Next Steps\n- Email templates\n`,
      }),
    );

    await migrateBank(root, { date: "2026-09-26", compact: true });

    const active = await read(root, ".ai/active-context.md");
    expect(active).toContain("- Sharing invites");
    expect(active).toContain("- Email templates");
    expect(active).not.toContain("change 150");
  });
});

describe("diagnose with Cline leftovers", () => {
  it("flags a memory-bank/ folder and a Cline read-everything rule next to .ai/", async () => {
    const root = await tmpDir();
    await writeAi(root, clineBank());
    await migrateBank(root, { date: "2026-09-26" });
    await fs.writeFile(path.join(root, ".clinerules/memory-bank.md"), CLINE_RULES);

    const report = await diagnose(root);
    expect(report.findings.some((f) => f.code === "cline-leftover")).toBe(true);
    expect(report.findings.some((f) => f.code === "cline-contract")).toBe(true);
  });

  it("points a Cline-only project to migrate", async () => {
    const root = await tmpDir();
    await writeAi(root, clineBank());

    const report = await diagnose(root);
    expect(
      report.findings.some(
        (f) => f.code === "cline-bank" && f.message.includes("context-bank migrate"),
      ),
    ).toBe(true);
  });
});
