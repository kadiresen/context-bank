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

### 3. Template Engine
- Locates templates in the `templates/` directory.
- Substitutes variables if necessary (e.g., Project Name).
- Writes files to `.ai/`, `.cursorrules`, etc.

## Data Flow
User runs `context-bank init` -> CLI prompts for options -> CLI reads templates -> CLI writes files to user's project structure.
