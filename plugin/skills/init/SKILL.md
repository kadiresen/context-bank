---
name: init
description: Create a Context Bank (.ai/ files, AGENTS.md, thin CLAUDE.md) in this project. Never overwrites existing files.
disable-model-invocation: true
---

1. If `memory-bank/` exists (Cline Memory Bank), do not run init; suggest `npx -y context-bank@3.0.3 migrate`, which converts it into `.ai/`. If `.ai/` already exists, do not run init. Suggest `/context-bank:doctor` instead, and `npx -y context-bank@3.0.3 migrate` if it is an old v1 or v2 bank.
2. Otherwise run `npx -y context-bank@3.0.3 init --yes` from the project root (`$CLAUDE_PROJECT_DIR`).
3. Offer to fill `.ai/rules.md` with the stack and conventions you can read from the repo (package manifest, lint and test config). Keep it short; ask before adding conventions you are guessing.
4. Do not commit; the user reviews the new files.
