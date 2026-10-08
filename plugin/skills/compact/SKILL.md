---
name: compact
description: Shrink an over-cap Context Bank by archiving overflow into .ai/archive/ (copied, never deleted).
disable-model-invocation: true
---

1. Run `npx -y context-bank@3.0.2 compact "$CLAUDE_PROJECT_DIR" --dry-run` and show the user which files would change and what would be archived.
2. Ask for confirmation. Only after a clear yes, run `npx -y context-bank@3.0.2 compact "$CLAUDE_PROJECT_DIR" --yes`.
3. Skim the new `.ai/active-context.md`. If important current work was cut, restore those few lines by hand from the archive file it points to.
4. Summarize what moved. Do not commit; the user reviews the diff.
