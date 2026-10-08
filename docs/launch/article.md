# My AI memory bank grew to 240k tokens per session. Here is what I got wrong.

In December 2025 I shipped a small CLI called [Context Bank](https://github.com/kadiresen/context-bank). The idea was simple and, I still think, right: keep your AI coding agent's project memory in the repo, in plain markdown under `.ai/`, committed to git. Every tool reads it (Claude Code, Codex, Cursor, Copilot, Gemini CLI), every teammate gets it, and it survives switching tools.

The pitch was "save tokens: stop re-explaining your project every session".

Eight months later, on my own projects, the agent was reading up to **~241k tokens of memory before every task**. This post is about how that happened, and what I changed.

## The contract I wrote

The `AGENTS.md` that v1 generated said this:

```text
MANDATORY: After EVERY task, you MUST update these .ai/ files:
1. active-context.md - Current state, recent changes, next steps.
2. roadmap.md - Mark completed features [x], add planned ones.
3. story.md - Append dated entry for milestones/decisions.
4. architecture.md - Update on structural/design changes.
Do NOT ask permission. Do NOT skip. Just update them.
```

And `rules.md` told the agent to read `rules.md`, `active-context.md` and `roadmap.md` before starting any task.

Read three files at the start. Write four files at the end. Every task.

## What agents actually did

They obeyed. That is the whole problem.

"Update `active-context.md` after every task" does not produce a short note about current work. It produces a diary. Each task appends "recent changes", nobody ever deletes the old ones, and the file the agent reads first becomes a transcript of every session since the project started. Status markers get written and never cleared (one of my banks still said "not committed yet" about work that was already in git). `roadmap.md` accumulates every completed checkbox ever.

Here is what four of my real projects looked like, measured on copies of the banks (tokens estimated as characters / 4):

| Project | Read at session start (rules + active-context + roadmap) | Whole bank |
|---|---:|---:|
| Web app A | ~241k tokens | ~435k tokens |
| Web app B | ~119k tokens | ~229k tokens |
| Workflow service | ~36k tokens | ~81k tokens |
| Mobile app | ~31k tokens | ~58k tokens |

The tool I built to save tokens was spending more tokens than any re-explanation ever could. And a bigger context is not just more expensive: the useful lines (what are we doing right now?) were buried under months of history the agent had to wade through first.

## Why it happens

Three things, in hindsight obvious:

1. **Appending is the cheapest edit an agent can make.** Asked to "update" a file, an agent adds lines. Rewriting or deleting feels risky, so it rarely happens.
2. **"After every task" turns memory into a log.** Most tasks do not change the project's current focus, its roadmap or its architecture. Forcing an update anyway produces noise.
3. **Git already is the log.** Diffs, commit messages and file history already record what changed. Copying that into markdown duplicates it, in the one place that gets loaded every session.

Cline's Memory Bank pattern has the same shape ("read ALL memory bank files at the start of EVERY task"), and I suspect many homegrown setups do too.

## v2: invert the contract

Context Bank v2 keeps the files and flips the rules:

- **Read little.** Only `rules.md` (stack and conventions) and `active-context.md` (current work, ~80 lines) are read every session. `roadmap.md` when planning, `architecture.md` when structure matters.
- **History is searched, not preloaded.** `story.md` holds rare decisions a future agent cannot recover from git. Agents grep it when they need a past decision.
- **Write less.** Update `active-context.md` when the focus changed. Append to `story.md` only for real decisions. Never write what git already knows.
- **Caps, and a tool that measures them.** Each file has a size cap. `context-bank doctor` reports over-cap files, leftover v1 instructions and stale markers.
- **Clean up without losing anything.** `context-bank compact` moves overflow into `.ai/archive/` (copied, never deleted). `context-bank migrate` rewrites a v1 bank, or converts a Cline Memory Bank, to the new contract.

## v3: one file per decision

v2 still had one file that only grew: `story.md`. Even searched instead of preloaded, a single file of hundreds of entries is hard to grep well, and v2's `compact` had to cut old entries into an archive to keep it under its cap.

v3 replaces it with `.ai/story/`: one small file per decision, named by date and title (`2026-06-08-no-i18n-turkish-ui-english-code.md`). An agent lists the folder or greps it and opens only the decision it needs. New decisions are new files; old ones are never edited, so history does not churn in diffs. Each file has its own cap, and `migrate` splits an existing `story.md` (and anything an earlier `compact` archived) into these files without dropping an entry.

Same banks, same three files, before and after `migrate --compact` with 3.0.0:

| Project | Before | After |
|---|---:|---:|
| Web app A | ~241k tokens | ~5k tokens |
| Web app B | ~119k tokens | ~5k tokens |
| Workflow service | ~36k tokens | ~5k tokens |
| Mobile app | ~31k tokens | ~4k tokens |

Only `rules.md` and `active-context.md` (~2-3k tokens) are read every session now. The four banks' histories became 457, 167, 130 and 66 decision files, none of which is loaded until an agent goes looking for it.

## If you keep AI memory in markdown

Whatever tool you use, these held up for me:

- Measure what gets loaded every session. If you do not know the number, it is probably growing.
- Separate "current" from "history". Current work gets rewritten; history gets searched.
- Do not ask agents to update memory after every task. Ask them to update it when something they would need next time changed.
- Keep it in git. Memory that lives in the repo gets reviewed in PRs, shared with the team, and works across tools. Per-user tool memories do not.

## Try it

```bash
npx context-bank doctor            # measure an existing bank
npx context-bank migrate --compact # v1, v2 or Cline Memory Bank -> v3
npx context-bank init              # new project
```

There is also a Claude Code plugin (a skill that teaches the contract, a quiet session-start health check, and `/context-bank:doctor`, `:compact`, `:init`):

```bash
claude plugin marketplace add kadiresen/context-bank
claude plugin install context-bank@context-bank
```

**Caveats, honestly:** the numbers are my own projects, and characters / 4 is an estimate, not a tokenizer count. `compact` is heuristic: it keeps the current-focus and next-steps sections of `active-context.md`, so skim the result. Decision files keep their original wording; entries without a date in their heading need a quick look after `migrate`. `architecture.md` is never compacted automatically; if it is over its cap, it needs a human (or an agent you supervise) to rewrite it down to the current shape.

Source, MIT: https://github.com/kadiresen/context-bank
