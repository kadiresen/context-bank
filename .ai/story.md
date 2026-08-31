# Story

## 2026-08-31 - v2 shipped: retrieval-first contract
- CLI: `init` (default `.ai/` + AGENTS.md + CLAUDE.md; `--legacy-pointers` opt-in), `doctor`, `compact`, `migrate`.
- Compact archives overflow into `.ai/archive/` and does not overwrite an existing archive file.
- Vitest 13 passing. peykfinans dogfood: live bank ~1.3MB -> ~4k active-context + archives of the v1 originals.
- Architecture snapshots are not auto-summarized (doctor warns if over cap).
- Not published to npm yet.

## 2026-08-31 - v2 kararı: archive değil, protokol tersine çevirme
- Grok/Claude native AGENTS.md + repo arama + silo memory, context-bank'in "git'te duran araç-agnostik beyin" işini ikame etmiyor. İkame edilen şey 8 pointer dosyası ve "her görevde 4 dosya güncelle" zorunluluğu.
- Kanıt (kişisel bankalar): motoatolye2-web ~466k token, peykfinans ~328k, motoatolye-web ~236k. `rules.md` hepsinde küçük kalmış; şişen `active-context` + `story`.
- CLI: tek komut, 355 satır, 2.5 aydır commit yok, test dizini yok, Grok yok. npm ~2k indirme / 9 yıldız — kamu ürünü değil, kişisel işletim sistemi.
- Karar: v2. Compact/doctor/migrate + retrieval-first sözleşme. Phase 2/3 yok.

## 2026-06-17: OpenCode support + README completeness (v1.1.1)
- **OpenCode:** Verified no code change is needed — OpenCode reads project-root `AGENTS.md` (legacy fallback `CLAUDE.md`), both of which `init` already writes. Added it to the README integration table and tagline for visibility.
- **README polish:** Expanded the "Smart Memory" section to also list `roadmap.md` and `architecture.md` (was only `active-context.md` + `story.md`).
- **Why:** AGENTS.md being the canonical file means new AGENTS.md-native tools (like OpenCode) are supported for free; the gap was documentation, not behavior.
- Patch version bump 1.1.0 → 1.1.1 (docs only, no code change).

## 2026-06-17: 2026 Convention Modernization (v1.1.0)
- **Audit:** Researched mid-2026 conventions for every supported tool (Cursor, Windsurf, Copilot, Claude Code, Codex, Gemini, Aider) against the early-2025 assumptions baked into the templates.
- **Why:** AI tooling moved fast — most notably `AGENTS.md` became the cross-tool open standard (OpenAI, Aug 2025 → Agentic AI Foundation, Dec 2025), and two integrations had drifted into being broken.
- **Bugs fixed:** (1) Cursor `.mdc` used `globs: *` without `alwaysApply`, so the SSOT rule was only Agent-Requested, not always-on — now `alwaysApply: true`. (2) Aider's `CONVENTIONS.md` was never auto-loaded; `init` now emits `.aider.conf.yml` with `read: CONVENTIONS.md`.
- **Modernization:** AGENTS.md reframed as the canonical cross-tool file (read natively by Codex/Cursor/Copilot/Windsurf/Jules/Zed); `CLAUDE.md` now imports it with `@AGENTS.md`, eliminating the triplicated mandatory-update block. Added project-scoped `.gemini/settings.json`, a `.claude/settings.json` Stop-hook reminder, and an optional global `~/.codex/AGENTS.md` handshake.
- **Outcome:** Build (lint + tsc) green; smoke and idempotency tests pass. Version bumped 1.0.3 → 1.1.0.

## 2026-03-13: Code Quality and Linting
- **Pre-build Linting:** Integrated `pnpm lint` into the `build` script to ensure that all TypeScript code passes linting before compilation. Any linting errors will now correctly break the build process.
- **ESLint Integration:** Fixed the non-functional `lint` script by installing ESLint v10 and configuring it with the new flat config format (`eslint.config.js`).
- **Dependency Management:** Added `@eslint/js`, `typescript-eslint`, and relevant parser/plugins to `devDependencies`.
- **Bug Fix:** Resolved a linting error in `src/commands/init.ts` where the `text` import was unused, ensuring the codebase remains clean and valid.
- **Workflow Improvement:** Verified that `pnpm lint` now correctly analyzes the entire `src/` directory.

## 2026-03-11: Phase 1 Completion & PR Fixes
- **PR #1 Update:** Encountered an issue where `git push` created a branch on the local fork instead of updating the PR. Resolved by adding the head repository as a remote and pushing directly to it.
- **Version Bump:** Incremented version to `0.0.10`.
- **Dogfooding Milestone:** Verified that `init` command logic correctly handles existing `.ai` files and merges rule configurations.
- **Context Synchronization:** Synchronized the project's own `.ai` files to match the standards defined in the templates.
- **Cleanup:** Deleted the accidental `feat/template-context-updates` branch from the `origin` remote to maintain repository hygiene.
