# Context Bank plugin for Claude Code

Keeps AI project memory small, in git, and shared across tools. See the [main README](https://github.com/kadiresen/context-bank#readme) for the `.ai/` contract and real before/after numbers.

## Install

```bash
claude plugin marketplace add kadiresen/context-bank
claude plugin install context-bank@context-bank
```

Inside a session: `/plugin marketplace add kadiresen/context-bank`, then `/plugin install context-bank@context-bank`.

## What you get

- **Skill `context-bank`**: Claude loads it when a project has `.ai/`. It says which file to read when, when to update, and what never to write, so sessions stop preloading history.
- **Session-start check**: in projects with `.ai/`, runs `context-bank doctor` quietly. Silent when the bank is healthy; a one-line notice when files are over their caps or still use the old "update after every task" contract.
- **Commands**:
  - `/context-bank:doctor`: check caps, leftover v1 contract, stale markers.
  - `/context-bank:compact`: dry run first, then archive overflow into `.ai/archive/` after you confirm (copied, never deleted).
  - `/context-bank:init`: create `.ai/`, `AGENTS.md` and a thin `CLAUDE.md` in a new project.

## Requirements

Node.js with `npx`. The commands and the session-start check run the published CLI (`npx -y context-bank@2`); the first run downloads it from npm. If npm is unreachable, the session-start check stays silent.

## License

MIT
