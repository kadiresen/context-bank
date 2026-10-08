import path from "node:path";
import fs from "fs-extra";
import { isLegacyContract } from "./contract.js";
import { readIfExists } from "./scan.js";

export type BankVersion = 1 | 2 | 3;

/** Detects which Context Bank layout lives in `root`, or null if none. */
export async function bankVersion(root: string): Promise<BankVersion | null> {
  const rules = await readIfExists(path.join(root, ".ai", "rules.md"));
  if (rules === null) {
    const agents = await readIfExists(path.join(root, "AGENTS.md"));
    return agents !== null && isLegacyContract(agents) ? 1 : null;
  }
  const storyDir = path.join(root, ".ai", "story");
  const hasStoryDir =
    (await fs.pathExists(storyDir)) && (await fs.stat(storyDir)).isDirectory();
  const hasStoryFile = await fs.pathExists(path.join(root, ".ai", "story.md"));
  return hasStoryDir && !hasStoryFile ? 3 : 2;
}
