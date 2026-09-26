# Show HN draft

**Title** (80 char max):

```
Show HN: Context Bank - AI agent project memory that stays small and lives in git
```

**URL:** https://github.com/kadiresen/context-bank

**First comment** (post right after submitting):

```
Hi HN, I built Context Bank: a small CLI that keeps AI coding agents' project memory in plain markdown under .ai/, committed to git, and read by any tool that reads AGENTS.md (Claude Code, Codex, Cursor, Copilot, Gemini CLI, OpenCode).

The first version had a bad idea in it. Its instructions told agents to update four memory files after every task, and to read three of them before every task. Agents did exactly that. On my own projects, the files read at session start grew to between ~31k and ~241k tokens (chars/4), mostly session diaries and completed checklists.

v2 inverts the contract:
- only rules.md and active-context.md (~80 lines) are read every session
- story.md holds rare decisions and is searched, not preloaded
- each file has a size cap; `context-bank doctor` measures it
- `compact` archives overflow to .ai/archive/ (copies, never deletes)
- `migrate` converts a v1 bank or a Cline Memory Bank

Same three files before/after on those projects: 241k -> 5k, 118k -> 6k, 36k -> 5k, 31k -> 4k tokens.

Why not native tool memory: it is per user and per tool. This lives in the repo, gets reviewed in PRs and is shared by the team.

Write-up with the details: <ARTICLE_URL>

Try it: `npx context-bank doctor` on an existing bank, or `npx context-bank init`. MIT. Happy to hear how others keep agent memory from growing.
```

**Notes**
- Best window: weekday, roughly 14:00-16:00 UTC (US morning).
- Stay in the thread for the first 2-3 hours and answer every comment.
- Do not ask anyone to upvote; HN penalizes it.
