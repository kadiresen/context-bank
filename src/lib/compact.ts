import path from "node:path";
import fs from "fs-extra";
import {
  ACTIVE_CONTEXT_MAX_LINES,
  CAPS,
  KEEP_STORY_ENTRIES,
  V2_ACTIVE_BANNER,
  V2_STORY_BANNER,
} from "./contract.js";
import { aiPath, readIfExists } from "./scan.js";

export type CompactOptions = {
  date?: string;
  dryRun?: boolean;
};

export type CompactResult = {
  changed: string[];
  archived: string[];
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

type StoryEntry = { text: string; index: number; date: string | null };

// Entries are ## or ### headings; banks mix both levels and both orders.
function splitStory(content: string): { preamble: string; entries: StoryEntry[] } {
  const parts = content.split(/^(?=#{2,3} )/m);
  const entries = parts.slice(1).map((text, index) => {
    const heading = text.split("\n")[0];
    const match = heading.match(/\b(\d{4}-\d{2}(?:-\d{2})?)\b/);
    return { text, index, date: match ? match[1] : null };
  });
  return { preamble: parts[0] ?? "", entries };
}

// Newest first: by heading date when most entries are dated, else by append order.
function rankNewestFirst(entries: StoryEntry[]): StoryEntry[] {
  const dated = entries.filter((e) => e.date !== null).length;
  const byDate = dated * 2 >= entries.length;
  return [...entries].sort((a, b) => {
    if (byDate) {
      const cmp = (b.date ?? "").localeCompare(a.date ?? "");
      if (cmp !== 0) return cmp;
    }
    return b.index - a.index;
  });
}

function compactStory(
  content: string,
  archiveRel: string,
): { next: string; archive: string | null } {
  const cap = CAPS["story.md"];
  const { preamble, entries } = splitStory(content);
  if (entries.length <= KEEP_STORY_ENTRIES && content.length <= cap) {
    return { next: content, archive: null };
  }

  const ranked = rankNewestFirst(entries);
  const keepFirst = (n: number): StoryEntry[] => {
    const keep = new Set(ranked.slice(0, n).map((e) => e.index));
    return entries.filter((e) => keep.has(e.index));
  };
  const build = (kept: string[]): string =>
    `${preamble.trim()}\n\n> ${V2_STORY_BANNER.trim()}\n> Older entries: \`${archiveRel}\`\n\n${kept.join("").trim()}\n`;

  let keepCount = Math.min(KEEP_STORY_ENTRIES, entries.length);
  while (keepCount > 1 && build(keepFirst(keepCount).map((e) => e.text)).length > cap) {
    keepCount -= 1;
  }
  const kept = keepFirst(keepCount);
  const keptIndexes = new Set(kept.map((e) => e.index));
  const archived = entries.filter((e) => !keptIndexes.has(e.index)).map((e) => e.text);
  let keptTexts = kept.map((e) => e.text);

  let next = build(keptTexts);
  if (next.length > cap && kept.length === 1) {
    // One entry alone is over the cap: keep its head live, archive it in full.
    const note = `\n\n_(Truncated. Full entry: \`${archiveRel}\`)_\n`;
    const budget = Math.max(0, cap - build([""]).length - note.length);
    let head = kept[0].text.slice(0, budget);
    const lastBreak = head.lastIndexOf("\n");
    if (lastBreak > 0) head = head.slice(0, lastBreak);
    keptTexts = [`${head.trimEnd()}${note}`];
    archived.push(kept[0].text);
    next = build(keptTexts);
  }

  if (archived.length === 0 && content.length <= cap) {
    return { next: content, archive: null };
  }
  const archive = `# Archived story\n\nMoved from \`.ai/story.md\` so the live file stays searchable-on-demand, not preloaded.\n\n${archived.join("").trim()}\n`;
  return { next, archive };
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
  const archiveDir = path.join(root, ".ai/archive");

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
    if (!dryRun) {
      await fs.ensureDir(path.dirname(path.join(root, rel)));
      await fs.writeFile(path.join(root, rel), body);
    }
    changed.push(rel);
  };

  const activeRel = ".ai/active-context.md";
  const active = await readIfExists(aiPath(root, "active-context.md"));
  const activeOverCap =
    active !== null &&
    (active.length > CAPS["active-context.md"] ||
      active.split("\n").length > ACTIVE_CONTEXT_MAX_LINES);
  if (active && activeOverCap) {
    const archiveRel = await uniqueArchiveRel(
      `.ai/archive/active-context-${date}.md`,
    );
    if (!dryRun) {
      await fs.ensureDir(archiveDir);
      await fs.writeFile(path.join(root, archiveRel), active);
    }
    archived.push(archiveRel);
    await write(activeRel, compactActiveContext(active, archiveRel));
  }

  const story = await readIfExists(aiPath(root, "story.md"));
  if (story) {
    const archiveRel = await uniqueArchiveRel(`.ai/archive/story-${date}.md`);
    const { next, archive } = compactStory(story, archiveRel);
    if (archive) {
      if (!dryRun) {
        await fs.ensureDir(archiveDir);
        await fs.writeFile(path.join(root, archiveRel), archive);
      }
      archived.push(archiveRel);
      await write(".ai/story.md", next);
    }
  }

  const roadmap = await readIfExists(aiPath(root, "roadmap.md"));
  if (roadmap && roadmap.length > CAPS["roadmap.md"]) {
    const archiveRel = await uniqueArchiveRel(
      `.ai/archive/roadmap-completed-${date}.md`,
    );
    const { next, archive } = compactRoadmap(roadmap, archiveRel);
    if (archive) {
      if (!dryRun) {
        await fs.ensureDir(archiveDir);
        await fs.writeFile(path.join(root, archiveRel), archive);
      }
      archived.push(archiveRel);
      await write(".ai/roadmap.md", next);
    }
  }

  return { changed, archived, dryRun };
}
