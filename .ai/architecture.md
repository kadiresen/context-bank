# Architecture

Current shape of the system, not a changelog. Update when the structure actually changes.

## High-level
CLI that scaffolds and maintains a git-committed `.ai/` bank plus `AGENTS.md`. v2 is retrieval-first: agents load `rules.md`, skim `active-context.md`, and search `story.md` instead of preloading it.

## Layout
```
src/
  index.ts              # commander: init, doctor, compact, migrate
  commands/             # prompts + chalk
  lib/
    contract.ts         # v2 AGENTS/CLAUDE text, caps
    scan.ts
    doctor.ts
    compact.ts          # archive overflow, do not delete
    migrate.ts          # v1 contract -> v2
    init-bank.ts        # default: .ai + AGENTS + CLAUDE
templates/              # copied by init
tests/                  # vitest
```

## Commands
- `init` copies templates; `--legacy-pointers` adds Cursor/Windsurf/Copilot/Aider/Gemini files
- `doctor` reports missing files, leftover v1 contract, size caps, stale markers
- `compact` copies overflow into `.ai/archive/` and rewrites live files
- `migrate` rewrites AGENTS.md / banners / bad gitattributes merge rules

## Deliberate non-goals
Language-specific template packs, remote registries, `context-bank.json`.
