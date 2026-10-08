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

Four real banks that grew under the old contract ("read rules, active-context and roadmap before every task; update four files after every task"), before and after `context-bank migrate --compact`. Same three files on both sides. Tokens are estimated as characters / 4.

| Project | Read at session start before | Same files after | Whole bank before (incl. story, architecture) |
|---|---:|---:|---:|
| Web app A | ~241k tokens | ~5k tokens | ~435k tokens |
| Web app B | ~118k tokens | ~6k tokens | ~227k tokens |
| Workflow service | ~36k tokens | ~5k tokens | ~81k tokens |
| Mobile app | ~31k tokens | ~4k tokens | ~58k tokens |

After migrating, only `rules.md` and `active-context.md` (~2-3k tokens) are read every session; `roadmap.md` is read when planning. Nothing is deleted: overflow is copied into `.ai/archive/`, and `.ai/story/` stays searchable.

## How it compares

| | Context Bank | Cline Memory Bank | Plain `AGENTS.md` / `CLAUDE.md` | Native tool memory |
|---|---|---|---|---|
| Lives in git, reviewed in PRs | Yes | Yes | Yes | No, per user and per machine |
| Shared by the whole team | Yes | Yes | Yes | No |
| Works across tools | Yes, via `AGENTS.md` | Built for Cline | Yes | No, one tool only |
| Loaded per session | Small capped files | Every file, every task | The whole file | Tool decides |
| History | `.ai/story/`, one file per decision, searched on demand | Grows inside the loaded files | None, or grows inside the file | Opaque |
| Size limits and measurement | Caps + `doctor` | None | None | None |
| Cleanup tooling | `compact`, `migrate` | Manual | Manual | Manual |

## The files

| File | Role |
|---|---|
| `.ai/rules.md` | Always read. Stack and conventions. Keep small. |
| `.ai/active-context.md` | Current work only (~80 lines). |
| `.ai/roadmap.md` | Open work. Read when planning. |
| `.ai/architecture.md` | Current shape, not a changelog. Read when structure matters. |
| `.ai/story/` | Rare decisions, one file each (`YYYY-MM-DD-slug.md`). **Do not preload.** Search it. |

`AGENTS.md` carries the contract, so every tool that reads it gets the same instructions. Claude Code gets a thin `CLAUDE.md` that imports it (`@AGENTS.md`).

## Use as a library

The package also exports its logic, so tools can read and write a bank without shelling out to the CLI. Library functions never print or exit; they return results.

```ts
import { addDecision, searchDecisions, diagnose } from "context-bank";

await addDecision(root, { title: "Use Postgres, not Mongo", body: "Reports need joins." });
const { entries } = await searchDecisions(root, "postgres"); // [{ path, text }]
const { ok, findings } = await diagnose(root);
```

## Claude Code plugin

```bash
claude plugin marketplace add kadiresen/context-bank
claude plugin install context-bank@context-bank
```

Adds a `context-bank` skill (which file to read when, when to write, what never to write), a quiet session-start `doctor` check that only speaks up when something is wrong, and `/context-bank:doctor`, `/context-bank:compact`, `/context-bank:init`. Details in [plugin/README.md](plugin/README.md).

## Agent Skills (Codex, Cursor, Gemini CLI, OpenCode, ...)

The skill follows the [Agent Skills](https://agentskills.io) standard and uses only its standard frontmatter fields. To use it outside the plugin, copy [`plugin/skills/context-bank/`](plugin/skills/context-bank/SKILL.md) into your tool's skills directory (for Claude Code without the plugin: `.claude/skills/`).

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

## Upgrading from 2.x

Version 3 stores each decision in its own file under `.ai/story/` instead of one growing `story.md`. Run:

```bash
npx context-bank migrate
```

`migrate` splits an existing `story.md` into one file per entry (no line is lost), keeps any custom sections in your `AGENTS.md` and `CLAUDE.md`, and is safe to run twice. `doctor` reports `legacy-story` until you do.

## Coming from Cline Memory Bank

`migrate` detects `memory-bank/` and converts it:

```bash
npx context-bank migrate --compact
```

| Cline file | Goes to |
|---|---|
| `techContext.md` | `.ai/rules.md` (always read, kept small) |
| `projectbrief.md`, `productContext.md`, `systemPatterns.md` | `.ai/architecture.md` (read when structure matters) |
| `activeContext.md` | `.ai/active-context.md` |
| `progress.md` | `.ai/roadmap.md` |

The whole `memory-bank/` folder, extra docs included, is copied to `.ai/archive/cline-memory-bank/`; nothing is deleted and existing `.ai/` files are never overwritten. A dedicated `.clinerules/memory-bank.md` is backed up and replaced with a short pointer to `AGENTS.md`, so Cline stops reading every file on every task. After you review `.ai/`, delete `memory-bank/`; `doctor` reminds you until you do.

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
