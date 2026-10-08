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
