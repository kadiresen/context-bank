# Code Quality and Linting

Date: 2026-03-13

- **Pre-build Linting:** Integrated `pnpm lint` into the `build` script to ensure that all TypeScript code passes linting before compilation. Any linting errors will now correctly break the build process.
- **ESLint Integration:** Fixed the non-functional `lint` script by installing ESLint v10 and configuring it with the new flat config format (`eslint.config.js`).
- **Dependency Management:** Added `@eslint/js`, `typescript-eslint`, and relevant parser/plugins to `devDependencies`.
- **Bug Fix:** Resolved a linting error in `src/commands/init.ts` where the `text` import was unused, ensuring the codebase remains clean and valid.
- **Workflow Improvement:** Verified that `pnpm lint` now correctly analyzes the entire `src/` directory.
