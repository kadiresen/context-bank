# v2 shipped: retrieval-first contract

Date: 2026-08-31

- CLI: `init` (default `.ai/` + AGENTS.md + CLAUDE.md; `--legacy-pointers` opt-in), `doctor`, `compact`, `migrate`.
- Compact archives overflow into `.ai/archive/` and does not overwrite an existing archive file.
- Vitest 13 passing. peykfinans dogfood: live bank ~1.3MB -> ~4k active-context + archives of the v1 originals.
- Architecture snapshots are not auto-summarized (doctor warns if over cap).
- Published to npm as v2.0.1 on 2026-08-31.
