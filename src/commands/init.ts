import { intro, outro, confirm, spinner, text } from "@clack/prompts";
import fs from "fs-extra";
import path from "path";
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
  // When running from source (ts-node), templates are in ../../templates
  // When running from dist (node), templates are in ../../templates (copied during build)
  // We need to ensure templates are included in the build or package.
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
    const itemsToCopy = [".ai", ".cursorrules", ".windsurfrules", ".github"];

    for (const item of itemsToCopy) {
      const srcPath = path.join(templateDir, item);
      const destPath = path.join(targetDir, item);

      if (fs.existsSync(srcPath)) {
        // Check if destination exists
        if (fs.existsSync(destPath)) {
          // For now, we skip existing files to be safe, or we could ask.
          // Let's just overwrite for MVP or maybe log it.
          // A better UX would be to ask, but let's stick to simple first.
          // We will use overwrite=false logic effectively by checking existence.

          // Actually, let's just copy and overwrite for now as this is "init",
          // but maybe backup?
          // Let's stick to standard "copy" behavior (overwrite).
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

    s.stop(chalk.green("Context initialized!"));

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
