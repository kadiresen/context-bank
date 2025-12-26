# 🏦 Context Bank

> **The `git init` for AI Context.**
> Standardize, persist, and evolve your project's AI context with a single command.

![License](https://img.shields.io/npm/l/context-bank)
![Version](https://img.shields.io/npm/v/context-bank)

## ⚡ The Problem
Every time you start a new chat with an AI (Cursor, Windsurf, Copilot), you face the same issues:
1.  **Amnesia:** You have to re-explain the tech stack and coding rules.
2.  **Token Waste:** Pasting huge context files burns through your token limit and money.
3.  **Inconsistency:** `Cursor` follows one rule, `Copilot` follows another.

## 🚀 The Solution
**Context Bank** creates a standardized, self-evolving brain for your project.

Run one command:
```bash
npx context-bank init
```

And get a fully configured `.ai` environment that works across **Cursor**, **Windsurf**, and **GitHub Copilot**.

## ✨ Key Features

### 1. 🧠 Self-Evolving Rules (The "Living" Standard)
Instead of static rules, Context Bank sets up a **Single Source of Truth** (`.ai/rules.md`).
- The AI is instructed to **update this file itself** when you change a preference.
- *Example:* You tell the AI "Don't use `any`". The AI updates `rules.md`. Next time, it remembers.

### 2. 💾 Smart Memory & Token Saving
**Stop reading the entire chat history.**
Context Bank introduces a "State Management" system for your AI:
- **`.ai/active-context.md` (Short-term Memory):** Keeps track of *current* tasks.
  - *Benefit:* You can delete your chat history to save tokens, start a fresh session, and the AI knows exactly where it left off by reading this 20-line file instead of a 10k token history.
- **`.ai/story.md` (Long-term Memory):** logs major milestones and architectural decisions.

### 3. 🔌 Tool Agnostic
Whether you switch from Cursor to Windsurf, or use Copilot in VS Code, they all share the same brain.
- Generates `.cursorrules` pointing to the master rules.
- Generates `.windsurfrules` pointing to the master rules.
- Generates `.github/copilot-instructions.md` pointing to the master rules.

## 🛠 Usage

1.  **Go to your project root:**
    ```bash
    cd my-awesome-project
    ```

2.  **Initialize the bank:**
    ```bash
    npx context-bank init
    ```

3.  **That's it!**
    You will see a new `.ai/` directory.
    - **Edit `.ai/rules.md`** initially to set your stack (e.g., "React, Tailwind").
    - **Start coding.** Your AI is now context-aware.

## 📂 File Structure

```text
.
├── .ai/
│   ├── rules.md           # The Master Brain. SSOT for all rules.
│   ├── active-context.md  # Current focus. "What are we doing now?"
│   └── story.md           # Project history. "What have we done?"
├── .cursorrules           # Pointer for Cursor AI
├── .windsurfrules         # Pointer for Windsurf IDE
└── .github/
    └── copilot-instructions.md # Pointer for GitHub Copilot
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
ISC
