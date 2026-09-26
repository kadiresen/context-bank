# X thread draft

Attach `context-bank-demo.mp4` to tweet 1.

**1/**
My AI coding agent was reading ~241k tokens of "project memory" before every task.

I built the tool that caused it. Here is what went wrong and how v2 fixed it. 🧵

**2/**
Context Bank keeps agent memory in the repo: markdown under .ai/, committed to git, read by Claude Code, Codex, Cursor, Copilot via AGENTS.md.

v1's instructions: read 3 files before every task, update 4 files after every task. "Do NOT skip."

**3/**
Agents obeyed. Append is the cheapest edit, nobody deletes, so "current context" became a diary.

Files read at session start on 4 real projects: ~31k, ~36k, ~118k, ~241k tokens.

**4/**
v2 inverts the contract:
- read only rules + active-context (~80 lines) every session
- decisions live in story.md: searched, never preloaded
- size caps + `doctor` to measure
- `compact` archives overflow, deletes nothing

**5/**
Same files after `migrate --compact`:
241k -> 5k
118k -> 6k
36k -> 5k
31k -> 4k

**6/**
Also converts a Cline Memory Bank, and ships as a Claude Code plugin (skill + silent session-start check + /context-bank:doctor).

npx context-bank doctor
github.com/kadiresen/context-bank

Full write-up: <ARTICLE_URL>

---

**Video:** attach `docs/launch/context-bank-demo.mp4` to tweet 1 (16 s, 1520x1024, H.264, loops cleanly).
