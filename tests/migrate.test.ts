import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it, vi } from "vitest";
import { V2_AGENTS_MD, V2_CLAUDE_MD, V2_RULES_PROTOCOL, V3_AGENTS_MD, V3_CLAUDE_MD } from "../src/lib/contract.js";
import { diagnose } from "../src/lib/doctor.js";
import { bankVersion } from "../src/lib/version.js";
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

  it("v1 bank reaches v3 in one call", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V1_AGENTS,
      ".ai/rules.md": "# rules\nAFTER EVERY TASK you must...\n",
    });
    await migrateBank(root, {});
    expect(await bankVersion(root)).toBe(3);
    expect(await fs.readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(V3_AGENTS_MD);
  });
});

const STORY = `# Project Story

Rare decisions a future agent cannot recover from git. Do not append session transcripts. Do not preload this file; search it.

## Project Inception
- **Vision:** build the thing

### 2026-09-27 - Task engine
Engine runs jobs in a queue.
- detail one

### Undated decision
First undated body.

### Undated decision
Second undated body.
`;

async function readStory(root: string): Promise<Record<string, string>> {
  const dir = path.join(root, ".ai/story");
  const out: Record<string, string> = {};
  for (const f of await fs.readdir(dir)) {
    if (f.endsWith(".md")) out[f] = await fs.readFile(path.join(dir, f), "utf-8");
  }
  return out;
}

