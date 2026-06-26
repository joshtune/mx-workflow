# mx-workflow Roadmap

## The shift

mx-workflow is repositioning from **"a Claude Code plugin for the full dev lifecycle"** to **"the review-grade quality layer for AI-generated code."**

### Why

Generation is now table stakes. Anthropic shipped [Claude Tag](https://www.anthropic.com/news/introducing-claude-tag) (June 23, 2026) — Slack-native, proactive, multiplayer Claude that's "Claude Code under the hood." 65% of Anthropic's product team's code already comes from their internal version. Cursor, Aider, Cline, Codex, Copilot — every plugin in the marketplace is generation-flavored.

What no one else is building is the **refusal layer**: agents that interrogate AI-generated code and push back on silent failures, hallucinated APIs, suppressed errors, type rot, unjustified shortcuts.

mx-workflow already has 8 review-grade agents (out of 12). The pivot is mostly **what we lead with**, not what we build.

### What stays the same

- All 12 agents (8 review-grade, 4 build-grade — build agents become supporting cast)
- All 29 commands (lifecycle plumbing stays; build commands stay but get demoted from headline)
- Plugin format, marketplace distribution, Slack bot daemon
- Semver, CHANGELOG, release pipeline
- Docs site at joshtune.github.io/mx-workflow

### What changes

- The README + docs lead with the review framing
- A new headline command (`/mx:review`) becomes the "starter dose"
- New review-tier commands earn their place (`/mx:hallucination-check`, `/mx:second-look`, `/mx:reject`, `/mx:ratchet`)
- Marketplace listing rewritten
- Individual review agents publishable as standalone Claude Skills

---

## Phase 1 — Positioning (smallest, highest leverage)

- [x] Update `plugin.json` description to reflect the review framing
- [x] Rewrite `README.md` top section to lead with "review-grade quality layer for AI-generated code"
- [x] Update `docs/` landing page (Astro) hero + tagline to match
- [x] Update marketplace listing description (when published) — `.claude-plugin/marketplace.json` descriptions rewritten; live listing re-publishes from this file
- [x] Reorder `agents/` documentation so the 8 review-grade agents come first, build agents grouped at the bottom as "Optional build agents"
- [x] Add a "Why mx-workflow" section to the docs that names the gap (Claude Tag generates, mx-workflow verifies)
- [x] Add a CHANGELOG entry under `[Unreleased]` describing the reposition (no version bump until Phase 2 ships)

## Phase 2 — Headline command: `/mx:review`

The single command that bundles all 8 review-grade agents into one verdict report. The "starter dose" — install + `/mx:review` = _"oh, I see what this is for."_

- [ ] Spec `commands/review.md` — what it does, what it loads, the verdict format
- [ ] Decide the verdict format (Pass / Warnings / Reject + per-agent findings)
- [ ] Decide what code it runs on by default (unstaged diff? last commit? branch vs trunk?)
- [ ] Implement: orchestrate the 8 review agents, collect findings, render the verdict
- [ ] Test on at least 3 real repos (lehi31, koi-transportation, ward-page)
- [ ] Document in `docs/`
- [ ] Update `commands/help.md` to surface `/mx:review` as the primary entry point

## Phase 3 — Review-tier commands

The deeper commands that earn the new banner. Each is review-grade, opinionated, and refuses-rather-than-generates.

- [ ] `/mx:hallucination-check` — specifically catches invented APIs, fabricated function signatures, made-up library methods, and non-existent type imports. Cross-references against actual installed deps.
- [ ] `/mx:second-look` — run the review team on output from _other_ agents (Claude Tag PRs, Cursor diffs, Copilot suggestions). The "review layer on top of whatever generated the code."
- [ ] `/mx:reject` — formal "this work doesn't meet bar, here's why" output. Composable into CI as a gate. Exits non-zero on rejection.
- [ ] `/mx:ratchet` — quality only goes up. Any change must meet or exceed prior bar on the dimensions you care about (test coverage, type safety, lint cleanliness).
- [ ] `/mx:audit` — evolution of `/mx:qa`. Comprehensive quality audit, suitable for a weekly cron or manual run.

## Phase 4 — Distribution & messaging

- [ ] Rewrite marketplace listing (description + tags) once Phase 2 ships
- [ ] Update GitHub repo About line + topics
- [ ] Re-record demo video / add a new short demo: `/mx:review` on a Claude-generated PR catching a hallucinated API
- [ ] Cross-post the joshtune.com thesis blog ("I Built the Wrong Half" — draft in progress) to relevant communities
- [ ] Slack-bot welcome message: explain the new framing

## Phase 5 — Skills tier (publish individual agents as standalone)

The trend in the Brief content over the last 40 days: _"Claude Skills are quietly becoming a business model."_ Individual skills are a distinct distribution unit, smaller than plugins.

- [ ] Identify the 3-4 mx agents that stand on their own as skills (silent-failure-hunter, type-design-analyzer, comment-analyzer are likely starting candidates)
- [ ] Convert each to the Claude Skills format (separate from agent format)
- [ ] Publish to the Skills marketplace as standalone
- [ ] Cross-link from the mx-workflow docs ("Want just one agent? Install the standalone skill.")

---

## Open questions (don't block, but worth resolving)

- **Composition with Claude's native dynamic workflows (GA June 10).** Should mx review agents be wrappable as tools Claude's orchestrator can call? Or stay invoked-by-command? Probably both, with explicit examples in docs.
- **Composition with the Monitor tool.** Should `/mx:review` run automatically on PR events via Monitor? Or stay manual? Manual-first, Monitor-integration as Phase 6.
- **Model-per-task routing.** Per-command `model:` field could let `/mx:commit` use Haiku/Sonnet while `/mx:review` stays on Opus. Worth a Phase 2.5 spike.
- **Pricing.** mx-workflow is free/OSS. Skills as standalone could be a path to paid distribution — but only if there's clear demand. Hold for now.

---

## Reference

- Thesis blog post: [_I Built the Wrong Half_](https://joshtune.com/posts/i-built-the-wrong-half) (draft on joshtune.com — to publish before Phase 2 ships)
- Triggering market signal: [Claude Tag launch (June 23, 2026)](https://www.anthropic.com/news/introducing-claude-tag)
- Adjacent trend: [Claude Code Dynamic Workflows GA (June 10, 2026)](https://claude.com/) — nested subagents, depth=5
- Adjacent trend: [Claude Code Artifacts (June 18, 2026)](https://claude.com/blog/artifacts-in-claude-code) — refreshing dashboards from a session
