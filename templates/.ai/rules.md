# AI CONTEXT: ALWAYS READ THIS FILE FIRST

# 🧠 Project Context & Rules (Master File)

---

## ⚠️ MANDATORY: MEMORY MANAGEMENT PROTOCOL

**THIS IS NOT OPTIONAL. YOU MUST FOLLOW THESE RULES AFTER EVERY TASK.**

You are responsible for keeping the `.ai/` directory up-to-date as the project's long-term memory.
Do NOT rely on chat history. These files ARE your memory.

### After EVERY coding task, you MUST:

1. **UPDATE `.ai/active-context.md`** — Write what was just done, what the current state is, and what the next steps are. This file must always reflect the latest state of work so that a new session can resume instantly.

2. **UPDATE `.ai/roadmap.md`** — If a feature was completed, mark it with `[x]`. If a new feature was discussed or planned, add it to the list.

3. **UPDATE `.ai/story.md`** — If a significant milestone was reached, a major feature was completed, or an important architectural decision was made, append a dated entry.

4. **UPDATE `.ai/architecture.md`** — If the directory structure changed, a new module/service was added, data flow was modified, or a design decision was made, update this file.

5. **UPDATE `.ai/rules.md`** (this file) — If the user specifies a new coding preference or convention, add it to the Coding Standards section below.

### When starting a new session:
- Read `.ai/active-context.md` FIRST to understand where work left off.
- Read `.ai/rules.md` for coding standards and project context.
- Read `.ai/roadmap.md` to understand priorities.

### IMPORTANT:
- Update context files using the file editing tools available to you.
- Do NOT ask the user "should I update the context files?" — just do it.
- Do NOT skip updates because "it was a small change" — every change matters.
- If you are unsure what to write, write a brief summary. Something is better than nothing.

---

## 🏢 Project Overview
*Replace this with a 1-sentence description of the project.*

## 🛠 Tech Stack
- **Language:** [e.g., TypeScript, Python, Go]
- **Framework:** [e.g., React, Django, Laravel]
- **Database:** [e.g., PostgreSQL, MongoDB]
- **Tools:** [e.g., Docker, PNPM, Vite]

## 📏 Coding Standards (Mutable)
*AI: Update this section based on user feedback.*

- **General:** Write clean, modular, and robust code.
- **Comments:** Explain "why", not "what".
- **Error Handling:** Fail gracefully and log errors.
- [AI: Add new rules here...]

## 🏗 Architecture Patterns
*AI: Update this section as the architecture evolves.*

- [e.g., "Use Feature-Sliced Design"]
- [e.g., "Service Repository Pattern"]

## 📝 Workflow & Git
- **Commits:** Use Conventional Commits (feat: ..., fix: ..., docs: ...).
- **Branches:** feature/name-of-feature.
