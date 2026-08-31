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
});