describe("migrateBank 2 -> 3", () => {
  it("splits story.md into decision files without losing lines", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS_MD,
      "CLAUDE.md": V2_CLAUDE_MD,
      ".ai/rules.md": `# Rules\n\n${V2_RULES_PROTOCOL}\n## Stack\n- ts\n`,
      ".ai/story.md": STORY,
    });
    const res = await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).sort()).toEqual([
      "0000-00-00-project-inception.md",
      "2026-09-27-task-engine.md",
      "2026-09-27-undated-decision-2.md",
      "2026-09-27-undated-decision.md",
    ]);
    expect(await fs.pathExists(path.join(root, ".ai/story.md"))).toBe(false);
    const all = Object.values(files).join("\n");
    const banner = /^(# Project Story|Rare decisions.*)$/;
    for (const line of STORY.split("\n")) {
      if (!line.trim() || banner.test(line)) continue;
      const bare = line.replace(/^### (\d{4}-\d{2}-\d{2} - )?/, "");
      expect(all).toContain(bare);
    }
    expect(files["2026-09-27-task-engine.md"]).toContain("Date: 2026-09-27");
    expect(res.changed).toContain(".ai/story.md");
    expect(res.changed).toContain(".ai/story/2026-09-27-task-engine.md");
    expect(res.notes.join("\n")).toContain("4 decisions");
    expect(res.removed).toEqual([".ai/story.md"]);
    expect(res.notes.join("\n")).toMatch(/2 decisions had no date[\s\S]*2026-09-27-undated-decision\.md/);

    const rules = await fs.readFile(path.join(root, ".ai/rules.md"), "utf-8");
    expect(rules).toContain(".ai/story/");
    expect(rules).not.toContain("`story.md` is rare");
    expect(await fs.readFile(path.join(root, "AGENTS.md"), "utf-8")).toBe(V3_AGENTS_MD);
    expect(await fs.readFile(path.join(root, "CLAUDE.md"), "utf-8")).toContain("@AGENTS.md");
    expect(await bankVersion(root)).toBe(3);
  });

  it("dates an undated entry by its nearest dated neighbour, never by the migration day", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS_MD,
      ".ai/rules.md": `# Rules\n\n${V2_RULES_PROTOCOL}`,
      ".ai/story.md":
        "# Story\n\n### [Date] - Phase 1: Initialization\n- structure\n\n### 2026-06-05 - Scaffold\n- apps\n\n### 2026-06-08 - Rename\n- peyk\n\n### Follow-up without date\n- more\n",
    });
    await migrateBank(root, { date: "2026-10-08" });
    const files = Object.keys(await readStory(root)).sort();
    expect(files).toEqual([
      "2026-06-05-date-phase-1-initialization.md",
      "2026-06-05-scaffold.md",
      "2026-06-08-follow-up-without-date.md",
      "2026-06-08-rename.md",
    ]);
    expect(files.some((f) => f.startsWith("2026-10-08"))).toBe(false);
  });

  it("uses 0000-00-00 when a story has no dated entry at all", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS_MD,
      ".ai/rules.md": `# Rules\n\n${V2_RULES_PROTOCOL}`,
      ".ai/story.md": "# Story\n\n### First call\n- a\n\n### Second call\n- b\n",
    });
    await migrateBank(root, { date: "2026-10-08" });
    expect(Object.keys(await readStory(root)).sort()).toEqual([
      "0000-00-00-first-call.md",
      "0000-00-00-second-call.md",
    ]);
  });

  it("parses 'DATE: Title' headings and creates no inception for banner-only preamble", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      ".ai/story.md":
        "# Story\n\n> Rare decisions a future agent cannot recover from git. Do not append session transcripts. Do not preload this file; search it.\n> Older entries: `.ai/archive/story-x.md`\n\n### 2026-01-02: Pick db\nuse pg\n",
    });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files)).toEqual(["2026-01-02-pick-db.md"]);
    expect(files["2026-01-02-pick-db.md"]).toBe("# Pick db\n\nDate: 2026-01-02\n\nuse pg\n");
  });

  it("splits archived story files and removes them, leaving other archives", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      ".ai/archive/story-2026-01-01.md":
        "# Archived story\n\nMoved from `.ai/story.md` so the live file stays searchable-on-demand, not preloaded.\n\n### 2025-12-01 - Old choice\nold body\n\n### 2025-12-02 - Other\nother body\n",
      ".ai/archive/roadmap-completed-2026-01-01.md": "keep me\n",
    });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).sort()).toEqual([
      "2025-12-01-old-choice.md",
      "2025-12-02-other.md",
    ]);
    expect(await fs.pathExists(path.join(root, ".ai/archive/story-2026-01-01.md"))).toBe(false);
    expect(await fs.pathExists(path.join(root, ".ai/archive/roadmap-completed-2026-01-01.md"))).toBe(true);
  });

  it("splits an oversized section into parts instead of truncating", async () => {
    const root = await tmpDir();
    const lines = Array.from({ length: 300 }, (_, i) => `line ${i} ${"x".repeat(40)}`);
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      ".ai/story.md": `### 2026-02-02 - Big one\n${lines.join("\n")}\n`,
    });
    await migrateBank(root, {});
    const files = await readStory(root);
    const names = Object.keys(files).sort();
    expect(names.length).toBeGreaterThan(2);
    expect(files[names[0]!]).toContain("# Big one (part 1)");
    const all = names.map((n) => files[n]!).join("\n");
    for (const l of lines) expect(all).toContain(l);
    for (const t of Object.values(files)) expect(t.length).toBeLessThan(4200);
  });

  it("replaces the init placeholder inception instead of adding a second", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      ".ai/story.md": "# Story\n\n## Project Inception\n- vision real\n\n### 2026-03-03 - A\nbody\n",
      ".ai/story/2026-05-05-project-inception.md":
        "# Project inception\n\nDate: 2026-05-05\n\nVision: [Initial project goal]\n",
    });
    await migrateBank(root, {});
    const names = Object.keys(await readStory(root)).sort();
    expect(names).toEqual(["0000-00-00-project-inception.md", "2026-03-03-a.md"]);
  });

  it("updates tool pointer files that reference story.md, without creating missing ones", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      "GEMINI.md": "1. `.ai/rules.md` \u2014 x\n3. `.ai/story.md` \u2014 search, do not preload\n",
    });
    await migrateBank(root, {});
    const g = await fs.readFile(path.join(root, "GEMINI.md"), "utf-8");
    expect(g).toContain("`.ai/story/`");
    expect(g).not.toContain("story.md");
    expect(g).not.toContain("\u2014");
    expect(await fs.pathExists(path.join(root, ".cursor"))).toBe(false);
  });

  it("is idempotent", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS_MD,
      "CLAUDE.md": V2_CLAUDE_MD,
      ".ai/rules.md": `# Rules\n\n${V2_RULES_PROTOCOL}`,
      ".ai/story.md": STORY,
    });
    await migrateBank(root, { date: "2026-10-08" });
    const snap = async () => {
      const out: Record<string, string> = {};
      const walk = async (d: string) => {
        for (const e of await fs.readdir(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) await walk(p);
          else out[path.relative(root, p)] = await fs.readFile(p, "utf-8");
        }
      };
      await walk(root);
      return out;
    };
    const before = await snap();
    const second = await migrateBank(root, { date: "2026-10-08" });
    expect(second.changed).toEqual([]);
    expect(second.notes).toEqual([]);
    expect(await snap()).toEqual(before);
  });

  it("keeps user blockquotes in the preamble, even with MANDATORY or a warning sign", async () => {
    const root = await tmpDir();
    const pre = "> MANDATORY: wrap migrations in a transaction\n> because prod broke\n\n> **\u26a0\ufe0f Never deploy on Fridays**\n> ask Ali first\n";
    await writeAi(root, { ".ai/rules.md": "# r\n", ".ai/story.md": `# Story\n\n${pre}\n### 2026-01-01 - A\nb\n` });
    await migrateBank(root, {});
    const inc = await fs.readFile(path.join(root, ".ai/story/0000-00-00-project-inception.md"), "utf-8");
    for (const l of pre.trim().split("\n").filter(Boolean)) expect(inc).toContain(l);
  });

  it("drops the real v1 MANDATORY story block but keeps the remaining preamble", async () => {
    const root = await tmpDir();
    const v1 = "# \u{1F4DC} Project Story & Decisions Log\n\n> **\u26a0\ufe0f MANDATORY AI AGENT INSTRUCTION:**\n>\n> You MUST append a dated entry.\n> **DO NOT SKIP THIS. Every significant action deserves a log entry.**\n\n## Project Inception\n- **Vision:** real vision\n\n### [Date] - Phase 1: Initialization\n- Project structure created.\n";
    await writeAi(root, { ".ai/rules.md": "# r\n", ".ai/story.md": v1 });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    const all = Object.values(files).join("\n");
    expect(all).not.toContain("MANDATORY AI AGENT");
    expect(all).not.toContain("You MUST append");
    expect(all).toContain("real vision");
    expect(all).toContain("Project structure created.");
  });

  it("drops a leading title only, and only the exact Older entries pointer", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      ".ai/story.md": "Intro text\n\n# Second heading\n\nOlder entries: in Notion page\nOlder entries: `.ai/archive/story-x.md`\n\n### 2026-01-01 - A\nb\n",
    });
    await migrateBank(root, {});
    const inc = await fs.readFile(path.join(root, ".ai/story/0000-00-00-project-inception.md"), "utf-8");
    expect(inc).toContain("Intro text");
    expect(inc).toContain("# Second heading");
    expect(inc).toContain("Older entries: in Notion page");
    expect(inc).not.toContain(".ai/archive/story-x.md");
  });

  it("turns archive preamble leftovers into an Archived story notes decision", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      ".ai/archive/story-2026-02-02.md": "# Archived story\n\nMoved from `.ai/story.md` so the live file stays searchable-on-demand, not preloaded.\n\nStray note kept.\n\n### 2025-01-01 - X\nxb\n",
    });
    await migrateBank(root, {});
    const files = await readStory(root);
    expect(files["2026-02-02-archived-story-notes.md"]).toContain("Stray note kept.");
    expect(Object.values(files).join("\n")).not.toContain("Moved from");
  });

  it("handles CRLF story files", async () => {
    const root = await tmpDir();
    await writeAi(root, { ".ai/rules.md": "# r\n", ".ai/story.md": "# S\r\n\r\n### 2026-01-01 - A\r\nline one\r\nline two\r\n" });
    await migrateBank(root, {});
    const files = await readStory(root);
    expect(files["2026-01-01-a.md"]).toBe("# A\n\nDate: 2026-01-01\n\nline one\nline two\n");
  });

  it("migrates a legacy MANDATORY rules block at the end of the file", async () => {
    const root = await tmpDir();
    await writeAi(root, { ".ai/rules.md": "# Rules\n\n## Stack\n- ts\n\n## \u26a0\ufe0f MANDATORY: MEMORY MANAGEMENT PROTOCOL\nupdate everything\n" });
    await migrateBank(root, {});
    const rules = await fs.readFile(path.join(root, ".ai/rules.md"), "utf-8");
    expect(rules).toContain(".ai/story/");
    expect(rules).not.toContain("MANDATORY");
    expect(rules).toContain("- ts");
  });

  it("keeps custom sections in V2 AGENTS.md and CLAUDE.md", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/rules.md": "# r\n",
      "AGENTS.md": `${V2_AGENTS_MD}\n## Team rules\nAlways use pnpm.\n`,
      "CLAUDE.md": "@AGENTS.md\n\n## Claude Code\nUse sonnet for reviews.\n",
    });
    const res = await migrateBank(root, {});
    const a = await fs.readFile(path.join(root, "AGENTS.md"), "utf-8");
    expect(a).toContain(V3_AGENTS_MD.trim());
    expect(a).toContain("Always use pnpm.");
    expect(a).not.toContain("story.md");
    expect(await fs.readFile(path.join(root, "CLAUDE.md"), "utf-8")).toContain("Use sonnet for reviews.");
    expect(res.notes.join("\n")).not.toContain("customized");
  });

  it("handles CRLF V2 AGENTS.md", async () => {
    const root = await tmpDir();
    await writeAi(root, { ".ai/rules.md": "# r\n", "AGENTS.md": `${V2_AGENTS_MD}\n## Mine\nkeep\n`.replace(/\n/g, "\r\n"), "CLAUDE.md": V2_CLAUDE_MD });
    await migrateBank(root, {});
    const a = await fs.readFile(path.join(root, "AGENTS.md"), "utf-8");
    expect(a).toContain("keep");
    expect(a).toContain(".ai/story/");
    expect(a).not.toContain("`.ai/story.md`");
    expect(await fs.readFile(path.join(root, "CLAUDE.md"), "utf-8")).toBe(V3_CLAUDE_MD);
  });

  it("rewrites matching V2 story lines in a customized contract and notes the rest", async () => {
    const root = await tmpDir();
    const custom = "# Agents\n\nThis project uses **Context Bank**.\n\n- `.ai/story.md` \u2014 rare decisions. Do not preload. Search when you need a past decision.\n\nOur own rule: also log things in `.ai/story.md` weekly.\n";
    await writeAi(root, { ".ai/rules.md": "# r\n", "AGENTS.md": custom });
    const res = await migrateBank(root, {});
    const a = await fs.readFile(path.join(root, "AGENTS.md"), "utf-8");
    expect(a).toContain("Our own rule: also log things in `.ai/story.md` weekly.");
    expect(a).not.toContain("- `.ai/story.md` \u2014 rare decisions.");
    const v3StoryLine = V3_AGENTS_MD.split("\n").find((l) => l.startsWith("- `.ai/story/`"))!;
    expect(a).toContain(v3StoryLine);
    expect(res.notes.join("\n")).toContain("customized contract");
  });

  it("removes created decisions when verification fails, so a rerun has no duplicates", async () => {
    const root = await tmpDir();
    await writeAi(root, { ".ai/rules.md": "# r\n", ".ai/story.md": "### 2026-01-01 - A\nbody\n" });
    const orig = fs.readFile.bind(fs) as (...a: unknown[]) => Promise<unknown>;
    const spy = vi.spyOn(fs, "readFile").mockImplementation(((p: unknown, ...rest: unknown[]) =>
      String(p).includes("/.ai/story/") ? Promise.resolve("garbage") : orig(p, ...rest)) as never);
    await expect(migrateBank(root, {})).rejects.toThrow(/verify/);
    spy.mockRestore();
    expect(await fs.pathExists(path.join(root, ".ai/story.md"))).toBe(true);
    expect(await fs.readdir(path.join(root, ".ai/story"))).toEqual([]);
    await migrateBank(root, {});
    expect(await fs.readdir(path.join(root, ".ai/story"))).toEqual(["2026-01-01-a.md"]);
  });
});

