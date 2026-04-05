# Architecture

## Overview
Context Bank is a CLI tool designed to scaffold AI context files into existing projects.

## Core Components

### 1. CLI Entry Point (`src/index.ts`)
- Initializes the Commander program.
- Registers commands (e.g., `init`).

### 2. Commands (`src/commands/`)
- **Init Command (`init.ts`):**
  - Detects project type (optional future feature).
  - Prompts user for preferences using `clack`.
  - Copies templates to the target project.
  - Merges instructions into existing README.md, CLAUDE.md, and AGENTS.md files.
  - Integrates with Gemini CLI global memory.

### 3. Template Engine
- Locates templates in the `templates/` directory.
- Copies structure to the target project root.
- Handles safe merging for documentation files.

## Data Flow
User runs `context-bank init` -> CLI prompts for options -> CLI reads templates -> CLI writes files to user's project structure -> CLI offers global integrations.
