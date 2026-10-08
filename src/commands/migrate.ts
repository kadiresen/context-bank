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
      ? "Convert the Cline Memory Bank (memory-bank/) into .ai/ and write the v3 contract? Originals are copied, not deleted."
      : "Migrate to Context Bank 3 (retrieval-first contract, one file per decision in .ai/story/)?";
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
    console.log(chalk.green("Already on v3."));
    return;
  }
  const removed = new Set(result.removed);
  for (const file of result.changed) {
    if (!removed.has(file)) console.log(chalk.cyan(`updated  ${file}`));
  }
  for (const file of result.removed) {
    console.log(chalk.gray(`removed  ${file}`));
  }
  for (const note of result.notes) {
    console.log(chalk.yellow(`note     ${note}`));
  }
}
