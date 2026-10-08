# Architecture

Current shape of the system, not a changelog. Update when the structure actually changes.

## High-level
CLI that scaffolds and maintains a git-committed `.ai/` bank plus `AGENTS.md`. v3 is retrieval-first: agents load `rules.md`, skim `active-context.md`, and search `.ai/story/` (one file per decision) instead of preloading it.

## Layout
```
src/
  index.ts              # commander: init, doctor, compact, migrate
  commands/             # prompts + chalk
  lib/
    index.ts            # library entry (import from "context-bank")
    contract.ts         # v2/v3 AGENTS/CLAUDE text, caps
    scan.ts
    version.ts          # bankVersion: 1, 2, 3 or null
    decisions.ts        # one file per decision in .ai/story/ (add, list, search)
    doctor.ts
    compact.ts          # archive overflow, do not delete
    migrate.ts          # v1/v2 -> v3, owned pointer files
    migrate-v3.ts       # splits story.md into .ai/story/ decision files
    init-bank.ts        # default: .ai + AGENTS + CLAUDE
templates/              # copied by init
tests/                  # vitest
```

## Commands
- `init` copies templates; `--legacy-pointers` adds Cursor/Windsurf/Copilot/Aider/Gemini files
- `doctor` reports missing files, leftover v1 contract, size caps, stale markers
- `compact` copies overflow into `.ai/archive/` and rewrites live files
- `migrate` upgrades v1/v2 banks to v3: contract text, banners, gitattributes, pointer files, and splits `story.md` into `.ai/story/`

## Deliberate non-goals
Language-specific template packs, remote registries, `context-bank.json`.
