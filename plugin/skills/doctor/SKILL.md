---
name: doctor
description: Check this project's Context Bank for over-cap files, leftover v1 contract text, and stale markers.
disable-model-invocation: true
allowed-tools: Bash(npx -y context-bank@2.1.0 doctor *)
---

Run `npx -y context-bank@2.1.0 doctor "$CLAUDE_PROJECT_DIR"` and report the result in a few lines.

- If it says the bank is healthy, say so and stop.
- For `over-cap` findings on active-context, roadmap or story, suggest `/context-bank:compact`.
- For `over-cap` on architecture.md, offer to rewrite it down to the current shape of the system (it is never compacted automatically).
- For `cline-bank`, `cline-leftover` or `cline-contract` findings, suggest `npx -y context-bank@2.1.0 migrate` to convert a Cline Memory Bank (or, if already converted, deleting `memory-bank/` after review).
- For `legacy-contract` findings, suggest `npx -y context-bank@2.1.0 migrate` and explain it rewrites the old "update after every task" instructions without deleting content.

Do not change any file in this command.
