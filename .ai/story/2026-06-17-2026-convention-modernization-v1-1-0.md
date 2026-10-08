# 2026 Convention Modernization (v1.1.0)

Date: 2026-06-17

- **Audit:** Researched mid-2026 conventions for every supported tool (Cursor, Windsurf, Copilot, Claude Code, Codex, Gemini, Aider) against the early-2025 assumptions baked into the templates.
- **Why:** AI tooling moved fast — most notably `AGENTS.md` became the cross-tool open standard (OpenAI, Aug 2025 → Agentic AI Foundation, Dec 2025), and two integrations had drifted into being broken.
- **Bugs fixed:** (1) Cursor `.mdc` used `globs: *` without `alwaysApply`, so the SSOT rule was only Agent-Requested, not always-on — now `alwaysApply: true`. (2) Aider's `CONVENTIONS.md` was never auto-loaded; `init` now emits `.aider.conf.yml` with `read: CONVENTIONS.md`.
- **Modernization:** AGENTS.md reframed as the canonical cross-tool file (read natively by Codex/Cursor/Copilot/Windsurf/Jules/Zed); `CLAUDE.md` now imports it with `@AGENTS.md`, eliminating the triplicated mandatory-update block. Added project-scoped `.gemini/settings.json`, a `.claude/settings.json` Stop-hook reminder, and an optional global `~/.codex/AGENTS.md` handshake.
- **Outcome:** Build (lint + tsc) green; smoke and idempotency tests pass. Version bumped 1.0.3 → 1.1.0.
