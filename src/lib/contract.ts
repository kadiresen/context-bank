export const V2_AGENTS_MD = `# AI Agent Instructions

This project uses **Context Bank**. Canonical files:

- \`.ai/rules.md\` — stack and conventions. Always read.
- \`.ai/active-context.md\` — current work only. Read when resuming; keep under ~80 lines.
- \`.ai/roadmap.md\` — open work. Read when planning.
- \`.ai/architecture.md\` — current shape, not a changelog. Read when structure matters.
- \`.ai/story.md\` — rare decisions. Do not preload. Search when you need a past decision.

Do not touch every context file on each change. Update \`active-context.md\` when the current focus changed. Append \`story.md\` only for a decision a future agent cannot recover from git. Keep \`rules.md\` small.
`;

export const V2_CLAUDE_MD = `@AGENTS.md

## Claude Code
The instructions imported from \`AGENTS.md\` apply. \`.ai/rules.md\` is the source of truth. \`.ai/active-context.md\` is current work only.
`;

export const V2_RULES_PROTOCOL = `## Context files
- \`rules.md\` is the always-on source of truth. Keep it small. Add a convention when the user states one.
- \`active-context.md\` is current work only (aim for under 80 lines). Do not append session novels.
- \`story.md\` is rare decisions. Search it; do not preload it.
- Do not touch every context file on each change.
`;

export const V2_ACTIVE_BANNER = `Current work only. Keep this file under ~80 lines. Older notes belong in \`.ai/archive/\` or git, not here.
`;

export const V2_STORY_BANNER = `Rare decisions a future agent cannot recover from git. Do not append session transcripts. Do not preload this file; search it.
`;

export const V2_ARCH_BANNER = `Current shape of the system, not a changelog. Update when the structure actually changes.
`;

export const V2_ROADMAP_BANNER = `Open work. Move long completed lists to \`.ai/archive/\` so this file stays skimmable.
`;

export const KEEP_STORY_ENTRIES = 12;
export const ACTIVE_CONTEXT_MAX_LINES = 80;

export const CAPS: Record<string, number> = {
  "rules.md": 12_000,
  "active-context.md": 8_000,
  "architecture.md": 40_000,
  "roadmap.md": 20_000,
  "story.md": 30_000,
};

export const LEGACY_PATTERNS: RegExp[] = [
  /AFTER EVERY TASK/i,
  /DO NOT SKIP THIS UPDATE/i,
  /Do NOT ask permission\.\s*Do NOT skip/i,
  /every change matters/i,
  /no matter how small/i,
];

export function isLegacyContract(text: string): boolean {
  return LEGACY_PATTERNS.some((re) => re.test(text));
}

export function hasStaleUncommittedMarker(text: string): boolean {
  return /HENÜZ COMMIT YOK/i.test(text);
}
