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
  it("archives old story entries and keeps the latest ones", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/story.md": storyWithEntries(20),
      ".ai/active-context.md": "x".repeat(12_000),
      ".ai/rules.md": "# rules\n",
    });

    const result = await compactBank(root, { date: "2026-08-31" });
    expect(result.changed).toContain(".ai/story.md");

    const kept = await fs.readFile(path.join(root, ".ai/story.md"), "utf-8");
    expect(kept).toContain("Event 20");
    expect(kept).toContain("Event 9");
    expect(kept).not.toContain("### 2026-01-01");
    expect(kept).toContain("archive/");

    const archiveFiles = await fs.readdir(path.join(root, ".ai/archive"));
    expect(archiveFiles.some((f) => f.startsWith("story-"))).toBe(true);
  });

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

  it("dry-run does not write", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/story.md": storyWithEntries(20),
    });
    await compactBank(root, { date: "2026-08-31", dryRun: true });
    expect(await fs.pathExists(path.join(root, ".ai/archive"))).toBe(false);
    const story = await fs.readFile(path.join(root, ".ai/story.md"), "utf-8");
    expect(story).toContain("Event 1");
  });
});
