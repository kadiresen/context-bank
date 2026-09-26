---
name: init
description: Create a Context Bank (.ai/ files, AGENTS.md, thin CLAUDE.md) in this project. Never overwrites existing files.
disable-model-invocation: true
allowed-tools: Bash(npx -y context-bank@2 init *)
---

1. If `.ai/` already exists, do not run init. Suggest `/context-bank:doctor` instead, and `npx context-bank migrate` if it is an old v1 bank.
2. Otherwise run `npx -y context-bank@2 init --yes` from the project root (`$CLAUDE_PROJECT_DIR`).
3. Offer to fill `.ai/rules.md` with the stack and conventions you can read from the repo (package manifest, lint and test config). Keep it short; ask before adding conventions you are guessing.
4. Do not commit; the user reviews the new files.
