import path from "node:path";
import fs from "fs-extra";

export const BANK_FILES = [
  "rules.md",
  "active-context.md",
  "architecture.md",
  "roadmap.md",
  "story.md",
] as const;

export type BankFile = (typeof BANK_FILES)[number];

export async function readIfExists(filePath: string): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) return null;
  return fs.readFile(filePath, "utf-8");
}

export function aiPath(root: string, file: string): string {
  return path.join(root, ".ai", file);
}

export function agentsPath(root: string): string {
  return path.join(root, "AGENTS.md");
}
