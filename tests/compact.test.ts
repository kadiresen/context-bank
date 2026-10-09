import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import { compactBank } from "../src/lib/compact.js";
import { tmpDir, writeAi } from "./helpers.js";

function storyWithEntries(n: number): string {
  const entries = Array.from({ length: n }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `### 2026-01-${day} - Event ${i + 1}\n- happened ${i + 1}\n`;
  });
  return `# Story\n\n## Project Inception\n- started\n\n## Development Log\n\n${entries.join("\n")}`;
}

describe("compactBank", () => {
  it("rewrites a bloated active-context and archives the original", async () => {
    const root = await tmpDir();
    const bloated = [
      "# Active Context",
      "",
      "## Current Focus",
      "- latest work",
      ...Array.from({ length: 200 }, (_, i) => `- old item ${i}`),
      "",
      "## Next Steps",
      "- ship v2",
    ].join("\n");
    await writeAi(root, {
      ".ai/active-context.md": bloated,
      ".ai/rules.md": "# rules\n",
    });

    await compactBank(root, { date: "2026-08-31" });
    const now = await fs.readFile(
      path.join(root, ".ai/active-context.md"),
      "utf-8",
    );
    expect(now).toContain("latest work");
    expect(now).toContain("ship v2");
    expect(now).not.toContain("old item 50");
    expect(
      await fs.pathExists(
        path.join(root, ".ai/archive/active-context-2026-08-31.md"),
      ),
    ).toBe(true);
  });

  it("writes nothing on a dry run", async () => {
    const root = await tmpDir();
    const bloated = ["# Active Context", "", "## Current Focus", ...Array.from({ length: 200 }, (_, i) => `- item ${i}`)].join("\n");
    await writeAi(root, { ".ai/active-context.md": bloated, ".ai/rules.md": "# rules\n" });
    const result = await compactBank(root, { date: "2026-08-31", dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.changed).toEqual([".ai/active-context.md"]);
    expect(result.archived).toEqual([".ai/archive/active-context-2026-08-31.md"]);
    expect(await fs.readFile(path.join(root, ".ai/active-context.md"), "utf-8")).toBe(bloated);
    expect(await fs.pathExists(path.join(root, ".ai/archive"))).toBe(false);
  });

  it("does not overwrite an existing archive file", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/active-context.md": ["# Active Context", "## Current Focus", ...Array.from({ length: 100 }, (_, i) => `- item ${i}`)].join("\n"),
    });
    await compactBank(root, { date: "2026-08-31" });
    const first = await fs.readFile(
      path.join(root, ".ai/archive/active-context-2026-08-31.md"),
      "utf-8",
    );
    await writeAi(root, {
      ".ai/active-context.md": ["# Active Context", "## Current Focus", ...Array.from({ length: 100 }, (_, i) => `- later ${i}`)].join("\n"),
    });
    await compactBank(root, { date: "2026-08-31" });
    const stillFirst = await fs.readFile(
      path.join(root, ".ai/archive/active-context-2026-08-31.md"),
      "utf-8",
    );
    expect(stillFirst).toBe(first);
    expect(
      await fs.pathExists(
        path.join(root, ".ai/archive/active-context-2026-08-31-2.md"),
      ),
    ).toBe(true);
  });

  it("leaves a v3 bank's decisions alone and creates no story archive", async () => {
    const root = await tmpDir();
    const big = `# Big\n\nDate: 2026-01-01\n\n${"x".repeat(6_000)}\n`;
    await writeAi(root, {
      ".ai/rules.md": "# rules\n",
      ".ai/story/2026-01-01-big.md": big,
      ".ai/story/2026-01-02-small.md": "# Small\n\nDate: 2026-01-02\n\nbody\n",
    });
    const result = await compactBank(root, { date: "2026-08-31" });
    expect(result.changed).toEqual([]);
    expect(result.archived).toEqual([]);
    expect(await fs.readFile(path.join(root, ".ai/story/2026-01-01-big.md"), "utf-8")).toBe(big);
    expect(await fs.pathExists(path.join(root, ".ai/archive"))).toBe(false);
  });

  it("no longer compacts a v2 story.md and points to migrate", async () => {
    const root = await tmpDir();
    const story = storyWithEntries(20);
    await writeAi(root, {
      ".ai/rules.md": "# rules\n",
      ".ai/story.md": story,
    });
    const result = await compactBank(root, { date: "2026-08-31" });
    expect(result.changed).toEqual([]);
    expect(result.notes).toContain("run migrate to move story.md into .ai/story");
    expect(await fs.readFile(path.join(root, ".ai/story.md"), "utf-8")).toBe(story);
    expect(await fs.pathExists(path.join(root, ".ai/archive"))).toBe(false);
  });
});

