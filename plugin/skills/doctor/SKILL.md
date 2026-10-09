---
name: doctor
description: Check this project's Context Bank for over-cap files, leftover v1/v2 contract text, and stale markers.
disable-model-invocation: true
---

Run `npx -y context-bank@3.0.3 doctor "$CLAUDE_PROJECT_DIR"` and report the result in a few lines.

- If it says the bank is healthy, say so and stop.
- For `over-cap` findings on active-context or roadmap, suggest `/context-bank:compact`.
- For `over-cap` on architecture.md, offer to rewrite it down to the current shape of the system (it is never compacted automatically).
- For `cline-bank`, `cline-leftover` or `cline-contract` findings, suggest `npx -y context-bank@3.0.3 migrate` to convert a Cline Memory Bank (or, if already converted, deleting `memory-bank/` after review).
- For `legacy-story` findings (a single-file v2 story), suggest `npx -y context-bank@3.0.3 migrate`; it splits the file into one file per decision under `.ai/story/` without losing any line.
- For `decision-over-cap` findings, offer to split its content into new, shorter decision files. Decisions are append-only and never compacted automatically, so the oversized file stays as it is unless the user approves removing it once its content lives in the new files.
- For `missing-story-dir` findings, suggest `npx -y context-bank@3.0.3 migrate`.
- For `legacy-contract` findings, suggest `npx -y context-bank@3.0.3 migrate` and explain it rewrites the old "update after every task" instructions. When it replaces a whole file (a v1 `AGENTS.md`, `CLAUDE.md` or tool pointer file), it first copies the original to `.ai/archive/` and says so, so the user can bring back their own sections.

Do not change any file in this command.