describe("migrateBank 2 -> 3: ## story files and owned pointers", () => {
  const V2 = { "AGENTS.md": V2_AGENTS_MD, "CLAUDE.md": V2_CLAUDE_MD };

  it("splits a ##-only story per entry with dates and keeps template sections as preamble", async () => {
    const root = await tmpDir();
    const story = `# Story

## Project Inception
- **Vision:** keep me

## 2026-08-31 - v2 shipped
- shipped line

## 2026-06-17: OpenCode support
- opencode line

## Development Log
- log line

## No date here
- plain line
`;
    await writeAi(root, { ...V2, ".ai/rules.md": "# r\n", ".ai/story.md": story });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).sort()).toEqual([
      "0000-00-00-project-inception.md",
      "2026-06-17-no-date-here.md",
      "2026-06-17-opencode-support.md",
      "2026-08-31-v2-shipped.md",
    ]);
    expect(files["2026-08-31-v2-shipped.md"]).toContain("Date: 2026-08-31");
    const inception = files["0000-00-00-project-inception.md"]!;
    expect(inception).toContain("## Project Inception");
    expect(inception).toContain("keep me");
    expect(inception).toContain("## Development Log");
    expect(inception).toContain("log line");
    const all = Object.values(files).join("\n");
    for (const line of story.split("\n")) {
      if (!line.trim() || line === "# Story") continue;
      expect(all).toContain(line.replace(/^## (\d{4}-\d{2}-\d{2}(: | - ))?/, ""));
    }
  });

  it("keeps ## sections in the preamble when ### entries exist", async () => {
    const root = await tmpDir();
    const story = "# Story\n\n## Some section\n- sec line\n\n### 2026-09-01 - Real entry\nentry body\n";
    await writeAi(root, { ...V2, ".ai/rules.md": "# r\n", ".ai/story.md": story });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).sort()).toEqual(["0000-00-00-project-inception.md", "2026-09-01-real-entry.md"]);
    expect(files["0000-00-00-project-inception.md"]).toContain("## Some section");
    expect(files["0000-00-00-project-inception.md"]).toContain("sec line");
  });

  it("rewrites a legacy cursor/windsurf pointer wholesale and leaves a modern one alone", async () => {
    const root = await tmpDir();
    const legacy = "# Context Bank\nAfter EVERY task, you MUST update these files (no exceptions):\n3. **`.ai/story.md`** \u2014 Append.\nDo NOT ask permission. Do NOT skip. Just update them.\n";
    await writeAi(root, {
      ...V2,
      ".ai/rules.md": "# r\n",
      ".cursor/rules/context-bank.mdc": legacy,
      ".windsurf/rules/context-bank.md": "custom user rules, no legacy text\n",
      "GEMINI.md": "1. `.ai/rules.md` \u2014 x\n3. `.ai/story.md` \u2014 search\n",
    });
    await migrateBank(root, {});
    const tpl = (rel: string) => fs.readFile(path.join(import.meta.dirname, "..", "templates", rel), "utf-8");
    expect(await fs.readFile(path.join(root, ".cursor/rules/context-bank.mdc"), "utf-8")).toBe(
      await tpl(".cursor/rules/context-bank.mdc"),
    );
    expect(await fs.readFile(path.join(root, ".windsurf/rules/context-bank.md"), "utf-8")).toBe(
      "custom user rules, no legacy text\n",
    );
    expect(await fs.readFile(path.join(root, "GEMINI.md"), "utf-8")).toContain("`.ai/story/`");
  });
});

