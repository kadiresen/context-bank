import path from "node:path";
import fs from "fs-extra";
import {
  V2_AGENTS_MD,
  V2_ARCH_BANNER,
  V2_CLAUDE_MD,
  V2_ROADMAP_BANNER,
  V2_RULES_PROTOCOL,
  V3_AGENTS_MD,
  V3_CLAUDE_MD,
  V3_RULES_PROTOCOL,
  hasCurrentContract,
  isLegacyContract,
} from "./contract.js";
import { CLINE_ARCHIVE, findClineContracts, hasClineBank, importClineBank } from "./cline.js";
import { compactBank } from "./compact.js";
import { defaultTemplateDir } from "./init-bank.js";
import { migrateStoryToV3 } from "./migrate-v3.js";
import {
  BANK_FILES,
  LEGACY_STORY,
  agentsPath,
  assertNoSymlinkPath,
  readIfExists,
  readInRoot,
  writeInRoot,
} from "./scan.js";

export type MigrateOptions = {
  compact?: boolean;
  date?: string;
};

const V1_BANNER_LINE = "> **⚠️ MANDATORY AI AGENT INSTRUCTION:**";

/** Removes the v1 MANDATORY banner block under the title; any other blockquote is user content. */
function stripBlockquoteBanner(text: string): string {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i].trim() === "" || /^# /.test(lines[i]))) {
    i += 1;
  }
  if (i < lines.length && lines[i].trim() === V1_BANNER_LINE) {
    const start = i;
    while (i < lines.length && (lines[i].startsWith(">") || lines[i].trim() === "")) {
      i += 1;
    }
    const head = lines.slice(0, start);
    const tail = lines.slice(i);
    return [...head, ...tail].join("\n").replace(/\n{3,}/g, "\n\n");
  }
  return text;
}

function replaceRulesProtocol(text: string): string {
  if (text.includes(V2_RULES_PROTOCOL.trim())) {
    return text.replace(V2_RULES_PROTOCOL.trim(), () => V3_RULES_PROTOCOL.trim());
  }
  if (/## ⚠️ MANDATORY: MEMORY MANAGEMENT PROTOCOL/.test(text)) {
    return text.replace(
      /## ⚠️ MANDATORY: MEMORY MANAGEMENT PROTOCOL[\s\S]*?(?=\n## |$)/,
      `${V3_RULES_PROTOCOL.trim()}\n\n`,
    );
  }
  if (isLegacyContract(text) && !text.includes("## Context files")) {
    return `${V3_RULES_PROTOCOL.trim()}\n\n${text}`;
  }
  return text;
}

function ensureBanner(text: string, banner: string): string {
  if (text.includes(banner.trim())) return text;
  const lines = text.split("\n");
  if (lines[0]?.startsWith("# ")) {
    return `${lines[0]}\n\n${banner.trim()}\n\n${lines.slice(1).join("\n").trimStart()}`;
  }
  return `${banner.trim()}\n\n${text}`;
}

function migrateContract(
  text: string,
  v2: string,
  v3: string,
  hasStoryRef: boolean,
): { text: string; note?: string; replaced?: boolean } {
  const crlf = (t: string) => t.replace(/\n/g, "\r\n");
  const v2Trim = v2.trimEnd();
  const v3Trim = v3.trimEnd();
  if (text.includes(v2Trim)) return { text: text.replace(v2Trim, () => v3Trim) };
  if (text.includes(crlf(v2Trim))) {
    return { text: text.replace(crlf(v2Trim), () => crlf(v3Trim)) };
  }
  if (hasCurrentContract(text)) return { text };
  if (isLegacyContract(text)) return { text: v3, replaced: true };
  if (!hasStoryRef || !text.includes("Context Bank") || !/story\.md/.test(text)) {
    return { text };
  }
  const v2Lines = v2.split("\n");
  const v3Lines = v3.split("\n");
  const map = new Map<string, string>();
  v2Lines.forEach((line, i) => {
    if (line.includes("story.md") && v3Lines.length === v2Lines.length) {
      map.set(line, v3Lines[i]!);
    }
  });
  const next = text
    .split("\n")
    .map((line) => {
      const cr = line.endsWith("\r") ? "\r" : "";
      const bare = cr ? line.slice(0, -1) : line;
      const to = map.get(bare);
      return to === undefined ? line : `${to}${cr}`;
    })
    .join("\n");
  if (/story\.md/.test(next)) {
    return {
      text: next,
      note: "AGENTS.md has a customized contract; update its story.md reference to .ai/story/ by hand",
    };
  }
  return { text: next };
}

