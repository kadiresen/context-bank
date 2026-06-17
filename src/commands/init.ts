import { intro, outro, confirm, spinner } from "@clack/prompts";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import chalk from "chalk";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initCommand(options: { yes?: boolean }) {
  intro(chalk.bgCyan(chalk.black(" Context Bank ")));

  let proceed = options.yes;

  if (!proceed) {
    const response = await confirm({
      message: "Do you want to initialize AI context in this project?",
    });

    if (typeof response === "boolean") {
      proceed = response;
    } else {
      // Handle cancellation (ctrl+c) which returns symbol or strictly check boolean
      proceed = false;
    }
  }

  if (!proceed) {
    outro("Operation cancelled.");
    process.exit(0);
  }

  // Determine paths
  const templateDir = path.resolve(__dirname, "../../templates");
  const targetDir = process.cwd();

  const s = spinner();
  s.start("Analyzing project structure...");

  // Check if templates exist
  if (!fs.existsSync(templateDir)) {
    s.stop("Error");
    console.error(
      chalk.red(`\nTemplate directory not found at: ${templateDir}`),
    );
    console.error(
      chalk.yellow(
        "Ensure you are running this from the package root or the package is built correctly.",
      ),
    );
    process.exit(1);
  }

  s.message("Copying context files...");

  try {
    // Helper for safe copying/merging
    async function copyOrMerge(src: string, dest: string, isAiDir: boolean = false) {
      const stats = await fs.stat(src);

      if (stats.isDirectory()) {
        await fs.ensureDir(dest);
        const files = await fs.readdir(src);
        for (const file of files) {
          await copyOrMerge(
            path.join(src, file),
            path.join(dest, file),
            isAiDir || path.basename(src) === ".ai"
          );
        }
      } else {
        if (await fs.pathExists(dest)) {
          if (isAiDir) {
            // Skip .ai files if they exist to protect project memory
            return;
          }

          const srcContent = await fs.readFile(src, "utf-8");
          const destContent = await fs.readFile(dest, "utf-8");

          if (!destContent.includes(srcContent.trim())) {
            // Prepend for rules files to ensure priority
            await fs.writeFile(dest, `${srcContent}\n\n${destContent}`);
          }
        } else {
          await fs.copy(src, dest);
          
          // Special handling for new story.md
          if (path.basename(dest) === "story.md" && isAiDir) {
            let storyContent = await fs.readFile(dest, "utf-8");
            storyContent = storyContent.replace(
              "[Auto-filled by init]",
              new Date().toISOString().split("T")[0],
            );
            await fs.writeFile(dest, storyContent);
          }
        }
      }
    }

    // List of files/folders to copy
    const itemsToCopy = [
      ".ai",
      ".cursor",
      ".windsurf",
      ".github",
      "CONVENTIONS.md",
      "GEMINI.md",
    ];

    for (const item of itemsToCopy) {
      const srcPath = path.join(templateDir, item);
      const destPath = path.join(targetDir, item);

      if (fs.existsSync(srcPath)) {
        await copyOrMerge(srcPath, destPath);
      }
    }

    // Special handling for README.md
    const readmePath = path.join(targetDir, "README.md");
    const aiContextMarker = "<!-- AI-CONTEXT: .ai/rules.md -->";

    if (fs.existsSync(readmePath)) {
      const readmeContent = await fs.readFile(readmePath, "utf-8");
      if (!readmeContent.includes(aiContextMarker)) {
        await fs.writeFile(readmePath, `${aiContextMarker}\n${readmeContent}`);
      }
    } else {
      const projectName = path.basename(targetDir);
      await fs.writeFile(readmePath, `${aiContextMarker}\n\n# ${projectName}\n`);
    }

    // Helper: write a pointer file that directs the AI tool to .ai/rules.md.
    // `marker` is the substring used to detect a prior Context Bank injection
    // (so we don't prepend twice). Defaults to the SSOT path.
    async function writePointerFile(
      filename: string,
      instruction: string,
      marker: string = ".ai/rules.md",
    ) {
      const filePath = path.join(targetDir, filename);
      if (fs.existsSync(filePath)) {
        const content = await fs.readFile(filePath, "utf-8");
        if (!content.includes(marker)) {
          await fs.writeFile(filePath, `${instruction}\n\n${content}`);
        }
      } else {
        await fs.writeFile(filePath, `${instruction}\n`);
      }
    }

    const mandatoryUpdateBlock = `MANDATORY: After EVERY task, you MUST update these .ai/ files:
1. active-context.md — Current state, recent changes, next steps.
2. roadmap.md — Mark completed features [x], add planned ones.
3. story.md — Append dated entry for milestones/decisions.
4. architecture.md — Update on structural/design changes.
Do NOT ask permission. Do NOT skip. Just update them.`;

    // AGENTS.md — the cross-tool open standard (Agentic AI Foundation, 2025).
    // Read natively by Codex, Cursor, GitHub Copilot, Windsurf, Jules, Zed and
    // others, so this is the canonical instruction file; tool-specific files
    // point here or are derived from it.
    await writePointerFile("AGENTS.md",
      `# AI Agent Instructions\n\nThis project uses **Context Bank**. The single source of truth for tech stack, coding standards, and architecture is **\`.ai/rules.md\`**. Before starting any task, also read **\`.ai/active-context.md\`** for the current state.\n\n\`AGENTS.md\` is the cross-tool standard read by Codex, Cursor, GitHub Copilot, Windsurf, Jules, Zed and other agents. Tool-specific files (CLAUDE.md, GEMINI.md, …) point back here or to \`.ai/rules.md\`.\n\n${mandatoryUpdateBlock}`);

    // CLAUDE.md (Claude Code) — Claude Code does not read AGENTS.md natively but
    // supports @-imports, so we import AGENTS.md instead of duplicating it.
    await writePointerFile("CLAUDE.md",
      `@AGENTS.md\n\n## Claude Code\nThe instructions imported from \`AGENTS.md\` above apply. \`.ai/rules.md\` is the single source of truth for project context, tech stack, and coding standards; \`.ai/active-context.md\` holds the current state.`,
      "@AGENTS.md");

    // Git merge strategies for branch-aware context (.gitattributes)
    const gitattrsPath = path.join(targetDir, ".gitattributes");
    const mergeRules = `# Context Bank: branch-aware merge strategies
# active-context.md is branch-specific — on merge, target branch wins (no conflict)
.ai/active-context.md merge=ours
# story.md entries are additive — on merge, combine both sides (no conflict)
.ai/story.md merge=union`;

    if (fs.existsSync(gitattrsPath)) {
      const content = await fs.readFile(gitattrsPath, "utf-8");
      if (!content.includes("Context Bank")) {
        await fs.writeFile(gitattrsPath, `${content}\n\n${mergeRules}\n`);
      }
    } else {
      await fs.writeFile(gitattrsPath, `${mergeRules}\n`);
    }

    // Aider: CONVENTIONS.md is NOT auto-loaded — it must be wired via the
    // `read:` key in .aider.conf.yml. Without this the pointer is never read.
    const aiderConfPath = path.join(targetDir, ".aider.conf.yml");
    if (fs.existsSync(aiderConfPath)) {
      const content = await fs.readFile(aiderConfPath, "utf-8");
      if (!content.includes("CONVENTIONS.md")) {
        await fs.writeFile(
          aiderConfPath,
          `${content.trimEnd()}\n\n# Context Bank: load project conventions read-only\nread: CONVENTIONS.md\n`,
        );
      }
    } else {
      await fs.writeFile(
        aiderConfPath,
        `# Context Bank: load project conventions read-only\nread: CONVENTIONS.md\n`,
      );
    }

    // Gemini CLI: project-scoped settings so AGENTS.md / GEMINI.md / .ai/rules.md
    // are loaded automatically for THIS project (preferred over a global hook).
    const geminiContextFiles = ["AGENTS.md", "GEMINI.md", ".ai/rules.md"];
    const geminiSettingsPath = path.join(targetDir, ".gemini", "settings.json");
    let geminiSettings: {
      context?: { fileName?: string | string[] } & Record<string, unknown>;
      [key: string]: unknown;
    } = {};
    if (fs.existsSync(geminiSettingsPath)) {
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
    const mergedNames = [...new Set([...existingNames, ...geminiContextFiles])];
    geminiSettings.context = { ...existingCtx, fileName: mergedNames };
    await fs.ensureDir(path.dirname(geminiSettingsPath));
    await fs.writeJson(geminiSettingsPath, geminiSettings, { spaces: 2 });

    // Claude Code: a Stop hook that reminds the agent to update the .ai/ files.
    // Prose ("you MUST update…") is context, not enforcement; a hook is the
    // documented, reliable mechanism. Non-blocking — it only surfaces a message.
    const claudeSettingsPath = path.join(targetDir, ".claude", "settings.json");
    let claudeSettings: {
      hooks?: { Stop?: unknown[] } & Record<string, unknown>;
      [key: string]: unknown;
    } = {};
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        claudeSettings = await fs.readJson(claudeSettingsPath);
      } catch {
        claudeSettings = {};
      }
    }
    const reminderCmd =
      "echo '{\"systemMessage\":\"🏦 Context Bank: update .ai/active-context.md, roadmap.md, story.md and architecture.md if this task changed anything.\"}'";
    claudeSettings.hooks = claudeSettings.hooks ?? {};
    const stopHooks: unknown[] = Array.isArray(claudeSettings.hooks.Stop)
      ? claudeSettings.hooks.Stop
      : [];
    const alreadyHasReminder = JSON.stringify(stopHooks).includes("Context Bank");
    if (!alreadyHasReminder) {
      stopHooks.push({
        hooks: [{ type: "command", command: reminderCmd }],
      });
      claudeSettings.hooks.Stop = stopHooks;
      await fs.ensureDir(path.dirname(claudeSettingsPath));
      await fs.writeJson(claudeSettingsPath, claudeSettings, { spaces: 2 });
    }

    s.stop(chalk.green("Context initialized!"));

    // Gemini CLI Global Memory Integration
    const globalGeminiDir = path.join(os.homedir(), ".gemini");
    const globalGeminiMemoryPath = path.join(globalGeminiDir, "GEMINI.md");

    if (fs.existsSync(globalGeminiMemoryPath)) {
      const memoryContent = await fs.readFile(globalGeminiMemoryPath, "utf-8");
      
      // Only ask if the rule is not already present
      if (!memoryContent.includes("[Context Bank]")) {
        const addGlobalContext = await confirm({
          message: "Found Gemini CLI global memory. Enable automatic context detection for all Context Bank projects?",
          initialValue: true
        });

        if (addGlobalContext === true) {
          const genericContextRule = `
- [Context Bank] CRITICAL INSTRUCTION:
  Before processing ANY user request in a new session, you MUST perform this initialization sequence:
  1. Check if the ".ai/" directory exists in the current working directory.
  2. If it exists, you MUST explicitly call the "read_file" tool to read ".ai/rules.md" and ".ai/active-context.md".
  3. Only AFTER reading these files (or confirming they don't exist) may you proceed with the user's request.
  This is not optional. Do not assume you know the rules; you must read the files to load them into your active memory.`;
          
          const newContent = memoryContent.endsWith("\n") 
            ? `${memoryContent}${genericContextRule}\n`
            : `${memoryContent}\n${genericContextRule}\n`;
          
          await fs.writeFile(globalGeminiMemoryPath, newContent);
          console.log(chalk.green(`✔ Enabled global context awareness for Context Bank.`));
        }
      } else {
        // Optional: Let the user know it's already active
        // console.log(chalk.gray(`ℹ Global context awareness is already active.`));
      }
    }

    // Codex CLI Global Memory Integration (mirrors the Gemini handshake).
    // Codex reads ~/.codex/AGENTS.md globally before per-project files.
    const globalCodexDir = path.join(os.homedir(), ".codex");
    if (fs.existsSync(globalCodexDir)) {
      const globalCodexPath = path.join(globalCodexDir, "AGENTS.md");
      const codexContent = fs.existsSync(globalCodexPath)
        ? await fs.readFile(globalCodexPath, "utf-8")
        : "";

      if (!codexContent.includes("[Context Bank]")) {
        const addGlobalCodex = await confirm({
          message:
            "Found Codex CLI config. Enable automatic context detection for all Context Bank projects?",
          initialValue: true,
        });

        if (addGlobalCodex === true) {
          const codexRule = `
## [Context Bank] Global rule
Before starting any task, if a ".ai/" directory exists in the working directory,
read ".ai/rules.md" and ".ai/active-context.md" first — they are the single
source of truth for project context. Do not assume the rules; load the files.`;

          const newCodexContent = codexContent
            ? `${codexContent.trimEnd()}\n${codexRule}\n`
            : `# Codex Global Instructions\n${codexRule}\n`;

          await fs.writeFile(globalCodexPath, newCodexContent);
          console.log(
            chalk.green(`✔ Enabled global context awareness for Codex CLI.`),
          );
        }
      }
    }

    outro(
      chalk.green(`
Context Bank setup complete! 🚀

Next steps:
1. Review .ai/rules.md and fill in your project details.
2. Update .ai/active-context.md with your current task.
3. Commit the new files to git.
    `),
    );
  } catch (error) {
    s.stop("Error");
    console.error(chalk.red("Failed to copy files:"), error);
    process.exit(1);
  }
}
