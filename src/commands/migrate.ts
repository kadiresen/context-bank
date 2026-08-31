import { confirm, outro } from "@clack/prompts";
import chalk from "chalk";
import { migrateBank } from "../lib/migrate.js";

export async function migrateCommand(
  dir: string | undefined,
  options: { yes?: boolean; compact?: boolean },
): Promise<void> {
  const root = dir ?? process.cwd();

  if (!options.yes) {
    const ok = await confirm({
      message: options.compact
        ? "Rewrite the v1 contract to v2 and compact over-cap files?"
        : "Rewrite the v1 every-task contract to v2 (retrieval-first)?",
    });
    if (ok !== true) {
      outro("Cancelled.");
      return;
    }
  }

  const result = await migrateBank(root, { compact: options.compact === true });
  if (result.changed.length === 0) {
    console.log(chalk.green("Already on v2."));
    return;
  }
  for (const file of result.changed) {
    console.log(chalk.cyan(`updated  ${file}`));
  }
}
