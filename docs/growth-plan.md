# Growth Plan

Working plan to make Context Bank discoverable and adopted. Written 2026-09-26 from a review session (started in the coditor-platform repo). Execute top to bottom; tick boxes as work lands.

## Baseline (2026-09-26)
- GitHub: 9 stars, 1 fork, no topics, no homepage.
- npm: 434 downloads in the last month (2026-08-26 to 2026-09-24). People find and install it; visibility and messaging are the problem, not the product.

## Diagnosis
- The category is crowded: Cline Memory Bank, AGENTS.md / CLAUDE.md, native tool memories, MCP memory servers (e.g. basic-memory).
- "The git init for AI context" says what it is, not why someone should switch.
- The strongest story is buried in the README: v1 banks bloated to hundreds of thousands of tokens; v2 inverts the contract (size caps, retrieval-first, `doctor` measures it).
- The durable moat vs native memories: native memory is per-user and siloed; Context Bank lives in git, is reviewed in PRs, and is shared by the whole team and every tool.

## Positioning
- Lead with the pain: "Your memory bank is eating your context window."
- Then the difference: capped files, retrieval-first history (`story.md` is searched, not preloaded), `doctor` for measurement, team-shared via git, tool-agnostic via AGENTS.md.
- Prove it with one number: tokens loaded per session before/after on a real repo.
- Primary target audience: Cline Memory Bank users (they feel the bloat pain today).

## Workstream 1: Quick wins (one evening)
- [x] Add GitHub topics: claude-code, agents-md, context-engineering, memory-bank, ai-agents, cursor, codex, ai-memory.
- [x] Sharpen the repo description around the pain/benefit, add homepage (npm page or a docs page).
- [x] README: demo at the top. Done as animated SVG (`docs/demo.svg`): `doctor` on a real bloated bank, `migrate --compact`, `doctor` healthy. Real CLI output.
- [x] README: before/after token table from four real banks (~435k to ~2k always-read tokens on the largest).
- [x] README: short comparison table vs Cline Memory Bank, plain AGENTS.md/CLAUDE.md, native tool memory.
- [x] README: npm downloads and version badges. Also sharpened `package.json` description/keywords/homepage (ships with next npm publish).

## Workstream 2: Claude Code plugin + Agent Skill
- [x] Package as a Claude Code plugin in this repo (in `plugin/`, so the repo's own CLAUDE.md, src and tests are not shipped; commands are skills, namespaced `/context-bank:doctor|compact|init`):
  - Skill (`skills/context-bank/SKILL.md`): when to read which `.ai/` file, when to update, what never to write.
  - SessionStart hook: run `context-bank doctor` quietly, surface only warnings (over-cap files, leftover v1 contract).
  - Commands: `/cb-doctor`, `/cb-compact` (and maybe `/cb-init`).
  - `.claude-plugin/plugin.json` with full metadata (name, description, author, homepage, repository, version) and README at plugin root.
- [x] Add `.claude-plugin/marketplace.json` (name `context-bank`, source `./plugin`) so users can run:
  - `claude plugin marketplace add kadiresen/context-bank`
  - `claude plugin install context-bank@<marketplace-name>`
- [x] Validate: `claude plugin validate --strict` (plugin and marketplace pass) and the pre-submission checklist.
- [ ] Submit to Anthropic's plugin directory via https://claude.ai/directory/manage (needs a paid claude.ai plan). Note: acceptance into `claude-plugins-official` is reportedly partner-leaning; not guaranteed. Docs: https://code.claude.com/docs/en/plugins/publish.md
- [x] Make the same SKILL.md work under the Agent Skills standard (agentskills.io; about 40 products incl. Codex, Cursor, Gemini CLI, OpenCode, goose) and document it in the README.
- [x] `migrate` support from the Cline Memory Bank layout (auto-detected; ships in v2.1.0) (big adoption lever for the target audience).

## Workstream 3: Listings
Researched 2026-09-26 (stars, activity and contribution rules checked live).

Manual (web form, must be filed by a human):
- [ ] hesreallyhim/awesome-claude-code (54.6k): issue form `recommend-resource.yml`, category "Memory & Context Persistence". No PRs, no `gh`. One submission at a time.

PRs (good odds):
- [ ] ai-for-developers/awesome-ai-coding-tools (2.1k, very responsive): README "Developer Productivity Tools", append at end, en dash separator.
- [ ] yzfly/awesome-context-engineering (149, active): "Tools & Projects > Memory & Compression"; entry in BOTH README.md and README_CN.md.
- [ ] ccplugins/awesome-claude-code-plugins (952, bursty): "External Marketplaces" table row with install commands.

Automatic indexers (no action; check pickup in ~1 week):
- [ ] awesomeclaudeplugins.com (crawls `.claude-plugin/marketplace.json`), claudemarketplaces.com, claude-plugins.dev, skillsmp.com, buildwithclaude.com.

Later, once the repo has more stars (these reject brand-new or low-usage entries):
- [ ] VoltAgent/awesome-agent-skills (34.9k): PR titled `Add skill: kadiresen/context-bank`, "Context Engineering", description of 10 words or fewer.
- [ ] BehiSecc/awesome-claude-skills (10.2k): PR; maintainer merges in batches.

Skipped: inactive or no merges (ComposioHQ, travisvn, heilcheng, Meirtz, composio-community, rohitg00), poor fit (topoteretes, PatrickJS/awesome-cursorrules), awesome-codex-plugins needs a `.codex-plugin/plugin.json` (revisit if we add one).

## Workstream 4: Launch (one coordinated day, after 1 and 2 ship)
- [ ] Post-mortem article: "Why my AI memory files bloated to hundreds of thousands of tokens, and how v2 fixed it" (honest numbers, before/after). dev.to or own blog.
- [ ] Show HN the same day.
- [ ] Reddit: r/ClaudeAI, r/ChatGPTCoding, r/cursor. Share the article and numbers, not an ad.
- [ ] X/Twitter thread with the number and the demo GIF.

## Long-term lever: Coditor
Coditor (../coditor-platform, provider-agnostic multi-agent dev platform) may adopt the `.ai/` contract as its per-project context format. Every project run on Coditor would then use Context Bank. Keep the contract stable and documented as a spec with that in mind. Open design question on the Coditor side: agents must not be able to loosen `rules.md` without approval.
