#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const program = new Command();

// Read package.json to get version
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = fs.readJsonSync(path.join(__dirname, "../package.json"));

program
  .name("context-bank")
  .description("CLI to standardize AI context in projects")
  .version(packageJson.version);

program
  .command("init")
  .description("Initialize AI context files in the current directory")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(initCommand);

program.parse(process.argv);
