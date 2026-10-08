# Reddit drafts

Rules to check the day of posting: each sub's self-promotion rule and required flair. Say plainly that it is your tool. Lead with the numbers and the lesson, not the product. Space the posts a few hours apart, not all at once.

---

## r/ClaudeAI

**Title:** My CLAUDE.md/AGENTS.md memory setup was loading ~241k tokens per session. What I changed.

```
I keep project memory for Claude Code in markdown files under .ai/, committed to git (I wrote a small open-source CLI for this, Context Bank).

Its first version told the agent to update four memory files after every task and read three of them before every task. Claude followed that perfectly, which was the problem: active-context.md turned into a session diary. On four of my projects the files read at session start grew to ~31k, ~36k, ~119k and ~241k tokens (chars/4 estimate).

What fixed it:
- only rules.md + active-context.md (~80 lines, current work only) are read every session
- decisions go to .ai/story/, one small file each, grepped when needed, never preloaded
- size caps per file, and a `doctor` command that reports them
- update memory when something you'd need next time changed, not after every task

Same files after: ~4-5k tokens.

It is also a Claude Code plugin now: a skill with the read/write rules, a session-start check that stays silent unless the bank is bloated, and /context-bank:doctor, :compact, :init.

Repo (MIT): https://github.com/kadiresen/context-bank
Write-up: https://dev.to/kadiresen/my-ai-memory-bank-grew-to-240k-tokens-per-session-here-is-what-i-got-wrong-368

Curious how others keep CLAUDE.md or memory files from growing.
```

---

## r/ChatGPTCoding

**Title:** "Update memory after every task" made my AI memory files grow to 241k tokens. Lessons from fixing it.

```
Tool-agnostic lesson first, product second.

I keep AI coding agent memory in the repo (.ai/ markdown files + AGENTS.md so Codex, Cursor, Claude Code, Copilot all read the same thing). My original instructions said: read rules/active-context/roadmap before every task, update four files after every task.

Agents append. They rarely delete. After a few months, the files read at session start on my projects were ~31k to ~241k tokens.

What worked:
1. Separate current state (rewritten, ~80 lines) from history (searched, never preloaded).
2. Don't write what git already knows.
3. Cap file sizes and measure them.
4. Only update memory when something future-you needs changed.

After: ~4-5k tokens for the same files, nothing deleted (overflow archived).

I packaged this as an open-source CLI (context-bank: doctor / compact / migrate, also converts a Cline Memory Bank): https://github.com/kadiresen/context-bank
Details and numbers: https://dev.to/kadiresen/my-ai-memory-bank-grew-to-240k-tokens-per-session-here-is-what-i-got-wrong-368
```

---

## r/cursor

**Title:** Keeping AI project memory small across Cursor, Claude Code and Codex (numbers inside)

```
If you share project context between Cursor and other agents, AGENTS.md plus a few markdown files in the repo works well, until the files grow.

Mine grew to ~31k-241k tokens read before every task, because my instructions told agents to update the memory files after every task. Fix: current work in one short file, decisions in a searched-not-preloaded file, size caps, and a doctor command that measures them. Same files now: ~4-5k tokens.

Open-source CLI (MIT), works with anything that reads AGENTS.md: https://github.com/kadiresen/context-bank
Write-up: https://dev.to/kadiresen/my-ai-memory-bank-grew-to-240k-tokens-per-session-here-is-what-i-got-wrong-368
```
