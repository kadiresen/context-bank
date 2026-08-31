import path from "node:path";
import fs from "fs-extra";
import {
  V2_AGENTS_MD,
  V2_ARCH_BANNER,
  V2_CLAUDE_MD,
  V2_ROADMAP_BANNER,
  V2_RULES_PROTOCOL,
  isLegacyContract,
} from "./contract.js";
import { compactBank } from "./compact.js";
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
  if (/## ⚠️ MANDATORY: MEMORY MANAGEMENT PROTOCOL/.test(text)) {
    return text.replace(
      /## ⚠️ MANDATORY: MEMORY MANAGEMENT PROTOCOL[\s\S]*?(?=\n## )/,
      `${V2_RULES_PROTOCOL.trim()}\n\n`,
    );
  }
  if (isLegacyContract(text) && !text.includes("## Context files")) {
    return `${V2_RULES_PROTOCOL.trim()}\n\n${text}`;
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
): Promise<{ changed: string[] }> {
  const changed: string[] = [];

  const write = async (rel: string, body: string) => {
    await fs.writeFile(path.join(root, rel), body.endsWith("\n") ? body : `${body}\n`);
    changed.push(rel);
  };

  const agents = await readIfExists(agentsPath(root));
  if (agents === null || isLegacyContract(agents) || agents.includes("Context Bank")) {
    await write("AGENTS.md", V2_AGENTS_MD);
  }

  const claudePath = path.join(root, "CLAUDE.md");
  const claude = await readIfExists(claudePath);
  if (claude === null || isLegacyContract(claude) || claude.includes("@AGENTS.md")) {
    await write("CLAUDE.md", V2_CLAUDE_MD);
  }

  const banners: Record<string, string> = {
    "active-context.md": "",
    "story.md": "",
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

  return { changed: [...new Set(changed)] };
}
