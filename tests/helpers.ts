import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

export async function tmpDir(prefix = "context-bank-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function writeAi(
  root: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const dest = path.join(root, rel);
    await fs.ensureDir(path.dirname(dest));
    await fs.writeFile(dest, content);
  }
}
