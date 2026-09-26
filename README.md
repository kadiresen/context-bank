<!-- AI-CONTEXT: .ai/rules.md -->
# Context Bank

[![npm version](https://img.shields.io/npm/v/context-bank.svg)](https://www.npmjs.com/package/context-bank)
[![npm downloads](https://img.shields.io/npm/dm/context-bank.svg)](https://www.npmjs.com/package/context-bank)
[![license](https://img.shields.io/npm/l/context-bank.svg)](LICENSE)

**Your memory bank is eating your context window.** Context Bank keeps AI project memory small, in git, and shared by every tool your team uses.

Memory-bank setups tell the agent to read every file at the start of every task and to append after every change. Banks grow without limit and each session pays for all of it. Context Bank inverts that: capped live files, history that is searched instead of preloaded, and a `doctor` command that measures the damage.

![context-bank doctor finds a bloated v1 bank, migrate --compact fixes it, doctor reports healthy](docs/demo.svg)

```bash
npx context-bank init      # new project
npx context-bank doctor    # measure an existing bank
```

Works with anything that reads **`AGENTS.md`**: Claude Code, Codex, Cursor, Copilot, OpenCode, Gemini CLI, Grok.

## Real numbers

Four real banks that grew under the old "read everything, update after every task" contract, before and after `context-bank migrate --compact`. Tokens are estimated as characters / 4.

| Project | Loaded every session before | Always-read after (`rules` + `active-context`) | Plus `roadmap` + `architecture` when needed |
|---|---:|---:|---:|
| Web app A | ~435k tokens | ~2k tokens | ~29k tokens |
| Web app B | ~227k tokens | ~2k tokens | ~23k tokens |
| Workflow service | ~81k tokens | ~3k tokens | ~8k tokens |
| Mobile app | ~58k tokens | ~2k tokens | ~10k tokens |

Nothing is deleted: overflow is copied into `.ai/archive/`, and `story.md` stays searchable.

## How it compares

| | Context Bank | Cline Memory Bank | Plain `AGENTS.md` / `CLAUDE.md` | Native tool memory |
|---|---|---|---|---|
| Lives in git, reviewed in PRs | Yes | Yes | Yes | No, per user and per machine |
| Shared by the whole team | Yes | Yes | Yes | No |
| Works across tools | Yes, via `AGENTS.md` | Built for Cline | Yes | No, one tool only |
| Loaded per session | Small capped files | Every file, every task | The whole file | Tool decides |
| History | `story.md`, searched on demand | Grows inside the loaded files | None, or grows inside the file | Opaque |
| Size limits and measurement | Caps + `doctor` | None | None | None |
| Cleanup tooling | `compact`, `migrate` | Manual | Manual | Manual |

## The files

| File | Role |
|---|---|
| `.ai/rules.md` | Always read. Stack and conventions. Keep small. |
| `.ai/active-context.md` | Current work only (~80 lines). |
| `.ai/roadmap.md` | Open work. Read when planning. |
| `.ai/architecture.md` | Current shape, not a changelog. Read when structure matters. |
| `.ai/story.md` | Rare decisions. **Do not preload.** Search it. |

`AGENTS.md` carries the contract, so every tool that reads it gets the same instructions. Claude Code gets a thin `CLAUDE.md` that imports it (`@AGENTS.md`).

## New project

```bash
npx context-bank init
```

Default writes `.ai/` + `AGENTS.md` + a thin `CLAUDE.md`. Cursor/Windsurf/Copilot/Aider/Gemini pointer files are opt-in:

```bash
npx context-bank init --legacy-pointers
```

`init` never overwrites an existing `.ai/` file or `AGENTS.md`. It is **not** an upgrade path.

## Existing banks (v1)

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

`init`, `compact` and `migrate` accept `--yes` to skip the confirmation prompt (useful in scripts and CI).

## License

MIT © [Kadir Esen](https://github.com/kadiresen)
