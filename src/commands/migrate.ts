import { confirm, outro } from "@clack/prompts";
import chalk from "chalk";
import { hasClineBank } from "../lib/cline.js";
import { migrateBank } from "../lib/migrate.js";

export async function migrateCommand(
  dir: string | undefined,
  options: { yes?: boolean; compact?: boolean },
): Promise<void> {
  const root = dir ?? process.cwd();

  if (!options.yes) {
    const cline = await hasClineBank(root);
    const base = cline
      ? "Convert the Cline Memory Bank (memory-bank/) into .ai/ and write the v2 contract? Originals are copied, not deleted."
      : "Rewrite the v1 every-task contract to v2 (retrieval-first)?";
    const ok = await confirm({
      message: options.compact ? `${base} Then compact over-cap files.` : base,
    });
    if (ok !== true) {
      outro("Cancelled.");
      return;
    }
  }

  const result = await migrateBank(root, { compact: options.compact === true });
  if (result.changed.length === 0 && result.notes.length === 0) {
    console.log(chalk.green("Already on v2."));
    return;
  }
  for (const file of result.changed) {
    console.log(chalk.cyan(`updated  ${file}`));
  }
  for (const note of result.notes) {
    console.log(chalk.yellow(`note     ${note}`));
  }
}
