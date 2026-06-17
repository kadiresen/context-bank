# Roadmap

## Phase 1: Templating and Init Command
- [x] Project Setup (package.json, tsconfig)
- [x] Linting and Formatting setup (ESLint v10, Prettier)
- [x] Dogfooding (Self-implementation of .ai folder)
- [x] Create basic template files (`.ai/rules.md`, `.cursorrules`, etc.) in `templates/`
- [x] Implement `init` command using Commander and Clack
- [x] File system operations (copying templates)

## Phase 1.5: 2026 Convention Modernization (v1.1.0)
- [x] Fix Cursor rule (`alwaysApply: true`)
- [x] Wire Aider via generated `.aider.conf.yml`
- [x] Make AGENTS.md the canonical cross-tool file; `CLAUDE.md` imports it
- [x] Project-scoped Gemini `.gemini/settings.json`
- [x] Claude Stop-hook reminder via `.claude/settings.json`
- [x] Global `~/.codex/AGENTS.md` handshake (Gemini parity)
- [x] Update README integration table + structure tree

## Phase 2: Advanced Configuration
- [ ] Dynamic template selection (React, Node, Python, etc.)
- [ ] Config file support (`context-bank.json`)

## Phase 3: Registry/Remote Bank
- [ ] Fetching templates from a remote repository
