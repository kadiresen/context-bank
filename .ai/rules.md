# Project Rules & Conventions

## General
- **Language:** TypeScript
- **Runtime:** Node.js
- **Package Manager:** PNPM
- **Style:** Clean, strict typing, functional where appropriate.

## CLI Development
- Use `commander` for command definitions.
- Use `@clack/prompts` for interactive user input.
- Ensure all commands have error handling.
- Keep CLI output concise and user-friendly.

## File Structure
- `src/`: Source code
  - `commands/`: Individual command logic
  - `utils/`: Helper functions
  - `templates/`: Default templates for the context bank
- `templates/`: (Root level) Raw template files for the bank

## AI Context Strategy (Dogfooding)
- Maintain this `.ai` folder to reflect the latest project state.
- Update `roadmap.md` as features are completed.
