import { intro, outro, confirm, spinner, text } from "@clack/prompts";
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
    // List of files/folders to copy
    const itemsToCopy = [
      ".ai",
      ".cursorrules",
      ".windsurfrules",
      ".github",
      "CONVENTIONS.md",
    ];

    for (const item of itemsToCopy) {
      const srcPath = path.join(templateDir, item);
      const destPath = path.join(targetDir, item);

      if (fs.existsSync(srcPath)) {
        if (fs.existsSync(destPath)) {
          await fs.copy(srcPath, destPath, { overwrite: true });
        } else {
          await fs.copy(srcPath, destPath);
        }
      }
    }

    // Special handling for story.md date
    const storyPath = path.join(targetDir, ".ai/story.md");
    if (fs.existsSync(storyPath)) {
      let storyContent = await fs.readFile(storyPath, "utf-8");
      storyContent = storyContent.replace(
        "[Auto-filled by init]",
        new Date().toISOString().split("T")[0],
      );
      await fs.writeFile(storyPath, storyContent);
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
