# Active Context

## Current State
- **v1.1.1:** Documented OpenCode support and rounded out the README; patch bump (docs only).
- **2026 Convention Modernization (v1.1.0):** Audited all tool integrations against mid-2026 conventions and fixed broken/outdated points.
- **AGENTS.md is now the canonical cross-tool file.** It carries the rich instructions; `CLAUDE.md` imports it via `@AGENTS.md`.
- Core CLI `init` and templates remain fully functional; build (lint + tsc), smoke test, and idempotency test all pass.

## Recent Changes
- **Cursor fix:** template `.mdc` now uses `alwaysApply: true` (was `globs: *`, which left the rule Agent-Requested instead of always-on).
- **Aider fix:** `init` now generates/merges `.aider.conf.yml` with `read: CONVENTIONS.md` (Aider does not auto-read CONVENTIONS.md).
- **AGENTS.md reframed** as the cross-tool standard; `CLAUDE.md` switched to `@AGENTS.md` import, removing the duplicated "mandatory update" block.
- **Gemini:** added project-scoped `.gemini/settings.json` (`context.fileName`) alongside the existing global hook.
- **Claude enforcement:** `init` writes a `.claude/settings.json` Stop-hook reminder to update `.ai/` files.
- **Codex parity:** added an optional global `~/.codex/AGENTS.md` handshake mirroring the Gemini one.
- README integration table + generated-structure tree updated; version bumped to `1.1.0`.

## Next Steps
- [ ] Manually verify the Claude Stop hook surfaces correctly in a real Claude Code session.
- [ ] Consider publishing v1.1.0 to npm.
- [ ] Start **Phase 2: Advanced Configuration** (dynamic template selection, `context-bank.json`).
