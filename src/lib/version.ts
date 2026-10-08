import path from "node:path";
import fs from "fs-extra";
import { hasContextBankMarker, isLegacyContract } from "./contract.js";
import { hasSymlinkInPath, readIfExists, readInRoot } from "./scan.js";

export type BankVersion = 1 | 2 | 3;

/** Detects which Context Bank layout lives in `root`, or null if none. */
export async function bankVersion(root: string): Promise<BankVersion | null> {
  const rules = await readInRoot(root, ".ai/rules.md");
  if (rules === null) {
    const agents = await readIfExists(path.join(root, "AGENTS.md"));
    return agents !== null && hasContextBankMarker(agents) && isLegacyContract(agents) ? 1 : null;
  }
  const storyStat = (await hasSymlinkInPath(root, ".ai/story"))
    ? null
    : await fs.lstat(path.join(root, ".ai", "story")).catch(() => null);
  const hasStoryDir = storyStat?.isDirectory() === true;
  const hasStoryFile = (await readInRoot(root, ".ai/story.md")) !== null;
  return hasStoryDir && !hasStoryFile ? 3 : 2;
}
