# OpenCode support + README completeness (v1.1.1)

Date: 2026-06-17

- **OpenCode:** Verified no code change is needed — OpenCode reads project-root `AGENTS.md` (legacy fallback `CLAUDE.md`), both of which `init` already writes. Added it to the README integration table and tagline for visibility.
- **README polish:** Expanded the "Smart Memory" section to also list `roadmap.md` and `architecture.md` (was only `active-context.md` + `story.md`).
- **Why:** AGENTS.md being the canonical file means new AGENTS.md-native tools (like OpenCode) are supported for free; the gap was documentation, not behavior.
- Patch version bump 1.1.0 → 1.1.1 (docs only, no code change).
