# Project Context & Rules

## Context files
- `rules.md` is the always-on source of truth. Keep it small. Add a convention when the user states one.
- `active-context.md` is current work only (aim for under 80 lines). Do not append session novels.
- `story.md` is rare decisions. Search it; do not preload it.
- Do not touch every context file on each change.

## Project
CLI to standardise git-committed AI context. TypeScript, Node, pnpm.

## CLI
- `commander` for commands, `@clack/prompts` for interactive input.
- Keep CLI output concise.
- Logic lives in `src/lib/` so commands stay thin and tests hit real code.

## Tests
- Vitest in `tests/`. Run with `pnpm test`.
- New command behavior needs a failing test first.

## Git
- Conventional Commits.
- Do not commit unless asked.
