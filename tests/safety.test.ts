import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { V2_AGENTS_MD, V2_CLAUDE_MD, V3_AGENTS_MD, V3_CLAUDE_MD } from "../src/lib/contract.js";
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
      if (e.isSymbolicLink()) out[path.relative(dir, p)] = `link:${await fs.readlink(p)}`;
      else if (e.isDirectory()) await walk(p);
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

describe("in-repo symlinks", () => {
  it("migrates a v2 bank whose AGENTS.md links to CLAUDE.md", async () => {
    const root = await tmpDir();
    await writeAi(root, { "CLAUDE.md": V2_AGENTS_MD, ".ai/rules.md": "# r\n" });
    await fs.symlink("CLAUDE.md", path.join(root, "AGENTS.md"));
    await migrateBank(root, { date: "2026-10-08" });
    expect((await fs.lstat(path.join(root, "AGENTS.md"))).isSymbolicLink()).toBe(true);
    expect(await fs.readFile(path.join(root, "CLAUDE.md"), "utf8")).toBe(V3_AGENTS_MD);
  });

  it("init and migrate work with .ai linked to an in-repo folder", async () => {
    const root = await tmpDir();
    await fs.ensureDir(path.join(root, "memory"));
    await fs.symlink("memory", path.join(root, ".ai"));
    await initializeBank(root);
    expect(await fs.pathExists(path.join(root, "memory/rules.md"))).toBe(true);
    expect((await listDecisions(root)).length).toBe(1);
    await writeAi(root, { "memory/story.md": "# Story\n\n### 2026-01-01 - Pick db\npg\n" });
    await migrateBank(root, { date: "2026-10-08" });
    expect(await fs.pathExists(path.join(root, "memory/story/2026-01-01-pick-db.md"))).toBe(true);
    expect(await bankVersion(root)).toBe(3);
  });

  it("still refuses a link outside the root and a dangling link", async () => {
    const outside = await tmpDir();
    const r1 = await tmpDir();
    await fs.symlink(outside, path.join(r1, ".ai"));
    await expect(addDecision(r1, { title: "X", body: "b" })).rejects.toThrow("refusing to follow a symlink");
    const r2 = await tmpDir();
    await fs.symlink("missing-dir", path.join(r2, ".ai"));
    await expect(addDecision(r2, { title: "X", body: "b" })).rejects.toThrow("refusing to follow a symlink");
    expect(await fs.pathExists(path.join(r2, "missing-dir"))).toBe(false);
    expect(await fs.readdir(outside)).toEqual([]);
  });
});

describe("migrate pre-flight", () => {
  it("throws before writing anything when a target links outside the root", async () => {
    const outside = await tmpDir();
    await writeAi(outside, { "AGENTS.md": V2_AGENTS_MD });
    const root = await tmpDir();
    await writeAi(root, {
      "memory-bank/projectbrief.md": "# Brief\nbuild it\n",
      "memory-bank/activeContext.md": "# Active\nnow\n",
      "CLAUDE.md": V2_CLAUDE_MD,
    });
    await fs.symlink(path.join(outside, "AGENTS.md"), path.join(root, "AGENTS.md"));
    const before = await snapshot(root);
    const outsideBefore = await snapshot(outside);
    await expect(migrateBank(root, { date: "2026-10-08" })).rejects.toThrow("refusing to follow a symlink: AGENTS.md");
    expect(await snapshot(root)).toEqual(before);
    expect(await snapshot(outside)).toEqual(outsideBefore);
  });
});

describe("current contract is never legacy", () => {
  it("keeps a V3 AGENTS.md with v1-like user wording untouched", async () => {
    const root = await tmpDir();
    const agents = `${V3_AGENTS_MD}\nAfter every task, run lint, no matter how small. Every change matters.\n\n## Team\nAli reviews.\n`;
    await writeAi(root, { "AGENTS.md": agents, "CLAUDE.md": V3_CLAUDE_MD, ".ai/rules.md": "# r\n", ".ai/story/.gitkeep": "" });
    expect((await diagnose(root)).findings.map((f) => f.code)).not.toContain("legacy-contract");
    await migrateBank(root, { date: "2026-10-08" });
    expect(await fs.readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(agents);
    expect(await bankVersion(root)).toBe(3);
    const r2 = await tmpDir();
    await writeAi(r2, { "AGENTS.md": agents });
    expect(await bankVersion(r2)).toBeNull();
  });
});

describe("migrate pre-flight covers Cline import targets", () => {
  it("leaves the tree byte-identical when a Cline target is a dangling link", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "memory-bank/projectbrief.md": "# Brief\nbuild it\n",
      "memory-bank/activeContext.md": "# Active\nnow\n",
    });
    await fs.ensureDir(path.join(root, ".ai"));
    await fs.symlink("missing.md", path.join(root, ".ai/active-context.md"));
    const before = await snapshot(root);
    await expect(migrateBank(root, { date: "2026-10-08" })).rejects.toThrow(
      "refusing to follow a symlink: .ai/active-context.md",
    );
    expect(await snapshot(root)).toEqual(before);
  });
});

describe(".git is outside the repo for the guard", () => {
  async function gitRepo() {
    const root = await tmpDir();
    await writeAi(root, { ".git/config": "[core]\n", ".git/hooks/pre-commit": "#!/bin/sh\n" });
    return root;
  }

  it("init does not write into .git through a README.md link", async () => {
    const root = await gitRepo();
    await fs.symlink(".git/config", path.join(root, "README.md"));
    await initializeBank(root).catch(() => undefined);
    expect(await fs.readFile(path.join(root, ".git/config"), "utf8")).toBe("[core]\n");
  });

  it("migrate refuses an AGENTS.md link into .git/hooks", async () => {
    const root = await gitRepo();
    await writeAi(root, { ".ai/rules.md": "# r\n" });
    await fs.writeFile(path.join(root, ".git/hooks/pre-commit"), V2_AGENTS_MD);
    await fs.symlink(".git/hooks/pre-commit", path.join(root, "AGENTS.md"));
    await expect(migrateBank(root, { date: "2026-10-08" })).rejects.toThrow("refusing to follow a symlink: AGENTS.md");
    expect(await fs.readFile(path.join(root, ".git/hooks/pre-commit"), "utf8")).toBe(V2_AGENTS_MD);
  });

  it("init does not create a file in .git through a dangling-into-.git AGENTS.md link", async () => {
    const root = await gitRepo();
    await fs.symlink(".git/hooks/post-checkout", path.join(root, "AGENTS.md"));
    await initializeBank(root).catch(() => undefined);
    expect(await fs.pathExists(path.join(root, ".git/hooks/post-checkout"))).toBe(false);
  });
});
