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
  isLegacyContract,
} from "./contract.js";
import { CLINE_ARCHIVE, hasClineBank, importClineBank } from "./cline.js";
import { compactBank } from "./compact.js";
import { migrateStoryToV3 } from "./migrate-v3.js";
import { BANK_FILES, aiPath, agentsPath, readIfExists } from "./scan.js";

export type MigrateOptions = {
  compact?: boolean;
  date?: string;
};

function stripBlockquoteBanner(text: string): string {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i].trim() === "" || /^# /.test(lines[i]))) {
    i += 1;
  }
  if (i < lines.length && (lines[i].startsWith("> **⚠️") || lines[i].startsWith(">"))) {
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
): { text: string; note?: string } {
  const crlf = (t: string) => t.replace(/\n/g, "\r\n");
  const v2Trim = v2.trimEnd();
  const v3Trim = v3.trimEnd();
  if (text.includes(v2Trim)) return { text: text.replace(v2Trim, () => v3Trim) };
  if (text.includes(crlf(v2Trim))) {
    return { text: text.replace(crlf(v2Trim), () => crlf(v3Trim)) };
  }
  if (isLegacyContract(text)) return { text: v3 };
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
): Promise<{ changed: string[]; notes: string[] }> {
  const changed: string[] = [];
  const notes: string[] = [];

  const write = async (rel: string, body: string) => {
    const full = body.endsWith("\n") ? body : `${body}\n`;
    if ((await readIfExists(path.join(root, rel))) === full) return;
    await fs.writeFile(path.join(root, rel), full);
    changed.push(rel);
  };

  if (
    (await hasClineBank(root)) &&
    !(await fs.pathExists(path.join(root, CLINE_ARCHIVE)))
  ) {
    const cline = await importClineBank(root, {
      date: options.date ?? new Date().toISOString().split("T")[0],
    });
    changed.push(...cline.changed);
    notes.push(...cline.notes);
  }

  const agents = await readIfExists(agentsPath(root));
  if (agents === null) {
    await write("AGENTS.md", V3_AGENTS_MD);
  } else {
    const r = migrateContract(agents, V2_AGENTS_MD, V3_AGENTS_MD, true);
    if (r.note) notes.push(r.note);
    await write("AGENTS.md", r.text);
  }

  const claude = await readIfExists(path.join(root, "CLAUDE.md"));
  if (claude === null) {
    await write("CLAUDE.md", V3_CLAUDE_MD);
  } else {
    await write("CLAUDE.md", migrateContract(claude, V2_CLAUDE_MD, V3_CLAUDE_MD, false).text);
  }

  const banners: Record<string, string> = {
    "active-context.md": "",
    "architecture.md": V2_ARCH_BANNER,
    "roadmap.md": V2_ROADMAP_BANNER,
  };

  for (const name of BANK_FILES) {
    const file = aiPath(root, name);
    let text = await readIfExists(file);
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

  const date = options.date ?? new Date().toISOString().split("T")[0]!;
  const story = await migrateStoryToV3(root, { date });
  changed.push(...story.created, ...story.removed);
  if (story.created.length > 0) {
    notes.push(
      `Created ${story.created.length} ${story.created.length === 1 ? "decision" : "decisions"} in .ai/story/ from story.md and archived story files.`,
    );
  }
  const storyDir = path.join(root, ".ai/story");
  if ((await fs.pathExists(aiPath(root, "rules.md"))) && !(await fs.pathExists(storyDir))) {
    await fs.ensureDir(storyDir);
    await fs.writeFile(path.join(storyDir, ".gitkeep"), "");
    changed.push(".ai/story/.gitkeep");
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

  return { changed: [...new Set(changed)], notes };
}
