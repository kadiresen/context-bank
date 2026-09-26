import path from "node:path";
import fs from "fs-extra";
import {
  V2_ACTIVE_BANNER,
  V2_ARCH_BANNER,
  V2_ROADMAP_BANNER,
  V2_RULES_PROTOCOL,
  V2_STORY_BANNER,
} from "./contract.js";
import { aiPath, readIfExists } from "./scan.js";

export const CLINE_DIR = "memory-bank";
export const CLINE_ARCHIVE = ".ai/archive/cline-memory-bank";

const CLINE_CORE = [
  "projectbrief.md",
  "productContext.md",
  "systemPatterns.md",
  "techContext.md",
  "activeContext.md",
  "progress.md",
] as const;

const CLINE_POINTER = `# Context Bank

This project's memory moved from \`memory-bank/\` to \`.ai/\` (Context Bank). Follow \`AGENTS.md\`: read \`.ai/rules.md\` always and \`.ai/active-context.md\` when resuming. Do not read every file on every task, and do not recreate \`memory-bank/\`.
`;

export function isClineContract(text: string): boolean {
  return /read ALL memory bank files/i.test(text);
}

export async function hasClineBank(root: string): Promise<boolean> {
  for (const name of CLINE_CORE) {
    if (await fs.pathExists(path.join(root, CLINE_DIR, name))) return true;
  }
  return false;
}

// .clinerules can be a single file or a directory of .md files.
export async function findClineContracts(
  root: string,
): Promise<{ rel: string; dedicated: boolean }[]> {
  const base = path.join(root, ".clinerules");
  if (!(await fs.pathExists(base))) return [];
  const stat = await fs.stat(base);
  if (stat.isFile()) {
    const text = await fs.readFile(base, "utf-8");
    return isClineContract(text) ? [{ rel: ".clinerules", dedicated: false }] : [];
  }
  const found: { rel: string; dedicated: boolean }[] = [];
  for (const name of await fs.readdir(base)) {
    if (!name.endsWith(".md")) continue;
    const text = await fs.readFile(path.join(base, name), "utf-8");
    if (isClineContract(text)) {
      found.push({ rel: `.clinerules/${name}`, dedicated: /memory-?bank/i.test(name) });
    }
  }
  return found;
}

// Drop the file's own H1; optionally push remaining headings one level down.
function embed(text: string, demote: boolean): string {
  const lines = text.replace(/^\s+/, "").split("\n");
  if (lines[0]?.startsWith("# ")) lines.shift();
  let fenced = false;
  const out = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (demote && !fenced && /^#{1,5} /.test(line)) return `#${line}`;
    return line;
  });
  return out.join("\n").trim();
}

function section(title: string, body: string | null): string {
  return body ? `## ${title}\n\n${embed(body, true)}\n\n` : "";
}

export async function importClineBank(
  root: string,
  options: { date: string },
): Promise<{ changed: string[]; notes: string[] }> {
  const changed: string[] = [];
  const notes: string[] = [];
  const src = async (name: string) => readIfExists(path.join(root, CLINE_DIR, name));

  const brief = await src("projectbrief.md");
  const product = await src("productContext.md");
  const patterns = await src("systemPatterns.md");
  const tech = await src("techContext.md");
  const active = await src("activeContext.md");
  const progress = await src("progress.md");

  const extras = (await fs.readdir(path.join(root, CLINE_DIR))).filter(
    (name) => !(CLINE_CORE as readonly string[]).includes(name),
  );
  const archiveRel = `${CLINE_ARCHIVE}/${CLINE_DIR}/`;

  const targets: Record<string, string> = {
    "rules.md": `# Project Context & Rules\n\n${V2_RULES_PROTOCOL.trim()}\n\n${section("Tech context", tech)}`,
    "architecture.md": `# Architecture\n\n${V2_ARCH_BANNER.trim()}\n\n${section("Product brief", brief)}${section("Product context", product)}${section("System patterns", patterns)}${extras.length ? `More docs from the old memory bank: \`${archiveRel}\`\n` : ""}`,
    "active-context.md": `# Active Context\n\n${V2_ACTIVE_BANNER.trim()}\n\n${active ? embed(active, false) : "## Current Focus\n-"}\n`,
    "roadmap.md": `# Roadmap\n\n${V2_ROADMAP_BANNER.trim()}\n\n${progress ? embed(progress, false) : "## Upcoming\n-"}\n`,
    "story.md": `# Story\n\n${V2_STORY_BANNER.trim()}\n\n### ${options.date} - Migrated from Cline Memory Bank\n- Moved \`memory-bank/\` into \`.ai/\`. Originals are in \`${archiveRel}\`.\n- Replaced Cline's read-every-file-on-every-task instruction with the retrieval-first contract in \`AGENTS.md\`.\n`,
  };

  await fs.ensureDir(path.join(root, ".ai"));
  for (const [name, body] of Object.entries(targets)) {
    const file = aiPath(root, name);
    if (await fs.pathExists(file)) {
      notes.push(`.ai/${name} already existed; left as is. Merge anything missing from ${archiveRel} by hand.`);
      continue;
    }
    await fs.writeFile(file, `${body.trimEnd()}\n`);
    changed.push(`.ai/${name}`);
  }

  await fs.copy(path.join(root, CLINE_DIR), path.join(root, CLINE_ARCHIVE, CLINE_DIR), {
    overwrite: false,
  });
  notes.push(
    `memory-bank/ was copied to ${archiveRel} and left in place. Review .ai/, then delete memory-bank/ so Cline stops loading it.`,
  );

  for (const { rel, dedicated } of await findClineContracts(root)) {
    if (!dedicated) {
      notes.push(
        `${rel} still tells Cline to read every memory bank file on every task. Remove that part by hand and point it to AGENTS.md.`,
      );
      continue;
    }
    await fs.copy(path.join(root, rel), path.join(root, CLINE_ARCHIVE, rel), { overwrite: false });
    await fs.writeFile(path.join(root, rel), CLINE_POINTER);
    changed.push(rel);
  }

  return { changed, notes };
}