describe("migrateBank 2 -> 3: fences, archive, caps", () => {
  const V2 = { "AGENTS.md": V2_AGENTS_MD, "CLAUDE.md": V2_CLAUDE_MD };
  const FENCE = "```md\n### x\n## 2026-09-09 - fake\ncode line\n```";

  async function run(story: string) {
    const root = await tmpDir();
    await writeAi(root, { ...V2, ".ai/rules.md": "# r\n", ".ai/story.md": story });
    await migrateBank(root, { date: "2026-10-08" });
    return readStory(root);
  }

  it("ignores ### inside a fence in a ## story", async () => {
    const story = `# Story\n\n## 2026-09-01 - One\nbefore\n${FENCE}\nafter\n\n## 2026-09-02 - Two\ntwo body\n`;
    const files = await run(story);
    expect(Object.keys(files).sort()).toEqual(["2026-09-01-one.md", "2026-09-02-two.md"]);
    expect(files["2026-09-01-one.md"]).toContain(FENCE);
    expect(files["2026-09-01-one.md"]).toContain("after");
  });

  it("ignores ## inside a fence in a ## story, creating no fake decision", async () => {
    const story = `# Story\n\n## 2026-09-01 - One\n${"```"}\n## 2026-09-09 - fake\nkeep\n${"```"}\n`;
    const files = await run(story);
    expect(Object.keys(files)).toEqual(["2026-09-01-one.md"]);
    expect(files["2026-09-01-one.md"]).toContain("## 2026-09-09 - fake");
  });

  it("ignores ### inside a fence in a ### story", async () => {
    const story = `# Story\n\n### 2026-09-01 - One\n~~~\n### 2026-09-09 - fake\nkeep\n~~~\n\n### 2026-09-02 - Two\nb\n`;
    const files = await run(story);
    expect(Object.keys(files).sort()).toEqual(["2026-09-01-one.md", "2026-09-02-two.md"]);
    expect(files["2026-09-01-one.md"]).toContain("### 2026-09-09 - fake");
  });

  it("keeps every migrated chunk, header included, within the decision cap", async () => {
    const body = Array.from({ length: 300 }, (_, i) => `- line number ${i} of a long entry`).join("\n");
    const root = await tmpDir();
    await writeAi(root, { ...V2, ".ai/rules.md": "# r\n", ".ai/story.md": `# Story\n\n### 2026-09-01 - Big one\n${body}\n` });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).length).toBeGreaterThan(2);
    for (const t of Object.values(files)) expect(t.length).toBeLessThanOrEqual(4000);
    const all = Object.values(files).join("\n");
    for (const l of body.split("\n")) expect(all).toContain(l);
    expect((await diagnose(root)).findings.map((f) => f.code)).not.toContain("decision-over-cap");
  });

  it("archives a legacy owned pointer file before replacing it", async () => {
    const root = await tmpDir();
    const legacy = "# X\nAfter EVERY task, you MUST update these files.\nDo NOT ask permission. Do NOT skip. Just update them.\n";
    await writeAi(root, { ...V2, ".ai/rules.md": "# r\n", ".cursor/rules/context-bank.mdc": legacy });
    await migrateBank(root, { date: "2026-10-08" });
    expect(await fs.readFile(path.join(root, ".ai/archive/context-bank-2026-10-08.md"), "utf-8")).toBe(legacy);
  });
});

