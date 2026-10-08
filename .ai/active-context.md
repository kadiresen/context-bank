# Active Context

Current work only. Keep this file under ~80 lines. Older notes belong in `.ai/archive/` or git, not here.

## Current Focus
- v3.0.1 is published (2026-10-08; 3.0.0 earlier the same day), 3.0.2 patch ready: one file per decision in `.ai/story/`, library export, `migrate` for 1.x/2.x banks, plugin pinned to 3.0.2. Plugin submitted to Anthropic's directory on 2026-10-08 (review pending; push-update webhook to set up).
- Growth plan (`docs/growth-plan.md`): Workstreams 1-3 done; Workstream 4 (launch) drafts in `docs/launch/`, refreshed for v3 on 2026-10-08 (numbers re-measured with 3.0.0 on the 2026-09-26 snapshots; demo SVG/MP4 regenerated) (article, Show HN, Reddit, X thread, demo MP4). The user publishes them; nothing is posted by the agent.
- Token numbers: always compare the same files on both sides (v1 read `rules` + `active-context` + `roadmap`: ~241k -> ~5k on the largest bank). Do not reuse the old "435k -> 2k" figure.

## Waiting on others
- Listing PRs: ai-for-developers/awesome-ai-coding-tools#782, yzfly/awesome-context-engineering#65, ccplugins/awesome-claude-code-plugins#545.
- hesreallyhim/awesome-claude-code#2961 (issue form, validation passed; one submission at a time).
- Auto-indexers (awesomeclaudeplugins.com, claudemarketplaces.com, claude-plugins.dev, skillsmp.com): check pickup around 2026-10-03.

## Next Steps
- Launch day: publish the article, then fill `<ARTICLE_URL>` in `docs/launch/*`; Show HN 14:00-16:00 UTC; Reddit a few hours apart; X thread with the MP4.
- After launch: VoltAgent/awesome-agent-skills and BehiSecc/awesome-claude-skills once the repo has more stars.
- Compact remaining personal banks (motoatolye2-web, motoatolye-web, coditor-platform) with v3.0.0.
- v3.0.1 (2026-10-08) fixes two migrate bugs: an undated story heading now takes its nearest dated neighbour's date (not the migration day) and is listed in a note; removed sources print as `removed`, and `migrateBank` returns `removed`.
