import path from "node:path";
import fs from "fs-extra";
import {
  ACTIVE_CONTEXT_MAX_LINES,
  CAPS,
  V2_ACTIVE_BANNER,
} from "./contract.js";
import { LEGACY_STORY, readInRoot, writeInRoot } from "./scan.js";

export type CompactOptions = {
  date?: string;
  dryRun?: boolean;
};

export type CompactResult = {
  changed: string[];
  archived: string[];
  notes: string[];
  dryRun: boolean;
};

function today(date?: string): string {
  return date ?? new Date().toISOString().split("T")[0];
}

function extractSection(content: string, title: RegExp): string | null {
  const lines = content.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,3} /.test(lines[i]) && title.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,3} /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trimEnd();
}

function takeBudget(lines: string[], maxLines: number, maxChars: number): string[] {
  const out: string[] = [];
  let chars = 0;
  for (const line of lines) {
    if (out.length >= maxLines) break;
    if (chars + line.length > maxChars && out.length > 0) break;
    out.push(line);
    chars += line.length;
  }
  return out;
}

function compactActiveContext(content: string, archiveRel: string): string {
  const focus = extractSection(content, /current (work )?focus/i);
  const next = extractSection(content, /next steps|^##\s+next$/i);
  const parts = ["# Active Context", "", V2_ACTIVE_BANNER.trim(), ""];

  if (focus) {
    const lines = focus.split("\n");
    const heading = lines[0];
    const body = lines.slice(1).filter((l) => l.trim());
    parts.push(heading);
    parts.push(...takeBudget(body, 8, 4_000));
    parts.push("");
  }

  if (next) {
    const lines = next.split("\n");
    parts.push(lines[0]);
    parts.push(...takeBudget(lines.slice(1).filter((l) => l.trim()), 8, 1_500));
    parts.push("");
  }

  if (!focus && !next) {
    const lines = content.split("\n").filter((l) => !l.trim().startsWith(">"));
    parts.push(...takeBudget(lines, 40, 4_000));
  }

  parts.push(`Older notes: \`${archiveRel}\``);
  parts.push("");
  return parts.join("\n");
}

function compactRoadmap(content: string, archiveRel: string): {
  next: string;
  archive: string | null;
} {
  if (content.length <= CAPS["roadmap.md"]) {
    return { next: content, archive: null };
  }
  const completed = extractSection(content, /completed/i);
  const without = completed
    ? content.replace(completed, "").trimEnd()
    : content.trimEnd();
  let live = without;
  if (live.length > CAPS["roadmap.md"]) {
    live = `${takeBudget(live.split("\n"), 80, CAPS["roadmap.md"]).join("\n").trimEnd()}\n`;
  }
  const next = `${live}\n\n## Completed\nLong completed lists live in \`${archiveRel}\`.\n`;
  const archive = content;
  return { next, archive };
}

export async function compactBank(
  root: string,
  options: CompactOptions = {},
): Promise<CompactResult> {
  const date = today(options.date);
  const dryRun = options.dryRun === true;
  const changed: string[] = [];
  const archived: string[] = [];
  const notes: string[] = [];

  const uniqueArchiveRel = async (rel: string): Promise<string> => {
    if (dryRun || !(await fs.pathExists(path.join(root, rel)))) return rel;
    const parsed = path.parse(rel);
    let i = 2;
    while (await fs.pathExists(path.join(root, `${parsed.dir}/${parsed.name}-${i}${parsed.ext}`))) {
      i += 1;
    }
    return `${parsed.dir}/${parsed.name}-${i}${parsed.ext}`;
  };

  const write = async (rel: string, body: string) => {
    if (!dryRun) await writeInRoot(root, rel, body);
    changed.push(rel);
  };

  const activeRel = ".ai/active-context.md";
  const active = await readInRoot(root, activeRel);
  const activeOverCap =
    active !== null &&
    (active.length > CAPS["active-context.md"] ||
      active.split("\n").length > ACTIVE_CONTEXT_MAX_LINES);
  if (active && activeOverCap) {
    const archiveRel = await uniqueArchiveRel(
      `.ai/archive/active-context-${date}.md`,
    );
    if (!dryRun) await writeInRoot(root, archiveRel, active);
    archived.push(archiveRel);
    await write(activeRel, compactActiveContext(active, archiveRel));
  }

  if ((await readInRoot(root, `.ai/${LEGACY_STORY}`)) !== null) {
    notes.push("run migrate to move story.md into .ai/story");
  }

  const roadmap = await readInRoot(root, ".ai/roadmap.md");
  if (roadmap && roadmap.length > CAPS["roadmap.md"]) {
    const archiveRel = await uniqueArchiveRel(
      `.ai/archive/roadmap-completed-${date}.md`,
    );
    const { next, archive } = compactRoadmap(roadmap, archiveRel);
    if (archive) {
      if (!dryRun) await writeInRoot(root, archiveRel, archive);
      archived.push(archiveRel);
      await write(".ai/roadmap.md", next);
    }
  }

  return { changed, archived, notes, dryRun };
}
