#!/usr/bin/env node
// SessionStart: run `context-bank doctor` quietly; speak up only when the bank has findings.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (!existsSync(path.join(root, ".ai")) && !existsSync(path.join(root, "memory-bank"))) process.exit(0);

const run = spawnSync("npx", ["-y", "context-bank@3.0.1", "doctor", root], {
  cwd: root,
  encoding: "utf8",
  timeout: 25_000,
  env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
});
if (run.error || run.stdout == null) process.exit(0);

const findings = run.stdout
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^(error|warn)\s+/.test(line));
if (findings.length === 0) process.exit(0);

const legacy = findings.some((line) => /legacy-contract|cline-bank|cline-contract/.test(line));
const legacyStory = findings.some((line) => /legacy-story/.test(line));
const advice = legacyStory
  ? "The bank still has the v2 single-file story. Suggest `npx -y context-bank@3.0.1 migrate` to the user; it splits that file into one file per decision under .ai/story/. Do not preload it."
  : legacy
  ? "The bank still has the old Context Bank v1 contract (update every .ai/ file after every task) or a Cline Memory Bank read-every-file rule. Suggest `npx -y context-bank@3.0.1 migrate` to the user. Until then, skip only that update-every-file / read-every-file rule; every other instruction in AGENTS.md, CLAUDE.md and the bank still applies."
  : "Do not preload over-cap files. When it fits the work, suggest /context-bank:compact for active-context or roadmap (never without approval); architecture.md is not compacted and needs a manual rewrite to its current shape.";

process.stdout.write(
  JSON.stringify({
    systemMessage: `Context Bank: ${findings.length} finding(s). Run /context-bank:doctor for details.`,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `Context Bank doctor findings:\n${findings.join("\n")}\n${advice}`,
    },
  }),
);
