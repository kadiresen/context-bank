import path from "node:path";
import { describe, expect, it } from "vitest";
import { diagnose } from "../src/lib/doctor.js";
import { tmpDir, writeAi } from "./helpers.js";

const V2_AGENTS = `# AI Agent Instructions

This project uses **Context Bank**. Canonical files:

- \`.ai/rules.md\` — stack and conventions. Always read.
- \`.ai/story.md\` — rare decisions. Do not preload.
`;

describe("diagnose", () => {
  it("reports missing bank files", async () => {
    const root = await tmpDir();
    const report = await diagnose(root);
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.code === "missing-rules")).toBe(true);
  });

  it("flags the v1 every-task contract", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md":
        "This project uses **Context Bank**.\nMANDATORY: After EVERY task, you MUST update these .ai/ files:\nDo NOT ask permission. Do NOT skip.\n",
      ".ai/rules.md": "# rules\n",
      ".ai/active-context.md": "# now\n",
    });
    const report = await diagnose(root);
    expect(report.findings.some((f) => f.code === "legacy-contract")).toBe(
      true,
    );
  });

  it("flags an over-cap active-context", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS,
      ".ai/rules.md": "# rules\n",
      ".ai/active-context.md": "x".repeat(20_000),
    });
    const report = await diagnose(root);
    expect(
      report.findings.some(
        (f) => f.code === "over-cap" && f.file.endsWith("active-context.md"),
      ),
    ).toBe(true);
  });

  it("tells the user an over-cap architecture.md needs a manual trim", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS,
      ".ai/rules.md": "# rules\n",
      ".ai/active-context.md": "# now\n",
      ".ai/architecture.md": "x".repeat(50_000),
    });
    const report = await diagnose(root);
    const finding = report.findings.find(
      (f) => f.code === "over-cap" && f.file.endsWith("architecture.md"),
    );
    expect(finding?.message).toMatch(/not auto-compacted/);
  });

  it("flags a stale uncommitted marker", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS,
      ".ai/rules.md": "# rules\n",
      ".ai/active-context.md": "HENÜZ COMMIT YOK: still here\n",
    });
    const report = await diagnose(root);
    expect(
      report.findings.some((f) => f.code === "stale-uncommitted-marker"),
    ).toBe(true);
  });

  it("is ok for a small v2 bank", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS,
      ".ai/rules.md": "# rules\nstack: ts\n",
      ".ai/active-context.md": "## Current Focus\n- shipping v2\n",
    });
    const report = await diagnose(root);
    expect(report.ok).toBe(true);
  });

  const V3_AGENTS = `# AI Agent Instructions

- \`.ai/rules.md\`: stack and conventions. Always read.
- \`.ai/story/\`: one file per rare decision. Do not preload.
`;

  it("is ok for a clean v3 bank, ignoring .gitkeep and non-md files", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V3_AGENTS,
      ".ai/rules.md": "# rules\n",
      ".ai/story/.gitkeep": "",
      ".ai/story/notes.txt": "x".repeat(9_000),
      ".ai/story/2026-01-01-a.md": "# A\n\nDate: 2026-01-01\n\nbody\n",
    });
    const report = await diagnose(root);
    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it("warns about a legacy story.md and says to run migrate", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS,
      ".ai/rules.md": "# rules\n",
      ".ai/story.md": "# Story\n",
    });
    const report = await diagnose(root);
    const f = report.findings.find((x) => x.code === "legacy-story");
    expect(f?.severity).toBe("warn");
    expect(f?.file).toBe(path.join(root, ".ai/story.md"));
    expect(f?.message).toMatch(/context-bank migrate/);
  });

  it("warns once per decision file longer than the cap", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V3_AGENTS,
      ".ai/rules.md": "# rules\n",
      ".ai/story/2026-01-01-big.md": `# Big\n\nDate: 2026-01-01\n\n${"x".repeat(4_100)}\n`,
      ".ai/story/2026-01-02-ok.md": "# Ok\n\nDate: 2026-01-02\n\nbody\n",
    });
    const report = await diagnose(root);
    const found = report.findings.filter((x) => x.code === "decision-over-cap");
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("warn");
    expect(found[0].file).toBe(path.join(root, ".ai/story/2026-01-01-big.md"));
    expect(report.ok).toBe(true);
  });

  it("reports missing-story-dir when AGENTS.md is v3 but .ai/story/ is gone", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V3_AGENTS,
      ".ai/rules.md": "# rules\n",
    });
    const report = await diagnose(root);
    const f = report.findings.find((x) => x.code === "missing-story-dir");
    expect(f?.severity).toBe("info");
    expect(f?.file).toBe(path.join(root, ".ai/story"));
    expect(report.ok).toBe(true);
  });
});
