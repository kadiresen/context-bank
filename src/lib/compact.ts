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

type Block = { lines: string[]; gap: boolean; kind: "para" | "list" | "fence" };

const CONTINUED_MARKER = " (continued in the archive)";
const FENCE_MARKER = "(code block continued in the archive)";
const ABBREVIATION = /(?:^|[\s(["'])(?:e\.g|i\.e|vs|[A-Za-z]|\d+)\.$/;
const HEADING = /^#{1,6}\s/;
const LIST_ITEM = /^(?:[-*+]|\d+[.)])\s/;
const FENCE = /^\s*(```|~~~)/;

/**
 * Split text lines into blocks: paragraphs (blank-line separated), list items
 * (with their indented continuation lines) and fenced code blocks (atomic).
 * `gap` records whether blank lines preceded the block in the original.
 */
function splitBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let fence: string | null = null;
  let sawBlank = false;
  const start = (kind: Block["kind"], line: string): Block => {
    const block: Block = { lines: [line], gap: sawBlank && blocks.length > 0, kind };
    blocks.push(block);
    sawBlank = false;
    return block;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence !== null && cur) {
      cur.lines.push(line);
      if (line.trim().startsWith(fence)) {
        fence = null;
        cur = null;
      }
      continue;
    }
    if (!line.trim()) {
      if (cur?.kind === "list") {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && /^\s/.test(lines[j]) && !FENCE.test(lines[j])) {
          for (let k = i; k < j; k++) cur.lines.push("");
          i = j - 1;
          continue;
        }
      }
      cur = null;
      sawBlank = true;
      continue;
    }
    const fenceOpen = FENCE.exec(line);
    if (fenceOpen) {
      cur = start("fence", line);
      fence = fenceOpen[1];
      continue;
    }
    if (LIST_ITEM.test(line)) {
      cur = start("list", line);
      continue;
    }
    if (cur && (cur.kind === "para" || /^\s/.test(line))) {
      cur.lines.push(line);
      continue;
    }
    cur = start("para", line);
  }
  return blocks;
}

function contentLines(block: Block): number {
  return block.lines.filter((l) => l.trim()).length;
}

function contentChars(block: Block): number {
  return block.lines.reduce((n, l) => n + (l.trim() ? l.length : 0), 0);
}

/** Cut a too-long block at the last sentence end, else the last whole word. */
function cutBlock(block: Block, maxLines: number, maxChars: number): string[] {
  if (block.kind === "fence") {
    const at = block.lines.findIndex((l) => FENCE.test(l));
    const heads = block.lines.slice(0, Math.max(at, 0)).filter((l) => l.trim());
    return [...heads, FENCE_MARKER];
  }
  const kept: string[] = [];
  let seen = 0;
  for (const l of block.lines) {
    if (l.trim() && ++seen > maxLines) break;
    kept.push(l);
  }
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  const text = block.lines.join("\n");
  const lineEnd = kept.join("\n").length;
  const limit = Math.max(0, Math.min(lineEnd, maxChars - CONTINUED_MARKER.length));
  const atBoundary = (p: number) => p === text.length || /\s/.test(text[p]);
  let cut = -1;
  for (let p = limit; p > 0; p--) {
    if (
      atBoundary(p) &&
      /[.!?]/.test(text[p - 1]) &&
      !(text[p - 1] === "." && ABBREVIATION.test(text.slice(0, p)))
    ) {
      cut = p;
      break;
    }
  }
  if (cut < 0) {
    for (let p = limit; p > 0; p--) {
      if (atBoundary(p) && !/\s/.test(text[p - 1])) {
        cut = p;
        break;
      }
    }
  }
  const head = cut > 0 ? text.slice(0, cut).trimEnd() : "";
  if (!head) return [CONTINUED_MARKER.trim()];
  return `${head}${CONTINUED_MARKER}`.split("\n");
}

/** Glue each heading-only block to the block after it. */
function glueHeadings(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (next && b.lines.length === 1 && HEADING.test(b.lines[0])) {
      out.push({
        kind: next.kind,
        gap: b.gap,
        lines: [...b.lines, ...(next.gap ? [""] : []), ...next.lines],
      });
      i++;
    } else out.push(b);
  }
  return out;
}

function takeBlocks(
  lines: string[],
  maxLines: number,
  maxChars: number,
  fallback = false,
): string[] {
  let blocks = splitBlocks(lines);
  if (fallback) {
    if (blocks[0]?.lines.length === 1 && /^#\s/.test(blocks[0].lines[0])) {
      blocks = blocks.slice(1);
      if (blocks[0]) blocks[0].gap = false;
    }
    blocks = glueHeadings(blocks);
  }
  const out: string[] = [];
  let count = 0;
  let chars = 0;
  for (const [i, block] of blocks.entries()) {
    const n = contentLines(block);
    const c = contentChars(block);
    if (count + n > maxLines || chars + c > maxChars) {
      if (i === 0) return cutBlock(block, maxLines, maxChars);
      break;
    }
    if (i > 0 && block.gap) out.push("");
    out.push(...block.lines);
    count += n;
    chars += c;
  }
  return out;
}

function compactActiveContext(content: string, archiveRel: string): string {
  const focus = extractSection(content, /current (work )?focus/i);
  const next = extractSection(content, /next steps|^##\s+next$/i);
  const parts = ["# Active Context", "", V2_ACTIVE_BANNER.trim(), ""];

  if (focus) {
    const lines = focus.split("\n");
    parts.push(lines[0]);
    parts.push(...takeBlocks(lines.slice(1), 8, 4_000));
    parts.push("");
  }

  if (next) {
    const lines = next.split("\n");
    parts.push(lines[0]);
    parts.push(...takeBlocks(lines.slice(1), 8, 1_500));
    parts.push("");
  }

  if (!focus && !next) {
    const lines = content.split("\n").filter((l) => !l.trim().startsWith(">"));
    parts.push(...takeBlocks(lines, 40, 4_000, true));
    parts.push("");
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
