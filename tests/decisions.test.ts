import path from "node:path";
import fs from "fs-extra";
import { describe, expect, it } from "vitest";
import {
  addDecision,
  decisionSlug,
  listDecisions,
  searchDecisions,
} from "../src/lib/decisions.js";
import { tmpDir, writeAi } from "./helpers.js";

describe("decisionSlug", () => {
  it("transliterates Turkish letters", () => {
    expect(decisionSlug("Çağrı yönetimi: ığüşöç")).toBe("cagri-yonetimi-igusoc");
    expect(decisionSlug("İSTANBUL")).toBe("istanbul");
  });
  it("falls back to decision", () => {
    expect(decisionSlug("???")).toBe("decision");
  });
  it("truncates to 60 chars without trailing dash", () => {
    const slug = decisionSlug(`${"a".repeat(59)} bbbbbbbbbbbbbbbbbbbb`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe("a".repeat(59));
  });
});

describe("addDecision", () => {
  it("writes the exact file", async () => {
    const root = await tmpDir();
    const d = await addDecision(root, { title: "Use Postgres", body: "Because.", date: "2026-10-08" });
    expect(d).toEqual({ path: ".ai/story/2026-10-08-use-postgres.md", date: "2026-10-08", title: "Use Postgres" });
    expect(await fs.readFile(path.join(root, d.path), "utf8")).toBe(
      "# Use Postgres\n\nDate: 2026-10-08\n\nBecause.\n",
    );
  });
  it("defaults date to today (UTC)", async () => {
    const root = await tmpDir();
    const d = await addDecision(root, { title: "X", body: "b" });
    expect(d.date).toBe(new Date().toISOString().slice(0, 10));
  });
  it("adds -2 on collision, and after a suffix", async () => {
    const root = await tmpDir();
    const a = { title: "Use Postgres", body: "b", date: "2026-10-08" };
    await addDecision(root, a);
    expect((await addDecision(root, a)).path).toBe(".ai/story/2026-10-08-use-postgres-2.md");
    expect((await addDecision(root, a)).path).toBe(".ai/story/2026-10-08-use-postgres-3.md");
    expect((await addDecision(root, { ...a, suffix: "a1b2" })).path).toBe(".ai/story/2026-10-08-use-postgres-a1b2.md");
    expect((await addDecision(root, { ...a, suffix: "a1b2" })).path).toBe(".ai/story/2026-10-08-use-postgres-a1b2-2.md");
  });
  it("rejects unsafe date and suffix", async () => {
    const root = await tmpDir();
    await expect(addDecision(root, { title: "X", body: "b", date: "../x" })).rejects.toThrow("date");
    await expect(addDecision(root, { title: "X", body: "b", suffix: "../../x" })).rejects.toThrow("suffix");
    await expect(addDecision(root, { title: "X", body: "b", suffix: "a".repeat(33) })).rejects.toThrow("suffix");
    expect(await fs.pathExists(path.join(root, ".ai/story"))).toBe(false);
  });
  it("refuses to write through symlinked .ai or .ai/story", async () => {
    const outside = await tmpDir();
    const r1 = await tmpDir();
    await fs.symlink(outside, path.join(r1, ".ai"));
    await expect(addDecision(r1, { title: "X", body: "b" })).rejects.toThrow("refusing to follow a symlink: .ai/story");
    const r2 = await tmpDir();
    await fs.ensureDir(path.join(r2, ".ai"));
    await fs.symlink(outside, path.join(r2, ".ai/story"));
    await expect(addDecision(r2, { title: "X", body: "b" })).rejects.toThrow("refusing to follow a symlink: .ai/story");
    expect(await fs.readdir(outside)).toEqual([]);
  });
  it("collapses whitespace in the title header", async () => {
    const root = await tmpDir();
    const d = await addDecision(root, { title: "A\n\n  B\tC ", body: "b", date: "2026-10-08" });
    expect(d.title).toBe("A B C");
    expect(await fs.readFile(path.join(root, d.path), "utf8")).toBe("# A B C\n\nDate: 2026-10-08\n\nb\n");
  });
  it("rejects oversized body", async () => {
    const root = await tmpDir();
    await expect(addDecision(root, { title: "Big", body: "x".repeat(4001) })).rejects.toThrow(
      "decision exceeds 4000 characters",
    );
    expect(await fs.pathExists(path.join(root, ".ai/story"))).toBe(false);
  });
  it("caps the whole rendered file, header included", async () => {
    const root = await tmpDir();
    const header = "# Big\n\nDate: 2026-10-08\n\n".length + 1;
    await expect(
      addDecision(root, { title: "Big", body: "x".repeat(4000 - header + 1), date: "2026-10-08" }),
    ).rejects.toThrow("decision exceeds 4000 characters");
    const d = await addDecision(root, { title: "Big", body: "x".repeat(4000 - header), date: "2026-10-08" });
    expect((await fs.readFile(path.join(root, d.path), "utf8")).length).toBe(4000);
  });
  it("rejects an empty or whitespace-only title", async () => {
    const root = await tmpDir();
    await expect(addDecision(root, { title: "", body: "b" })).rejects.toThrow("decision title is required");
    await expect(addDecision(root, { title: " \n\t ", body: "b" })).rejects.toThrow("decision title is required");
    expect(await fs.pathExists(path.join(root, ".ai/story"))).toBe(false);
  });
});

describe("listDecisions / searchDecisions", () => {
  async function seed() {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/story/2026-01-01-old.md": "# Old Postgres\n\nDate: 2026-01-01\n\nold\n",
      ".ai/story/2026-10-08-new.md": "# New\n\nDate: 2026-10-08\n\nwe pick POSTGRES\n",
      ".ai/story/2026-05-05-mid.md": "# Mid\n\nno date line here\n",
      ".ai/story/notes.txt": "ignore",
      ".ai/story/sub/2026-12-12-nested.md": "# Nested\n",
    });
    return root;
  }
  it("lists newest first using file name dates", async () => {
    const root = await seed();
    expect(await listDecisions(root)).toEqual([
      { path: ".ai/story/2026-10-08-new.md", date: "2026-10-08", title: "New" },
      { path: ".ai/story/2026-05-05-mid.md", date: "2026-05-05", title: "Mid" },
      { path: ".ai/story/2026-01-01-old.md", date: "2026-01-01", title: "Old Postgres" },
    ]);
  });
  it("searches case-insensitively in title and body", async () => {
    const root = await seed();
    const r = await searchDecisions(root, "postgres");
    expect(r.truncated).toBe(false);
    expect(r.entries.map((e) => e.path)).toEqual([
      ".ai/story/2026-10-08-new.md",
      ".ai/story/2026-01-01-old.md",
    ]);
    expect(r.entries[0]!.text).toContain("we pick POSTGRES");
  });
  it("falls back to file name title and breaks date ties by name descending", async () => {
    const root = await tmpDir();
    await writeAi(root, {
      ".ai/story/2026-03-03-aaa.md": "no heading\n",
      ".ai/story/2026-03-03-bbb.md": "# Bee\n",
    });
    expect(await listDecisions(root)).toEqual([
      { path: ".ai/story/2026-03-03-bbb.md", date: "2026-03-03", title: "Bee" },
      { path: ".ai/story/2026-03-03-aaa.md", date: "2026-03-03", title: "aaa" },
    ]);
  });
  it("respects limitBytes", async () => {
    const root = await seed();
    const r = await searchDecisions(root, "postgres", { limitBytes: 50 });
    expect(r.truncated).toBe(true);
    expect(r.entries.length).toBe(1);
  });
  it("handles a missing story dir", async () => {
    const root = await tmpDir();
    expect(await listDecisions(root)).toEqual([]);
    expect(await searchDecisions(root, "x")).toEqual({ entries: [], truncated: false });
  });
  it("ignores a symlinked story dir and symlinked files", async () => {
    const root = await tmpDir();
    const outside = await tmpDir();
    await writeAi(outside, { "2026-01-01-x.md": "# X\npostgres\n" });
    await fs.ensureDir(path.join(root, ".ai"));
    await fs.symlink(outside, path.join(root, ".ai/story"));
    expect(await listDecisions(root)).toEqual([]);
    const root2 = await tmpDir();
    await writeAi(root2, { ".ai/story/2026-02-02-real.md": "# Real\n" });
    await fs.symlink(path.join(outside, "2026-01-01-x.md"), path.join(root2, ".ai/story/2026-03-03-link.md"));
    expect((await listDecisions(root2)).map((d) => d.title)).toEqual(["Real"]);
  });
});