describe("compactBank block-aware trimming", () => {
  const run = async (active: string) => {
    const root = await tmpDir();
    await writeAi(root, { ".ai/active-context.md": active, ".ai/rules.md": "# rules\n" });
    await compactBank(root, { date: "2026-10-09" });
    return {
      root,
      out: await fs.readFile(path.join(root, ".ai/active-context.md"), "utf-8"),
    };
  };
  const filler = Array.from({ length: 120 }, (_, i) => `- old ${i}`).join("\n");
  const para1 = Array.from({ length: 6 }, (_, i) => `**First** line ${i} of paragraph one.`).join("\n");
  const para2 = Array.from({ length: 5 }, (_, i) => `**Second** line ${i} mentions agents@sntodo.internal here.`).join("\n");

  it("keeps the first paragraph whole and no partial second paragraph", async () => {
    const { out, root } = await run(`# Active Context\n\n## Current Focus\n${para1}\n\n${para2}\n\n## Waiting\n${filler}\n`);
    expect(out).toContain(para1);
    expect(out).not.toContain("Second");
    expect(out).toContain("Older notes:");
    expect(
      await fs.pathExists(path.join(root, ".ai/archive/active-context-2026-10-09.md")),
    ).toBe(true);
  });

  it("keeps list items whole", async () => {
    const items = Array.from({ length: 6 }, (_, i) => `- item ${i} start\n  continued ${i}`).join("\n");
    const { out } = await run(`# Active Context\n\n## Current Focus\n${items}\n\n## Waiting\n${filler}\n`);
    expect(out).toContain("- item 3 start\n  continued 3");
    expect(out).not.toContain("- item 4 start");
    expect(out).not.toMatch(/continued 4/);
  });

  it("cuts a single oversized first paragraph at a sentence end with a marker", async () => {
    const sentence = "This is a fairly long sentence about the work. ";
    const big = sentence.repeat(120).trim();
    const { out } = await run(`# Active Context\n\n## Current Focus\n${big}\n\n${para2}\n\n## Waiting\n${filler}\n`);
    expect(out).toMatch(/about the work\. \(continued in the archive\)\n/);
    expect(out).not.toContain("Second");
  });

  it("cuts at a whole word when there is no sentence end", async () => {
    const big = "word ".repeat(1500).trim();
    const { out } = await run(`# Active Context\n\n## Current Focus\n${big}\n\n## Waiting\n${filler}\n`);
    expect(out).toMatch(/word \(continued in the archive\)\n/);
  });

  it("preserves one blank line between kept paragraphs", async () => {
    const { out } = await run(`# Active Context\n\n## Current Focus\nAlpha para.\n\n\nBeta para.\n\n## Waiting\n${filler}\n`);
    expect(out).toContain("Alpha para.\n\nBeta para.\n");
  });

  it("never leaves a partial code fence when the first block is a fence", async () => {
    const code = ["```", ...Array.from({ length: 30 }, (_, i) => `line ${i}`), "```"].join("\n");
    const { out } = await run(`# Active Context\n\n## Current Focus\n${code}\n\n## Waiting\n${filler}\n`);
    expect(out).toContain("(code block continued in the archive)");
    expect(out).not.toContain("```");
    expect(out).toContain("Older notes:");
  });

  it("fallback keeps a cut paragraph, not just the title", async () => {
    const para = Array.from({ length: 50 }, (_, i) => `Sentence number ${i} is here.`).join("\n");
    const { out } = await run(`# Active Context\n\n${para}\n${filler}\n`);
    expect(out).toContain("Sentence number 0 is here.");
    expect(out).toContain("(continued in the archive)");
    expect(out.match(/^# Active Context$/gm)).toHaveLength(1);
  });

  it("does not treat abbreviations as sentence ends", async () => {
    const big = `Use tools e.g. ${"word ".repeat(1500)}`.trim();
    const { out } = await run(`# Active Context\n\n## Current Focus\n${big}\n\n## Waiting\n${filler}\n`);
    expect(out).not.toMatch(/e\.g\. \(continued/);
  });

  it("treats abbreviations after an opening bracket as non-sentence ends", async () => {
    const big = `We changed things (e.g. ${"word ".repeat(1500)}`.trim();
    const { out } = await run(`# Active Context\n\n## Current Focus\n${big}\n\n## Waiting\n${filler}\n`);
    expect(out).not.toMatch(/\(e\.g\. \(continued/);
    expect(out).toMatch(/word \(continued in the archive\)\n/);
  });

  it("keeps a blank line before Older notes in the fallback path", async () => {
    const para = Array.from({ length: 50 }, (_, i) => `Sentence number ${i} is here.`).join("\n");
    const { out } = await run(`# Active Context\n\n${para}\n${filler}\n`);
    expect(out).toMatch(/\(continued in the archive\)\n\nOlder notes:/);
  });

  it("keeps the heading before a cut fence in the fallback path", async () => {
    const code = ["```", ...Array.from({ length: 50 }, (_, i) => `line ${i}`), "```"].join("\n");
    const { out } = await run(`# Active Context\n\n## Notes\n${code}\n${filler}\n`);
    expect(out).toMatch(/## Notes\n\(code block continued in the archive\)\n\nOlder notes:/);
    expect(out).not.toContain("```");
  });

  it("is idempotent on an already compact file", async () => {
    const { out, root } = await run(`# Active Context\n\n## Current Focus\n${para1}\n\n${para2}\n\n## Waiting\n${filler}\n`);
    const again = await compactBank(root, { date: "2026-10-10" });
    expect(again.changed).toEqual([]);
    expect(await fs.readFile(path.join(root, ".ai/active-context.md"), "utf-8")).toBe(out);
  });
});
