import { intro, outro, confirm } from "@clack/prompts";
import chalk from "chalk";
import { initializeBank } from "../lib/init-bank.js";

export async function initCommand(options: {
  yes?: boolean;
  legacyPointers?: boolean;
}): Promise<void> {
  intro(chalk.bgCyan(chalk.black(" Context Bank ")));

  let proceed = options.yes;
  if (!proceed) {
    const response = await confirm({
      message: "Initialize AI context in this project?",
    });
    proceed = response === true;
  }

  if (!proceed) {
    outro("Operation cancelled.");
    process.exit(0);
  }

  try {
    await initializeBank(process.cwd(), {
      legacyPointers: options.legacyPointers === true,
    });
    outro(
      chalk.green(`
Context Bank v2 ready.

Next:
1. Fill in .ai/rules.md (stack + conventions only).
2. Put current work in .ai/active-context.md (keep it short).
3. Run \`context-bank doctor\` after the bank grows.
4. Commit the new files.
`),
    );
  } catch (error) {
    console.error(chalk.red("Init failed:"), error);
    process.exit(1);
  }
}
