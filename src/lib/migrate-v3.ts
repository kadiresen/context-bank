import path from "node:path";
import fs from "fs-extra";
import { CAPS, V2_STORY_BANNER } from "./contract.js";
import { STORY_DIR, addDecision } from "./decisions.js";
import { LEGACY_STORY } from "./scan.js";

const INCEPTION_DATE = "0000-00-00";

type Section = { date: string | null; title: string; body: string };

function chunkBody(body: string, cap: number): string[] {
  if (body.length <= cap) return [body];
  const chunks: string[] = [];
  let cur = "";
  const flush = () => {
    if (cur.trim()) chunks.push(cur.replace(/^\n+|\n+$/g, ""));
    cur = "";
  };
  for (let line of body.split("\n")) {
    while (line.length > cap) {
      if (cur) flush();
      chunks.push(line.slice(0, cap));
      line = line.slice(cap);
    }
    if (cur.length + line.length + 1 > cap) flush();
    cur += (cur ? "\n" : "") + line;
  }
  flush();
  return chunks;
}

/** Drops the title line and known context-bank banners; returns what is left. */
function stripPreamble(pre: string, kind: "story" | "archive"): string {
  const banner = V2_STORY_BANNER.trim();
  const lines = pre.split("\n");
  const out: string[] = [];
  let titleDropped = false;
  let inLegacy = false;
  for (const line of lines) {
    const t = line.trim();
    if (inLegacy) {
      if (t.startsWith(">")) continue;
      inLegacy = false;
    }
    if (!titleDropped) {
      if (/^# /.test(line) && out.every((l) => l.trim() === "")) {
        titleDropped = true;
        continue;
      }
      if (t !== "" && !/^# /.test(line)) titleDropped = true;
    }
    if (t === "> **⚠️ MANDATORY AI AGENT INSTRUCTION:**") {
      inLegacy = true;
      continue;
    }
    const unquoted = t.replace(/^>\s?/, "");
    if (unquoted === banner) continue;
    if (unquoted.startsWith("Older entries: `.ai/archive/")) continue;
    if (kind === "archive" && /^Moved from `\.ai\/story\.md` so the live file/.test(t)) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

function parseSections(content: string): { preamble: string; sections: Section[] } {
  const parts = content.split(/(?:^|\n)(?=### )/);
  const first = parts[0] ?? "";
  const hasPreamble = !first.startsWith("### ");
  const preamble = hasPreamble ? first : "";
  const sections = (hasPreamble ? parts.slice(1) : parts).map((raw) => {
    const nl = raw.indexOf("\n");
    const heading = (nl < 0 ? raw : raw.slice(0, nl)).replace(/^### /, "").trim();
    const body = (nl < 0 ? "" : raw.slice(nl + 1)).replace(/^\s*\n|\s+$/g, "");
    const m = /^(\d{4}-\d{2}-\d{2})\s*(?:[-:\u2013\u2014]\s*)?(.*)$/.exec(heading);
    if (m) return { date: m[1]!, title: m[2]!.trim() || "Decision", body };
    return { date: null, title: heading || "Decision", body };
  });
  return { preamble, sections };
}

async function isRegularFile(p: string): Promise<boolean> {
  const st = await fs.lstat(p).catch(() => null);
  return st !== null && st.isFile();
}

async function findPlaceholders(root: string): Promise<string[]> {
  const dir = path.join(root, STORY_DIR);
  const st = await fs.lstat(dir).catch(() => null);
  if (!st || !st.isDirectory()) return [];
  const found: string[] = [];
  for (const name of await fs.readdir(dir)) {
    if (!/-project-inception(-\d+)?\.md$/.test(name)) continue;
    const text = await fs.readFile(path.join(dir, name), "utf8");
    if (/^# Project inception\n\nDate: \d{4}-\d{2}-\d{2}\n\nVision: \[Initial project goal\]\n?$/.test(text)) {
      found.push(`${STORY_DIR}/${name}`);
    }
  }
  return found;
}

/**
 * Splits v2 `.ai/story.md` and `.ai/archive/story-*.md` into one decision file per
 * `### ` section. Writes every decision first, verifies, and only then removes sources.
 */
export async function migrateStoryToV3(
  root: string,
  opts: { date: string },
): Promise<{ created: string[]; removed: string[] }> {
  const cap = CAPS["decision"]!;
  const sources: { rel: string; kind: "story" | "archive"; fallbackDate: string }[] = [];

  const archiveDir = path.join(root, ".ai/archive");
  const archSt = await fs.lstat(archiveDir).catch(() => null);
  if (archSt?.isDirectory()) {
    for (const name of (await fs.readdir(archiveDir)).sort()) {
      if (!/^story-.*\.md$/.test(name)) continue;
      const rel = `.ai/archive/${name}`;
      if (!(await isRegularFile(path.join(root, rel)))) continue;
      const d = /^story-(\d{4}-\d{2}-\d{2})/.exec(name);
      sources.push({ rel, kind: "archive", fallbackDate: d ? d[1]! : opts.date });
    }
  }
  const storyRel = `.ai/${LEGACY_STORY}`;
  if (await isRegularFile(path.join(root, storyRel))) {
    sources.push({ rel: storyRel, kind: "story", fallbackDate: opts.date });
  }

  const created: string[] = [];
  const removed: string[] = [];
  const expected: { rel: string; body: string }[] = [];

  const put = async (title: string, body: string, date: string) => {
    const chunks = chunkBody(body, cap);
    for (let i = 0; i < chunks.length; i++) {
      const t = chunks.length > 1 ? `${title} (part ${i + 1})` : title;
      const d = await addDecision(root, { title: t, body: chunks[i]!, date });
      created.push(d.path);
      expected.push({ rel: d.path, body: chunks[i]! });
    }
  };

  const placeholders = await findPlaceholders(root);

  try {
  for (const src of sources) {
    const content = (await fs.readFile(path.join(root, src.rel), "utf8")).replace(/\r\n/g, "\n");
    const { preamble, sections } = parseSections(content);
    const rest = stripPreamble(preamble, src.kind);
    if (rest) {
      if (src.kind === "story") {
        await put("Project inception", rest, INCEPTION_DATE);
      } else {
        await put("Archived story notes", rest, src.fallbackDate);
      }
    }
    for (const s of sections) {
      await put(s.title, s.body, s.date ?? src.fallbackDate);
    }
  }

  for (const e of expected) {
    const text = await fs.readFile(path.join(root, e.rel), "utf8").catch(() => null);
    if (text === null || !text.includes(e.body)) {
      throw new Error(`failed to verify migrated decision ${e.rel}; sources left untouched`);
    }
  }
  } catch (err) {
    for (const rel of created) await fs.remove(path.join(root, rel)).catch(() => undefined);
    throw err;
  }

  for (const src of sources) {
    await fs.remove(path.join(root, src.rel));
    removed.push(src.rel);
  }
  const inceptionMade = created.some((c) => c.includes("/0000-00-00-project-inception"));
  if (inceptionMade) {
    for (const p of placeholders) {
      await fs.remove(path.join(root, p));
      removed.push(p);
    }
  }
  return { created, removed };
}
