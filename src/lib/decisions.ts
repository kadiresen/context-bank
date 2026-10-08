import path from "node:path";
import fs from "fs-extra";
import { CAPS } from "./contract.js";

export type Decision = { path: string; date: string; title: string };

export const STORY_DIR = ".ai/story";

const DEFAULT_LIMIT_BYTES = 16_000;
const FILE_RE = /^(\d{4}-\d{2}-\d{2})-(.*)\.md$/;

export function decisionSlug(title: string): string {
  const slug = title
    .replace(/İ/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "decision";
}

export async function addDecision(
  root: string,
  d: { title: string; body: string; date?: string; suffix?: string },
): Promise<Decision> {
  const cap = CAPS["decision"]!;
  if (d.body.length > cap) {
    throw new Error(`decision body exceeds ${cap} characters`);
  }
  const date = d.date ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("decision date must be YYYY-MM-DD");
  }
  if (d.suffix !== undefined && !(d.suffix.length <= 32 && /^[a-z0-9][a-z0-9-]*$/i.test(d.suffix))) {
    throw new Error("decision suffix must be 1-32 letters, digits or dashes");
  }
  const title = d.title.replace(/\s+/g, " ").trim();
  for (const rel of [".ai", STORY_DIR]) {
    const st = await fs.lstat(path.join(root, rel)).catch(() => null);
    if (st?.isSymbolicLink()) {
      throw new Error("refusing to write through a symlinked .ai/story");
    }
  }
  const base = `${date}-${decisionSlug(title)}${d.suffix ? `-${d.suffix}` : ""}`;
  const dir = path.join(root, STORY_DIR);
  await fs.ensureDir(dir);
  const content = `# ${title}\n\nDate: ${date}\n\n${d.body}\n`;
  for (let n = 1; ; n++) {
    const name = n === 1 ? `${base}.md` : `${base}-${n}.md`;
    try {
      await fs.writeFile(path.join(dir, name), content, { flag: "wx" });
      return { path: `${STORY_DIR}/${name}`, date, title };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
}

type Raw = Decision & { text: string; name: string };

async function readAll(root: string): Promise<Raw[]> {
  const dir = path.join(root, STORY_DIR);
  let dirStat;
  try {
    dirStat = await fs.lstat(dir);
  } catch {
    return [];
  }
  if (!dirStat.isDirectory()) return [];
  const out: Raw[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const text = await fs.readFile(path.join(dir, entry.name), "utf8");
    const m = FILE_RE.exec(entry.name);
    const date = m ? m[1]! : "";
    const fallback = (m ? m[2]! : entry.name.replace(/\.md$/, ""));
    const heading = /^# (.*)$/m.exec(text);
    out.push({
      path: `${STORY_DIR}/${entry.name}`,
      date,
      title: heading ? heading[1]!.trim() : fallback,
      text,
      name: entry.name,
    });
  }
  return out.sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.name < b.name ? 1 : -1,
  );
}

export async function listDecisions(root: string): Promise<Decision[]> {
  return (await readAll(root)).map(({ path: p, date, title }) => ({ path: p, date, title }));
}

export async function searchDecisions(
  root: string,
  query: string,
  opts: { limitBytes?: number } = {},
): Promise<{ entries: { path: string; text: string }[]; truncated: boolean }> {
  const limit = opts.limitBytes ?? DEFAULT_LIMIT_BYTES;
  const needle = query.toLowerCase();
  const entries: { path: string; text: string }[] = [];
  let used = 0;
  let truncated = false;
  for (const r of await readAll(root)) {
    if (!r.text.toLowerCase().includes(needle)) continue;
    const size = Buffer.byteLength(r.text, "utf8");
    if (used + size > limit) {
      truncated = true;
      continue;
    }
    used += size;
    entries.push({ path: r.path, text: r.text });
  }
  return { entries, truncated };
}
