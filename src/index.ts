#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compactCommand } from "./commands/compact.js";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { migrateCommand } from "./commands/migrate.js";

const program = new Command();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = fs.readJsonSync(path.join(__dirname, "../package.json"));

program
  .name("context-bank")
  .description("Git-committed, tool-agnostic project context for AI agents")
  .version(packageJson.version);

program
  .command("init")
  .description("Create a v2 context bank in the current directory")
  .option("-y, --yes", "Skip confirmation prompt")
  .option(
    "--legacy-pointers",
    "Also write Cursor/Windsurf/Copilot/Aider/Gemini pointer files",
  )
  .action(initCommand);

program
  .command("doctor")
  .description("Check bank size, v1 contract leftovers, and stale markers")
  .argument("[dir]", "Project root", ".")
  .action(async (dir: string) => {
    await doctorCommand(path.resolve(dir));
  });

program
  .command("compact")
  .description("Archive overflow; keep live files short")
  .argument("[dir]", "Project root", ".")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--dry-run", "Show what would change")
  .action(async (dir: string, options: { yes?: boolean; dryRun?: boolean }) => {
    await compactCommand(path.resolve(dir), options);
  });

program
  .command("migrate")
  .description("Upgrade a v1 bank to the v2 retrieval-first contract")
  .argument("[dir]", "Project root", ".")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--compact", "Also compact over-cap files")
  .action(async (dir: string, options: { yes?: boolean; compact?: boolean }) => {
    await migrateCommand(path.resolve(dir), options);
  });

program.parse(process.argv);
