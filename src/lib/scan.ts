import path from "node:path";
import fs from "fs-extra";

export const BANK_FILES = [
  "rules.md",
  "active-context.md",
  "architecture.md",
  "roadmap.md",
] as const;

/** v2 single-file story, still processed by migrate, compact and doctor. */
export const LEGACY_STORY = "story.md";

export type BankFile = (typeof BANK_FILES)[number];

/** Reads a regular file; returns null when it is missing or not a file (e.g. a directory). */
export async function readIfExists(filePath: string): Promise<string | null> {
  const st = await fs.stat(filePath).catch(() => null);
  if (st === null || !st.isFile()) return null;
  return fs.readFile(filePath, "utf-8");
}

function components(rel: string): string[] {
  const parts = path.normalize(rel).split(/[\\/]+/).filter((p) => p !== "" && p !== ".");
  if (path.isAbsolute(rel) || parts.includes("..")) {
    throw new Error(`refusing to leave the project root: ${rel}`);
  }
  return parts;
}

/** True when any existing component of `rel` under `root` is a symlink (dangling ones included). */
export async function hasSymlinkInPath(root: string, rel: string): Promise<boolean> {
  let cur = root;
  for (const part of components(rel)) {
    cur = path.join(cur, part);
    const st = await fs.lstat(cur).catch(() => null);
    if (st === null) return false;
    if (st.isSymbolicLink()) return true;
  }
  return false;
}

/**
 * Call right before writing `rel` under `root`: throws when any path component is a
 * symlink, so a hostile repo cannot redirect writes outside its root.
 */
export async function assertNoSymlinkPath(root: string, rel: string): Promise<void> {
  if (await hasSymlinkInPath(root, rel)) {
    throw new Error(`refusing to follow a symlink: ${rel}`);
  }
}

/** Read-side guard: a symlinked path (or a non-file) reads as absent. */
export async function readInRoot(root: string, rel: string): Promise<string | null> {
  if (await hasSymlinkInPath(root, rel)) return null;
  return readIfExists(path.join(root, rel));
}

/** Writes `rel` under `root` after the symlink guard, creating parent directories. */
export async function writeInRoot(root: string, rel: string, body: string): Promise<void> {
  await assertNoSymlinkPath(root, rel);
  await fs.ensureDir(path.dirname(path.join(root, rel)));
  await fs.writeFile(path.join(root, rel), body);
}

export function aiPath(root: string, file: string): string {
  return path.join(root, ".ai", file);
}

export function agentsPath(root: string): string {
  return path.join(root, "AGENTS.md");
}