describe("migrateBank 2 -> 3 mixed heading levels", () => {
  const base = { "AGENTS.md": V2_AGENTS_MD, "CLAUDE.md": V2_CLAUDE_MD, ".ai/rules.md": "# r\n" };

  it("splits dated entries at both ## and ### levels", async () => {
    const story = [
      "# Story", "",
      "### 2026-09-25 - First", "body first", "",
      "### 2026-09-26: Second", "body second", "",
      "## 2026-09-27 - Native loop design (Plan 2C)", "body third", "",
      "## 2026-09-28 - Fourth", "body fourth", "",
      "## 2026-09-29 - Fifth", "body fifth", "",
    ].join("\n");
    const root = await tmpDir();
    await writeAi(root, { ...base, ".ai/story.md": story });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).sort()).toEqual([
      "2026-09-25-first.md",
      "2026-09-26-second.md",
      "2026-09-27-native-loop-design-plan-2c.md",
      "2026-09-28-fourth.md",
      "2026-09-29-fifth.md",
    ]);
    expect(Object.keys(files).some((f) => f.includes("part"))).toBe(false);
    expect(files["2026-09-27-native-loop-design-plan-2c.md"]).toContain("Date: 2026-09-27");
    const all = Object.values(files).join("\n");
    for (const l of ["body first", "body second", "body third", "body fourth", "body fifth"]) expect(all).toContain(l);
  });

  it("keeps an undated ## section inside the previous entry", async () => {
    const story = ["# Story", "", "### 2026-09-25 - First", "body first", "", "## Notes", "note line", "", "### 2026-09-26 - Second", "body second", ""].join("\n");
    const root = await tmpDir();
    await writeAi(root, { ...base, ".ai/story.md": story });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files).sort()).toEqual(["2026-09-25-first.md", "2026-09-26-second.md"]);
    expect(files["2026-09-25-first.md"]).toContain("## Notes");
    expect(files["2026-09-25-first.md"]).toContain("note line");
  });

  it("ignores a dated heading inside a code fence", async () => {
    const story = ["# Story", "", "### 2026-09-25 - First", "```md", "## 2026-09-30 - Not an entry", "```", "after fence", ""].join("\n");
    const root = await tmpDir();
    await writeAi(root, { ...base, ".ai/story.md": story });
    await migrateBank(root, { date: "2026-10-08" });
    const files = await readStory(root);
    expect(Object.keys(files)).toEqual(["2026-09-25-first.md"]);
    expect(files["2026-09-25-first.md"]).toContain("## 2026-09-30 - Not an entry");
  });
});
