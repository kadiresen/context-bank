import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { V3_AGENTS_MD, V3_CLAUDE_MD } from "./contract.js";
import { STORY_DIR, addDecision } from "./decisions.js";
import { assertNoSymlinkPath, leavesRoot, writeInRoot } from "./scan.js";

export type InitOptions = {
  legacyPointers?: boolean;
  templateDir?: string;
};

export function defaultTemplateDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../templates");
}

/** Copies template files that are missing under `root/rel`; never writes through a symlink. */
async function copyMissing(src: string, root: string, rel: string): Promise<void> {
  const stats = await fs.stat(src);
  const dest = path.join(root, rel);
  if (stats.isDirectory()) {
    if (!(await fs.pathExists(dest))) await assertNoSymlinkPath(root, rel);
    await fs.ensureDir(dest);
    for (const file of await fs.readdir(src)) {
      await copyMissing(path.join(src, file), root, path.join(rel, file));
    }
    return;
  }
  if (await fs.pathExists(dest)) return;
  await assertNoSymlinkPath(root, rel);
  await fs.copy(src, dest);
}

async function writeIfMissing(root: string, rel: string, body: string): Promise<void> {
  if (await fs.pathExists(path.join(root, rel))) return;
  await writeInRoot(root, rel, body.endsWith("\n") ? body : `${body}\n`);
}

export async function initializeBank(
  targetDir: string,
  options: InitOptions = {},
): Promise<void> {
  const templateDir = options.templateDir ?? defaultTemplateDir();
  if (!(await fs.pathExists(templateDir))) {
    throw new Error(`Template directory not found at: ${templateDir}`);
  }

  await copyMissing(path.join(templateDir, ".ai"), targetDir, ".ai");
  const storyDir = path.join(targetDir, STORY_DIR);
  const hasDecision =
    !(await leavesRoot(targetDir, STORY_DIR)) &&
    (await fs.pathExists(storyDir)) &&
    (await fs.readdir(storyDir)).some((f) => f.endsWith(".md"));
  if (!hasDecision) {
    await addDecision(targetDir, {
      title: "Project inception",
      body: "Vision: [Initial project goal]",
    });
  }
  await writeIfMissing(targetDir, "AGENTS.md", V3_AGENTS_MD);
  await writeIfMissing(targetDir, "CLAUDE.md", V3_CLAUDE_MD);

  const readmePath = path.join(targetDir, "README.md");
  const marker = "<!-- AI-CONTEXT: .ai/rules.md -->";
  // The marker is optional: a symlinked README.md is left alone instead of failing init.
  if (!(await leavesRoot(targetDir, "README.md")) && (await fs.pathExists(readmePath))) {
    const readme = await fs.readFile(readmePath, "utf-8");
    if (!readme.includes(marker)) {
      await writeInRoot(targetDir, "README.md", `${marker}\n${readme}`);
    }
  }

  if (!options.legacyPointers) return;

  const legacyItems = [
    ".cursor",
    ".windsurf",
    ".github",
    "CONVENTIONS.md",
    "GEMINI.md",
  ];
  for (const item of legacyItems) {
    const src = path.join(templateDir, item);
    if (await fs.pathExists(src)) {
      await copyMissing(src, targetDir, item);
    }
  }

  const aiderConfPath = path.join(targetDir, ".aider.conf.yml");
  if (!(await fs.pathExists(aiderConfPath))) {
    await writeInRoot(
      targetDir,
      ".aider.conf.yml",
      "# Context Bank: load project conventions read-only\nread: CONVENTIONS.md\n",
    );
  } else {
    const content = await fs.readFile(aiderConfPath, "utf-8");
    if (!content.includes("CONVENTIONS.md")) {
      await writeInRoot(
        targetDir,
        ".aider.conf.yml",
        `${content.trimEnd()}\n\n# Context Bank: load project conventions read-only\nread: CONVENTIONS.md\n`,
      );
    }
  }

  const geminiSettingsPath = path.join(targetDir, ".gemini", "settings.json");
  let geminiSettings: {
    context?: { fileName?: string | string[] } & Record<string, unknown>;
    [key: string]: unknown;
  } = {};
  if (await fs.pathExists(geminiSettingsPath)) {
    try {
      geminiSettings = await fs.readJson(geminiSettingsPath);
    } catch {
      geminiSettings = {};
    }
  }
  const existingCtx = geminiSettings.context ?? {};
  const existingNames = Array.isArray(existingCtx.fileName)
    ? existingCtx.fileName
    : existingCtx.fileName
      ? [existingCtx.fileName]
      : [];
  geminiSettings.context = {
    ...existingCtx,
    fileName: [...new Set([...existingNames, "AGENTS.md", "GEMINI.md", ".ai/rules.md"])],
  };
  await writeInRoot(targetDir, ".gemini/settings.json", `${JSON.stringify(geminiSettings, null, 2)}\n`);
}
