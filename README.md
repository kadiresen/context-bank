<!-- AI-CONTEXT: .ai/rules.md -->
# Context Bank

**The `git init` for AI context.** Git-committed, tool-agnostic project memory. Retrieval-first.

Works with anything that reads **`AGENTS.md`**: Claude Code, Grok, Codex, Cursor, Copilot, OpenCode, Gemini CLI.

Latest on npm: **2.0.1**.

## Why

Native agent memory is siloed (Grok's `~/.grok/memory/`, Claude's session memory). Switching tools drops it. Context Bank keeps the project's brain in the repo.

v1 told agents to rewrite four markdown files after every task. That inverted the original "token saver" claim: live banks grew to hundreds of thousands of tokens. **v2 inverts the contract.**

| File | v2 role |
|---|---|
| `.ai/rules.md` | Always read. Stack and conventions. Keep small. |
| `.ai/active-context.md` | Current work only (~80 lines). |
| `.ai/roadmap.md` | Open work. |
| `.ai/architecture.md` | Current shape, not a changelog. Not auto-summarized. |
| `.ai/story.md` | Rare decisions. **Do not preload.** Search it. |

## New project

```bash
npx context-bank init
```

Default writes `.ai/` + `AGENTS.md` + a thin `CLAUDE.md` (`@AGENTS.md`). Cursor/Windsurf/Copilot/Aider/Gemini pointer files are opt-in:

```bash
npx context-bank init --legacy-pointers
```

`init` never overwrites an existing `.ai/` file or `AGENTS.md`. It is **not** an upgrade path.

## Existing v1 banks

`init` will not migrate you. Run:

```bash
context-bank migrate             # rewrite the v1 every-task contract; does not delete bank content
context-bank migrate --compact   # then archive overflow into .ai/archive/ (copy, not delete)
```

Then skim `.ai/active-context.md` and `.ai/archive/`. `architecture.md` stays as-is if it is over the size cap; `doctor` will warn.

## Commands

```bash
context-bank doctor              # size caps, leftover v1 contract, stale markers
context-bank compact             # archive overflow into .ai/archive/
context-bank compact --dry-run
context-bank migrate
context-bank migrate --compact
```

## License

MIT © [Kadir Esen](https://github.com/kadiresen)
