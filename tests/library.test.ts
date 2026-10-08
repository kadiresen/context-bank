import { describe, expect, it } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { tmpDir, writeAi } from "./helpers.js";
import { V2_AGENTS_MD } from "../src/lib/contract.js";
import * as lib from "../src/lib/index.js";

describe("bankVersion", () => {
  it("returns null for an empty directory", async () => {
    const root = await tmpDir();
    expect(await lib.bankVersion(root)).toBeNull();
  });

  it("returns 1 for a legacy contract", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": "# Rules\n\nThis project uses **Context Bank**.\n\nAFTER EVERY TASK update memory. DO NOT SKIP THIS UPDATE.\n",
    });
    expect(await lib.bankVersion(root)).toBe(1);
  });

  it("returns null for v1-like wording without a Context Bank marker", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": "# Rules\n\nAFTER EVERY TASK update memory. DO NOT SKIP THIS UPDATE.\n",
    });
    expect(await lib.bankVersion(root)).toBeNull();
  });

  it("returns 2 for a v2 bank with story.md", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      "AGENTS.md": V2_AGENTS_MD,
      ".ai/rules.md": "# Rules\n",
      ".ai/story.md": "# Story\n",
    });
    expect(await lib.bankVersion(root)).toBe(2);
  });

  it("returns 3 when .ai/story/ exists and story.md does not", async () => {
    const root = await tmpDir();
    await writeAi(root, { ".ai/rules.md": "# Rules\n" });
    await fs.ensureDir(path.join(root, ".ai", "story"));
    expect(await lib.bankVersion(root)).toBe(3);
  });
});

describe("library entry", () => {
  it("exports the public API", () => {
    for (const name of [
      "initializeBank",
      "diagnose",
      "migrateBank",
      "compactBank",
      "bankVersion",
      "CAPS",
      "BANK_FILES",
    ]) {
      expect((lib as Record<string, unknown>)[name], name).toBeDefined();
    }
  });
});