const POINTER_FILES = [
  "GEMINI.md",
  "CONVENTIONS.md",
  ".cursor/rules/context-bank.mdc",
  ".windsurf/rules/context-bank.md",
  ".github/copilot-instructions.md",
];

// Files generated and owned by context-bank: a legacy v1 copy is replaced wholesale.
const OWNED_POINTER_FILES = [".cursor/rules/context-bank.mdc", ".windsurf/rules/context-bank.md"];

function stripContextBankGitattributes(text: string): string {
  const withoutBlock = text.replace(
    /# Context Bank: branch-aware merge strategies[\s\S]*?(?:\n\.ai\/story\.md merge=union)?\n?/,
    "",
  );
  return withoutBlock
    .split("\n")
    .filter(
      (line) =>
        !line.includes(".ai/active-context.md merge=ours") &&
        !line.includes(".ai/story.md merge=union"),
    )
    .join("\n")
    .trimEnd();
}

export async function migrateBank(
  root: string,
  options: MigrateOptions = {},
): Promise<{ changed: string[]; removed: string[]; notes: string[] }> {
  const changed: string[] = [];
  const removed: string[] = [];
  const notes: string[] = [];

  const day = options.date ?? new Date().toISOString().split("T")[0]!;

  const write = async (rel: string, body: string) => {
    const full = body.endsWith("\n") ? body : `${body}\n`;
    const st = await fs.stat(path.join(root, rel)).catch(() => null);
    if (st !== null && !st.isFile()) {
      notes.push(`${rel} is not a regular file; left as is`);
      return;
    }
    if ((await readIfExists(path.join(root, rel))) === full) return;
    await writeInRoot(root, rel, full);
    changed.push(rel);
  };

  /** Copies a file's original text to a unique `.ai/archive/<basename>-<date>.md`. */
  const archiveOriginal = async (rel: string, text: string): Promise<string> => {
    const base = path.basename(rel).replace(/\.[^.]+$/, "");
    let archiveRel = `.ai/archive/${base}-${day}.md`;
    for (let n = 2; await fs.pathExists(path.join(root, archiveRel)); n++) {
      archiveRel = `.ai/archive/${base}-${day}-${n}.md`;
    }
    await writeInRoot(root, archiveRel, text);
    changed.push(archiveRel);
    return archiveRel;
  };

  /** Writes a migrated contract; a wholesale replacement archives the original first. */
  const writeContract = async (
    rel: string,
    original: string,
    r: { text: string; note?: string; replaced?: boolean },
  ) => {
    if (r.note) notes.push(r.note);
    if (r.replaced && r.text !== original) {
      await assertNoSymlinkPath(root, rel);
      const archiveRel = await archiveOriginal(rel, original);
      notes.push(
        `${rel} used the v1 every-task update contract and was replaced with the v3 contract. The original is in ${archiveRel}; copy any of your own sections back by hand.`,
      );
    }
    await write(rel, r.text);
  };

  // Pre-flight: refuse before writing anything if a fixed target leaves the repo.
  const importCline =
    (await hasClineBank(root)) && !(await fs.pathExists(path.join(root, CLINE_ARCHIVE)));
  const targets = new Set([
    "AGENTS.md",
    "CLAUDE.md",
    ".ai",
    ".ai/story",
    ".ai/archive",
    ".gitattributes",
    ...BANK_FILES.map((name) => `.ai/${name}`),
    `.ai/${LEGACY_STORY}`,
    ...OWNED_POINTER_FILES,
    ...POINTER_FILES,
  ]);
  if (importCline) {
    targets.add(CLINE_ARCHIVE);
    for (const { rel } of await findClineContracts(root)) targets.add(rel);
  }
  for (const rel of targets) await assertNoSymlinkPath(root, rel);

  if (importCline) {
    const cline = await importClineBank(root, { date: day });
    changed.push(...cline.changed);
    notes.push(...cline.notes);
  }

  const agents = await readIfExists(agentsPath(root));
  if (agents === null) {
    await write("AGENTS.md", V3_AGENTS_MD);
  } else {
    await writeContract("AGENTS.md", agents, migrateContract(agents, V2_AGENTS_MD, V3_AGENTS_MD, true));
  }

  const claude = await readIfExists(path.join(root, "CLAUDE.md"));
  if (claude === null) {
    await write("CLAUDE.md", V3_CLAUDE_MD);
  } else {
    await writeContract("CLAUDE.md", claude, migrateContract(claude, V2_CLAUDE_MD, V3_CLAUDE_MD, false));
  }

  const banners: Record<string, string> = {
    "active-context.md": "",
    "architecture.md": V2_ARCH_BANNER,
    "roadmap.md": V2_ROADMAP_BANNER,
  };

  for (const name of BANK_FILES) {
    let text = await readInRoot(root, path.join(".ai", name));
    if (text === null) continue;
    const before = text;
    if (name === "rules.md") {
      text = replaceRulesProtocol(text);
    } else {
      text = stripBlockquoteBanner(text);
      const extra = banners[name];
      if (extra) text = ensureBanner(text, extra);
    }
    if (text !== before) {
      await write(path.join(".ai", name), text);
    }
  }

  const story = await migrateStoryToV3(root, { date: day });
  changed.push(...story.created, ...story.removed);
  removed.push(...story.removed);
  if (story.created.length > 0) {
    notes.push(
      `Created ${story.created.length} ${story.created.length === 1 ? "decision" : "decisions"} in .ai/story/ from story.md and archived story files.`,
    );
  }
  if (story.undated.length > 0) {
    const n = story.undated.length;
    notes.push(
      `${n} ${n === 1 ? "decision had" : "decisions had"} no date in the heading and took the nearest dated entry's date; check: ${story.undated.join(", ")}`,
    );
  }
  const storyDir = path.join(root, ".ai/story");
  if ((await readInRoot(root, ".ai/rules.md")) !== null && !(await fs.pathExists(storyDir))) {
    await writeInRoot(root, ".ai/story/.gitkeep", "");
    changed.push(".ai/story/.gitkeep");
  }

  for (const rel of OWNED_POINTER_FILES) {
    const text = await readInRoot(root, rel);
    if (text === null || !isLegacyContract(text, { ownedFile: true })) continue;
    const tpl = await readIfExists(path.join(defaultTemplateDir(), rel));
    if (tpl === null) continue;
    const archiveRel = await archiveOriginal(rel, text);
    notes.push(`${rel} used the v1 contract and was replaced with the current template. The original is in ${archiveRel}.`);
    await write(rel, tpl);
  }

  for (const rel of POINTER_FILES) {
    const text = await readIfExists(path.join(root, rel));
    if (text === null || !text.includes(".ai/story.md")) continue;
    const next = text
      .replace(/(`\.ai\/[^`\n]+`) \u2014 /g, "$1: ")
      .replace(/\.ai\/story\.md/g, ".ai/story/");
    await write(rel, next);
  }

  const gitattrs = path.join(root, ".gitattributes");
  const attrs = await readIfExists(gitattrs);
  if (attrs && (attrs.includes("merge=ours") || attrs.includes("Context Bank"))) {
    const next = stripContextBankGitattributes(attrs);
    if (next !== attrs) {
      await write(".gitattributes", next.trim() ? next : "");
    }
  }

  if (options.compact) {
    const compact = await compactBank(root, { date: options.date });
    changed.push(...compact.changed);
  }

  return { changed: [...new Set(changed)], removed: [...new Set(removed)], notes };
}
