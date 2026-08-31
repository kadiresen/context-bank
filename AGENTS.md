# AI Agent Instructions

This project uses **Context Bank**. Canonical files:

- `.ai/rules.md` — stack and conventions. Always read.
- `.ai/active-context.md` — current work only. Read when resuming; keep under ~80 lines.
- `.ai/roadmap.md` — open work. Read when planning.
- `.ai/architecture.md` — current shape, not a changelog. Read when structure matters.
- `.ai/story.md` — rare decisions. Do not preload. Search when you need a past decision.

Do not touch every context file on each change. Update `active-context.md` when the current focus changed. Append `story.md` only for a decision a future agent cannot recover from git. Keep `rules.md` small.
