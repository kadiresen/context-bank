import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { V2_CLAUDE_MD, V3_AGENTS_MD } from "../src/lib/contract.js";
import { compactBank } from "../src/lib/compact.js";
import { addDecision, listDecisions, searchDecisions } from "../src/lib/decisions.js";
import { diagnose } from "../src/lib/doctor.js";
import { initializeBank } from "../src/lib/init-bank.js";
import { migrateBank } from "../src/lib/migrate.js";
import { bankVersion } from "../src/lib/version.js";
import { tmpDir, writeAi } from "./helpers.js";

async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (d: string) => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else out[path.relative(dir, p)] = await fs.readFile(p, "utf8");
    }
  };
  await walk(dir);
  return out;
}

describe("legacy contract detection", () => {
  const USER_AGENTS = "# Team\n\nRun lint after every edit, no matter how small.\n\n## Deploy\nUse the deploy script.\n";
  const USER_CLAUDE = "# Claude\n\n## Testing\nRun the tests for every change, no matter how small.\n";

  it("does not treat ordinary user wording as a v1 contract", async () => {
    const root = await tmpDir();
    await writeAi(root, { "AGENTS.md": USER_AGENTS, "CLAUDE.md": USER_CLAUDE });
    expect(await bankVersion(root)).toBeNull();
    expect((await diagnose(root)).findings.map((f) => f.code)).not.toContain("legacy-contract");
    await migrateBank(root, { date: "2026-10-08" });
    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");
    const claude = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    expect(agents).toContain("## Deploy\nUse the deploy script.");
    expect(claude).toContain("## Testing\nRun the tests for every change, no matter how small.");
  });

  it("archives a real v1 AGENTS.md before replacing it and says so", async () => {
    const root = await tmpDir();
    const v1 = "# AI Agent Instructions\n\nThis project uses **Context Bank**.\n\nMANDATORY: After EVERY task, you MUST update these .ai/ files:\nDo NOT ask permission. Do NOT skip. Just update them.\n\n## Deploy\nmine\n";
    await writeAi(root, { "AGENTS.md": v1, ".ai/rules.md": "# r\n" });
    const res = await migrateBank(root, { date: "2026-10-08" });
    expect(await fs.readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(V3_AGENTS_MD);
    expect(await fs.readFile(path.join(root, ".ai/archive/AGENTS-2026-10-08.md"), "utf8")).toBe(v1);
    expect(res.changed).toContain(".ai/archive/AGENTS-2026-10-08.md");
    expect(res.notes.join("\n")).toContain(".ai/archive/AGENTS-2026-10-08.md");
  });
});

describe("v1 banner stripping", () => {
  it("keeps a user blockquote at the top of active-context", async () => {
    const root = await tmpDir();
    const active = "# Active Context\n\n> Note: staging is down until Friday.\n\n## Current Focus\n- x\n";
    await writeAi(root, { ".ai/rules.md": "# r\n", ".ai/active-context.md": active });
    await migrateBank(root, { date: "2026-10-08" });
    expect(await fs.readFile(path.join(root, ".ai/active-context.md"), "utf8")).toContain(
      "> Note: staging is down until Friday.",
    );
  });
});

describe("symlink guards", () => {
  it("init, migrate, compact and addDecision write nothing through a symlinked .ai", async () => {
    const outside = await tmpDir();
    await writeAi(outside, { "rules.md": "# outside\n", "active-context.md": `${"- line\n".repeat(200)}`, "story.md": "# Story\n\n### 2026-01-01 - X\nb\n" });
    const before = await snapshot(outside);
    const root = await tmpDir();
    await fs.symlink(outside, path.join(root, ".ai"));
    await expect(initializeBank(root)).rejects.toThrow("refusing to follow a symlink");
    await migrateBank(root, { date: "2026-10-08" }).catch(() => undefined);
    await compactBank(root, { date: "2026-10-08" }).catch(() => undefined);
    await expect(addDecision(root, { title: "X", body: "b" })).rejects.toThrow("refusing to follow a symlink: .ai/story");
    expect(await snapshot(outside)).toEqual(before);
  });

  it("reads through a symlinked .ai return nothing", async () => {
    const outside = await tmpDir();
    await writeAi(outside, { "rules.md": "# outside\n", "story/2026-01-01-x.md": "# X\n\nDate: 2026-01-01\n\nsecret\n" });
    const root = await tmpDir();
    await writeAi(root, { "AGENTS.md": V3_AGENTS_MD });
    await fs.symlink(outside, path.join(root, ".ai"));
    expect(await listDecisions(root)).toEqual([]);
    expect((await searchDecisions(root, "secret")).entries).toEqual([]);
    expect(await bankVersion(root)).toBeNull();
    expect((await diagnose(root)).findings.map((f) => f.code)).toContain("missing-rules");
  });

  it("init does not write through a dangling symlinked AGENTS.md or a symlinked README.md", async () => {
    const outside = await tmpDir();
    await writeAi(outside, { "README.md": "# outside readme\n" });
    const root = await tmpDir();
    await fs.symlink(path.join(outside, "AGENTS.md"), path.join(root, "AGENTS.md"));
    await fs.symlink(path.join(outside, "README.md"), path.join(root, "README.md"));
    await initializeBank(root).catch(() => undefined);
    expect(await snapshot(outside)).toEqual({ "README.md": "# outside readme\n" });
  });

  it("init does not copy templates through a dangling symlink inside .ai or a symlinked .cursor", async () => {
    const outside = await tmpDir();
    const root = await tmpDir();
    await fs.ensureDir(path.join(root, ".ai"));
    await fs.symlink(path.join(outside, "roadmap.md"), path.join(root, ".ai/roadmap.md"));
    await expect(initializeBank(root)).rejects.toThrow("refusing to follow a symlink: .ai/roadmap.md");
    const root2 = await tmpDir();
    await fs.symlink(outside, path.join(root2, ".cursor"));
    await expect(initializeBank(root2, { legacyPointers: true })).rejects.toThrow("refusing to follow a symlink");
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("migrate does not write through a dangling symlinked AGENTS.md or CLAUDE.md", async () => {
    const outside = await tmpDir();
    const root = await tmpDir();
    await writeAi(root, { ".ai/rules.md": "# r\n" });
    await fs.symlink(path.join(outside, "AGENTS.md"), path.join(root, "AGENTS.md"));
    await fs.symlink(path.join(outside, "CLAUDE.md"), path.join(root, "CLAUDE.md"));
    await expect(migrateBank(root, { date: "2026-10-08" })).rejects.toThrow("refusing to follow a symlink: AGENTS.md");
    expect(await fs.readdir(outside)).toEqual([]);
  });
});

describe("directories where files are expected", () => {
  it("diagnose and migrate do not crash on a directory named AGENTS.md or .ai/rules.md", async () => {
    const root = await tmpDir();
    await fs.ensureDir(path.join(root, "AGENTS.md"));
    await fs.ensureDir(path.join(root, ".ai/rules.md"));
    await writeAi(root, { "CLAUDE.md": V2_CLAUDE_MD });
    const report = await diagnose(root);
    expect(report.findings.map((f) => f.code)).toEqual(expect.arrayContaining(["missing-rules", "missing-agents"]));
    const res = await migrateBank(root, { date: "2026-10-08" });
    expect(res.notes.join("\n")).toContain("AGENTS.md is not a regular file");
    expect((await fs.stat(path.join(root, "AGENTS.md"))).isDirectory()).toBe(true);
  });
});
