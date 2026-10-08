# Active Context

Current work only. Keep this file under ~80 lines. Older notes belong in `.ai/archive/` or git, not here.

## Current Focus
- v3.0.0 is built on branch `v3`, not yet published (owner runs `npm publish`): one file per decision in `.ai/story/`, library export, `migrate` for 2.x banks, plugin pinned to 3.0.0. v2.1.0 shipped earlier (Cline Memory Bank migrate, compact fixes, Claude Code plugin in `plugin/`, marketplace at `.claude-plugin/marketplace.json`).
- Growth plan (`docs/growth-plan.md`): Workstreams 1-3 done; Workstream 4 (launch) drafts ready in `docs/launch/` (article, Show HN, Reddit, X thread, demo MP4). The user publishes them; nothing is posted by the agent.
- Token numbers: always compare the same files on both sides (v1 read `rules` + `active-context` + `roadmap`: ~241k -> ~5k on the largest bank). Do not reuse the old "435k -> 2k" figure.

## Waiting on others
- Listing PRs: ai-for-developers/awesome-ai-coding-tools#782, yzfly/awesome-context-engineering#65, ccplugins/awesome-claude-code-plugins#545.
- hesreallyhim/awesome-claude-code#2961 (issue form, validation passed; one submission at a time).
- Auto-indexers (awesomeclaudeplugins.com, claudemarketplaces.com, claude-plugins.dev, skillsmp.com): check pickup around 2026-10-03.

## Next Steps
- Launch day: publish the article, then fill `<ARTICLE_URL>` in `docs/launch/*`; Show HN 14:00-16:00 UTC; Reddit a few hours apart; X thread with the MP4.
- After launch: VoltAgent/awesome-agent-skills and BehiSecc/awesome-claude-skills once the repo has more stars.
- Compact remaining personal banks (motoatolye2-web, motoatolye-web, coditor-platform) with v3.0.0.
