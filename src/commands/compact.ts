import { confirm, outro } from "@clack/prompts";
import chalk from "chalk";
import { compactBank } from "../lib/compact.js";

export async function compactCommand(
  dir: string | undefined,
  options: { yes?: boolean; dryRun?: boolean },
): Promise<void> {
  const root = dir ?? process.cwd();

  if (!options.yes && !options.dryRun) {
    const ok = await confirm({
      message:
        "Archive overflow into .ai/archive/ and shrink live files? Originals are copied, not deleted.",
    });
    if (ok !== true) {
      outro("Cancelled.");
      return;
    }
  }

  const result = await compactBank(root, { dryRun: options.dryRun === true });
  if (result.changed.length === 0) {
    console.log(chalk.green("Nothing to compact."));
    return;
  }
  const prefix = result.dryRun ? "would change" : "changed";
  for (const file of result.changed) {
    console.log(chalk.cyan(`${prefix}  ${file}`));
  }
  for (const file of result.archived) {
    console.log(chalk.gray(`archived  ${file}`));
  }
}
