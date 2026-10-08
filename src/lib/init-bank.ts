import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { V3_AGENTS_MD, V3_CLAUDE_MD } from "./contract.js";
import { STORY_DIR, addDecision } from "./decisions.js";

export type InitOptions = {
  legacyPointers?: boolean;
  templateDir?: string;
};

function defaultTemplateDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../templates");
}

async function copyMissing(src: string, dest: string): Promise<void> {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    await fs.ensureDir(dest);
    for (const file of await fs.readdir(src)) {
      await copyMissing(path.join(src, file), path.join(dest, file));
    }
    return;
  }
  if (await fs.pathExists(dest)) return;
  await fs.copy(src, dest);
}

async function writeIfMissing(dest: string, body: string): Promise<void> {
  if (await fs.pathExists(dest)) return;
  await fs.writeFile(dest, body.endsWith("\n") ? body : `${body}\n`);
}

export async function initializeBank(
  targetDir: string,
  options: InitOptions = {},
): Promise<void> {
  const templateDir = options.templateDir ?? defaultTemplateDir();
  if (!(await fs.pathExists(templateDir))) {
    throw new Error(`Template directory not found at: ${templateDir}`);
  }

  await copyMissing(path.join(templateDir, ".ai"), path.join(targetDir, ".ai"));
  const storyDir = path.join(targetDir, STORY_DIR);
  const hasDecision =
    (await fs.pathExists(storyDir)) &&
    (await fs.readdir(storyDir)).some((f) => f.endsWith(".md"));
  if (!hasDecision) {
    await addDecision(targetDir, {
      title: "Project inception",
      body: "Vision: [Initial project goal]",
    });
  }
  await writeIfMissing(path.join(targetDir, "AGENTS.md"), V3_AGENTS_MD);
  await writeIfMissing(path.join(targetDir, "CLAUDE.md"), V3_CLAUDE_MD);

  const readmePath = path.join(targetDir, "README.md");
  const marker = "<!-- AI-CONTEXT: .ai/rules.md -->";
  if (await fs.pathExists(readmePath)) {
    const readme = await fs.readFile(readmePath, "utf-8");
    if (!readme.includes(marker)) {
      await fs.writeFile(readmePath, `${marker}\n${readme}`);
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
      await copyMissing(src, path.join(targetDir, item));
    }
  }

  const aiderConfPath = path.join(targetDir, ".aider.conf.yml");
  if (!(await fs.pathExists(aiderConfPath))) {
    await fs.writeFile(
      aiderConfPath,
      "# Context Bank: load project conventions read-only\nread: CONVENTIONS.md\n",
    );
  } else {
    const content = await fs.readFile(aiderConfPath, "utf-8");
    if (!content.includes("CONVENTIONS.md")) {
      await fs.writeFile(
        aiderConfPath,
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
  await fs.ensureDir(path.dirname(geminiSettingsPath));
  await fs.writeJson(geminiSettingsPath, geminiSettings, { spaces: 2 });
}
