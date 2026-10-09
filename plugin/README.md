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
- **Session-start check**: in projects with `.ai/`, runs `context-bank doctor` quietly. Silent when the bank is healthy; a one-line notice when files are over their caps or still use the old "update after every task" contract or a single-file v2 story.
- **Commands**:
  - `/context-bank:doctor`: check caps, leftover v1 contract, stale markers.
  - `/context-bank:compact`: dry run first, then archive overflow into `.ai/archive/` after you confirm (copied, never deleted).
  - `/context-bank:init`: create `.ai/`, `AGENTS.md` and a thin `CLAUDE.md` in a new project.

## Requirements

Node.js with `npx`, in Claude Code. The session-start check needs a local shell, so it does not run in claude.ai chat or Cowork; the `context-bank` skill still loads there.

## What it runs, fetches and sends

- **Runs** the published `context-bank` CLI pinned to an exact version: `npx -y context-bank@3.0.3`. The session-start hook runs `doctor` (read-only). `/context-bank:compact` and `/context-bank:init` write files only in your project, and only after you confirm.
- **Fetches** that one package (and its dependencies) from the public npm registry on first run; npx caches it afterwards. The hook exits silently if npm is unreachable.
- **Sends** nothing. The plugin makes no network requests of its own, collects no telemetry and reads no credentials.
- **Reads** only the project's `.ai/`, `AGENTS.md`, `CLAUDE.md`, `memory-bank/` and `.clinerules` files.

Source for everything above is readable in this folder and in the [CLI repository](https://github.com/kadiresen/context-bank).

## License

MIT
