---
name: context-bank
description: Read and maintain a Context Bank (.ai/ folder with rules.md, active-context.md, roadmap.md, architecture.md, story.md, referenced from AGENTS.md). Use when a project has an .ai/ directory or its AGENTS.md mentions Context Bank, when resuming work, planning, recording a decision, or when the user asks to update project memory or context.
license: MIT
metadata:
  author: kadiresen
  homepage: https://github.com/kadiresen/context-bank
---

# Context Bank

The project keeps its AI memory in `.ai/`, committed to git and shared by the team and every tool. The files are small on purpose. Every character in an always-read file is paid for in every session, so the job is to read little and write less.

## What to read, and when

| File | Read it | Cap |
|---|---|---|
| `.ai/rules.md` | Always, at the start. Source of truth for stack and conventions. | 12k chars |
| `.ai/active-context.md` | When resuming work. Current focus only. | 8k chars, ~80 lines |
| `.ai/roadmap.md` | When planning or picking the next task. | 20k chars |
| `.ai/architecture.md` | When the structure of the system matters for the task. | 40k chars |
| `.ai/story.md` | Never preload. Search it (grep) when you need a past decision. | 30k chars |
| `.ai/archive/` | Never preload. Search it only when the live files point there. | none |

Do not read every file "to be safe". Pick the ones the task needs.

## When to write

Do not touch every context file on each change. Git already records what changed.

- `active-context.md`: update when the current focus or next steps changed. Replace stale lines; do not append a log.
- `roadmap.md`: tick or add items when open work changed. Move long completed lists to `.ai/archive/`.
- `architecture.md`: update only when the structure actually changed. Describe the current shape, not the history.
- `story.md`: append only for a decision a future agent cannot recover from git or the code (why an option was rejected, a constraint from outside the repo). A few lines per entry, headed `### YYYY-MM-DD - Title`.
- `rules.md`: add a convention only when the user states one. Keep it small.

## What never to write

- Session transcripts, step-by-step narratives, or "what I did today" logs.
- Anything git already knows: diffs, file lists, commit summaries.
- Secrets, tokens, credentials, or personal data.
- Duplicates: say a thing in one file only.
- Changes that loosen `rules.md` without the user asking.

## Keeping it healthy

- Run `npx context-bank doctor` to check caps, leftover v1 "update after every task" instructions, and stale markers.
- If a file is over its cap, run `npx context-bank compact --dry-run`, show the user what would move, and compact only with their approval. Overflow is copied to `.ai/archive/`, never deleted.
- `architecture.md` is never compacted automatically. If it is over the cap, propose a rewrite that keeps only the current shape.
- A bank still on the v1 contract needs `npx context-bank migrate` (with the user's approval).
