# 🏦 Context Bank

<div align="center">

![npm version](https://img.shields.io/npm/v/context-bank?style=flat-square&color=007acc)
![license](https://img.shields.io/npm/l/context-bank?style=flat-square&color=green)
![downloads](https://img.shields.io/npm/dt/context-bank?style=flat-square)

**The `git init` for AI Context.**
<br/>
Standardize, persist, and evolve your project's AI context with a single command.
<br/>
Works with **Cursor**, **Windsurf**, and **GitHub Copilot**.

</div>

---

## ⚡ The Problem
Every time you start a new chat with an AI Code Editor, you face the same friction:
*   ❌ **Amnesia:** "Wait, are we using Tailwind or CSS Modules? I forgot."
*   ❌ **Token Waste:** Manually pasting huge documentation files burns your quota.
*   ❌ **Inconsistency:** Cursor follows one rule, while Copilot suggests something else.

## 🚀 The Solution
**Context Bank** creates a standardized, **self-evolving brain** for your project.

It generates a structured `.ai` directory that acts as a **Single Source of Truth (SSOT)** for all your AI tools.

## 📦 Installation & Usage

### Prerequisites
You need **Node.js 18+** installed on your machine.
*(Most developers already have this. If not, [download it here](https://nodejs.org/).)*

### Quick Start
Go to your project root (any language: Python, Go, C#, Node, etc.) and run:

```bash
npx context-bank init
```

That's it! 🚀

## ✨ Key Features

### 🧠 1. Self-Evolving Rules
Instead of static `.txt` files, Context Bank sets up a living **`rules.md`**.
*   **Dynamic Learning:** The AI is instructed to *update its own rules* when you state a preference.
*   **Example:** You tell the AI *"I prefer arrow functions"*. The AI updates `.ai/rules.md`. Next time, it remembers.

### 💾 2. Smart Memory (Token Saver)
Stop feeding the AI your entire chat history. Context Bank uses "State Management":
*   **`active-context.md` (Short-term):** Tracks the *current* task. (e.g., "Fixing the login bug").
*   **`story.md` (Long-term):** Logs major milestones and architectural decisions.
*   **The Benefit:** You can start a fresh chat, point the AI to `active-context.md`, and resume work instantly without reading 10k tokens of history.

### 🔌 3. Universal Tool Support
One brain, multiple interfaces. The `init` command automatically configures pointers for:

| Tool | Support Type | File Created |
|------|--------------|--------------|
| **Cursor** | Native ✅ | `.cursorrules` |
| **Windsurf** | Native ✅ | `.windsurfrules` |
| **GitHub Copilot** | Native ✅ | `.github/copilot-instructions.md` |
| **Aider** (CLI) | Native ✅ | `CONVENTIONS.md` |
| **Other CLIs** | Manual 🛠️ | (See below) |

#### 🖥️ Using with Gemini CLI, Claude Code, or ChatGPT
If your tool doesn't automatically read configuration files, just start your session with this **Magic Prompt**:

> "I am starting a session. Please read **`.ai/rules.md`** for project standards and **`.ai/active-context.md`** for the current state. Update these files if plans change."

## 📂 Generated Structure

When you run the command, your project gets this power-pack:

```text
my-project/
├── .ai/
│   ├── rules.md           # 🧠 The Master Brain (SSOT)
│   ├── active-context.md  # 📝 Current focus & next steps
│   └── story.md           # 📜 Project history & decisions
├── .cursorrules           # 🔗 Pointer for Cursor
├── .windsurfrules         # 🔗 Pointer for Windsurf
└── .github/
    └── copilot-instructions.md # 🔗 Pointer for Copilot
```

## 🤝 Contributing
Contributions are welcome! Whether it's a new template or a bug fix.

1.  Fork the repo
2.  Create your branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'feat: add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 📄 License
MIT © [Kadir Esen](https://github.com/kadiresen)