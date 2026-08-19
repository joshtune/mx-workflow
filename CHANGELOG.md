# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.23.0] - 2026-08-18

### Added

- **`references/project-structure.md`** — a framework-agnostic file layout spec built on one invariant: a file lives at the lowest point in the tree that can see all of its consumers, so a file may import from its own subtree or an ancestor but never from a sibling's subtree. Covers hoist-on-second-consumer placement, folder-qualified filenames, constants at scope of use, uncapped nesting (with depth ≥4 as a QA advisory rather than a failure), pre-approved exceptions (framework paths, generated code, e2e, design-system primitives), a per-stack vocabulary table for React/Angular/Svelte/Vue/backend/CLI/mobile, and a `dependency-cruiser` CI encoding of the sibling-import rule. Existing layouts always win; conflicts are reported, never silently migrated.
- **`references/code-style.md`** — the companion spec for what goes inside the files: strict TypeScript (plus the checks `strict` omits), banned escape hatches (`any`, `as`, `!`, `@ts-ignore`), simplicity rules (rule of three, no speculative abstraction, delete rather than comment out), control-flow limits (guard clauses, named conditions, `max-depth` 3, `complexity` 10, no nested ternaries), and naming rules (no single letters or invented abbreviations, name length scales with scope, predicate booleans). Each rule is mapped to CI gate or human review, with the un-lintable ones named as such.
- Both references state readability as the explicit tiebreaker and share one deviation protocol: deviations are argued at the build gate before code lands, leave a justified suppression as the artifact, and are then tracked by the existing `/mx:ratchet` and `/mx:check-ignores` machinery.
- New `structure` ratchet dimension — counts layout violations (sibling-subtree imports, hand-written barrels) on trunk vs branch via the project's configured gate, and blocks increases. Skipped when no gate is configured rather than falling back to a hand count, which wouldn't be comparable across checkouts. Nesting depth is deliberately excluded as an advisory, not a ratchet dimension.

### Changed

- **`/mx:build`** wired to both references: Phase 0.5 resolves greenfield-vs-existing and records a stack `STRUCTURE_PROFILE`, surfacing any conflict with the existing layout in the pipeline overview; Phase 3 gains a Structure & Style section plus a **deviation gate** that requires approval *before* non-pre-approved departures land (and under `--auto` applies the rule rather than deviating unilaterally); Phase 4.1 adds layout conformance; the final report gains a Structure block. Greenfield builds scaffold the strict `tsconfig.json` baseline and a `dependency-cruiser` config; existing projects get gaps reported instead.
- **`/mx:qa`** gains a Structure & Style Conformance check under `--full`, covering what CI can't reach (deep sibling imports, unqualified filenames, hand-written barrels, inline user-facing strings, speculative hoisting, single-caller abstractions). Skipped on codebases with a pre-existing layout. Justified deviations are reported separately as accepted, not re-litigated as findings.
- **`/mx:create-rules`** now detects and documents the project's real layout convention in a new "File Layout Convention" section of the generated `CLAUDE.md`, and reports divergences from the reference separately — it describes what the codebase does rather than prescribing what it should do.
- **`mx-feature-builder`** replaces its vague "follow existing patterns" rule with explicit fallback conventions for code with no precedent, and must now report structure/style deviations in its output.

### Fixed

- Docs: the Getting Started page and the site-wide meta description still led with the old "development workflow plugin / full dev lifecycle" framing — missed in the Phase 1 reposition (only the landing page was updated). Both now lead with the review-grade framing, and Getting Started opens with a "Try it first: `/mx:review`" section.

## [1.22.0] - 2026-06-26

### Added

- **Standalone Skills tier** (Phase 5 of the reposition) — four of the sharpest reviewers are now published as self-contained [Claude Skills](https://claude.com/claude-code) under `skills/`, installable individually without the whole plugin: `silent-failure-hunter`, `type-design-analyzer`, `comment-analyzer` (derived from the agents) and `hallucination-check` (derived from the command). Each `SKILL.md` carries its full instructions and a comment pointing at its canonical plugin source; `skills/README.md` documents install + the sync discipline. Cross-linked from the docs agent catalog.
- **Distribution & messaging** (Phase 4 of the reposition):
  - `keywords` added to `plugin.json` and `marketplace.json` (`code-review`, `ai-code-review`, `code-quality`, `static-analysis`, `hallucination-detection`, `ci-gate`, …) for marketplace discoverability.
  - Slack bot now answers an empty `@mention` or a greeting/help word with a welcome message that explains the review-grade framing and what it can do (build *and* review), instead of the bare "I need an instruction" prompt.
  - New docs guide **"Demo: catching a hallucinated API"** — a concrete `/mx:review` walkthrough where an AI-generated Stripe webhook handler is rejected for an invented SDK method and a swallowed error. Doubles as the script for the demo video.
  - GitHub repo About line + topics updated to the review framing (applied directly to the repo, not via this PR).
- **Review-tier commands** (Phase 3 of the reposition) — five deeper, opinionated, refuses-rather-than-generates commands:
  - **`/mx:hallucination-check`** — catches invented APIs, fabricated signatures, non-existent imports, and uninstalled packages by cross-referencing every reference in the diff against actually-installed deps (`node_modules`, site-packages, module cache) and the repo itself. Evidence-based; unresolvable references are reported as UNVERIFIED, not inflated.
  - **`/mx:second-look`** — runs the full review team on code generated by *other* tools (Claude Tag PRs, Cursor/Copilot diffs). Takes a PR number/URL via `gh` by default, plus `--diff <file>` and commit ranges offline. Leans harder on hallucination + silent-failure checks for unsupervised output.
  - **`/mx:reject`** — strict-mode review as a CI gate. Emits a machine-readable `MX_VERDICT=PASS|REJECT` marker (plus `MX_REJECT_COUNT`/`MX_BLOCKING`) and ships a documented headless recipe (`claude -p ... | grep`) since slash commands can't set an exit code.
  - **`/mx:ratchet`** — "quality only goes up." Measures coverage, type errors, lint, and suppression count on trunk (in a throwaway git worktree) vs the branch and fails on any regression. Baseline computed live from trunk each run — no stored state. Names new offenders by file:line.
  - **`/mx:audit`** — whole-repo evolution of `/mx:qa`. Wraps `/mx:qa --full` at repo scope and tracks health trends across dated reports; cron-friendly. `/mx:qa` is unchanged.
  - Documented in `docs/` (new "Review-tier" page) and surfaced in `/mx:help`.
- **`/mx:review`** — the headline review command (Phase 2 of the reposition). Bundles all 8 review-grade agents into a single verdict (`PASS` / `PASS WITH WARNINGS` / `REJECT`) with per-agent findings and a recommendation. Read-only — it interrogates and reports, never modifies code.
  - **Default scope** reviews everything that differs from trunk (`main`/`master`) — committed branch work *and* uncommitted changes, including untracked new files (where AI-generated code most often hides). Computed via merge-base, so it also works on trunk with only uncommitted edits. Flags: `--staged`, `--commit <sha>`, `--branch <name>`, `--scope <path>`.
  - **Three configurable verdict modes**, default **balanced**: `--strict` (REJECT on CRITICAL or HIGH), balanced (REJECT on CRITICAL), `--advisory` (never blocks). Always prints a recommendation with reasons.
  - **Models** — each agent keeps its existing model assignment (routing optimization deferred to the Phase 2.5 spike).
  - Documented in `docs/` (new "Review (start here)" page, top of the Commands sidebar) and surfaced as the primary entry point in `/mx:help` and the README.

### Changed

- **Repositioning** — mx-workflow now leads with its identity as "the review-grade quality layer for AI-generated code" rather than "a full dev-lifecycle plugin." Generation is table stakes; the differentiator is the refusal layer that interrogates AI-generated code for silent failures, hallucinated APIs, suppressed errors, and type rot. The full lifecycle toolkit stays — it's now framed as the foundation underneath the review agents. (Phase 1 of the reposition; see `ROADMAP.md`.)
- `plugin.json` and marketplace descriptions rewritten to lead with the review framing.
- `README.md` top section rewritten with the new positioning and a "Why mx-workflow" section naming the gap (peers generate; mx-workflow verifies).
- Docs landing page (`docs/`) hero, tagline, cards, and a new "Why mx-workflow" section updated to match.
- Agent docs (README + docs catalog) now group the **8 review-grade agents** first and the **4 build agents** at the bottom as "Optional build agents." Documented the five previously-undocumented agents (`mx-quality-keeper`, `mx-schema-builder`, `mx-feature-builder`, `mx-test-builder`, `mx-shipkit-builder`) — the catalog now covers all 12 agents instead of 7.

## [1.21.2] - 2026-04-05

### Fixed

- Slack bot `@slack/bolt` upgraded from v3.22 to v4.6.0 for Node.js v25 ESM compatibility — fixes `Named export 'App' not found` crash and `Unhandled event 'server explicit disconnect'` socket-mode error
- Slack bot data copy sync — installed copy was missing `interactive.js`, `phases.js`, `session.js` and had stale `index.js`/`runner.js` from pre-interactive era

## [1.21.1] - 2026-04-05

### Fixed

- New project directories now use readable names derived from the build instruction (e.g., `task-management-system/`) instead of opaque session hashes (`session-a3f1b2c4/`). Handles name collisions with numeric suffixes.

## [1.21.0] - 2026-04-05

### Added

- Auto-project registration — projects register in `.mx-mac-mini.json` automatically after each build completes, with meaningful names derived from the PRD file name, branch, or instruction (e.g., `task-manager`, `settings-page`)
- `registerProject()` export in `slack-bot/runner.js` for programmatic project registration
- Build strategy section in Slack bot docs explaining automatic team vs single agent selection

### Changed

- `/mx:setup-mac-mini` simplified — removed Phase 3 (project scanning/registration), reduced to 5 phases. Projects grow organically as you build, no manual discovery needed.
- Slack bot docs updated with auto-registration, project referencing patterns, and build strategy info

### Removed

- Manual project scanning and alias registration from setup-mac-mini
- `--projects-only` flag from setup-mac-mini (no longer applicable)

## [1.20.0] - 2026-04-05

### Changed

- Slack bot is now conversational by default — chat naturally, discuss ideas, and build when ready. Claude mediates all replies (no more regex classification), understanding questions vs approval vs feedback from context. Build pipeline only triggers when user explicitly asks to build.
- Conversation history tracked per session and passed to Claude for full context across turns
- `slack-bot/phases.js` — replaced `classifyReply()` with `conversationSystemPrompt()`, `buildConversationPrompt()`, and `parseConversationResponse()` for Claude-mediated intent detection via structured markers
- `slack-bot/interactive.js` — rewritten from rigid state handlers to unified conversation handler with marker-triggered phase transitions
- `slack-bot/session.js` — added `CONVERSATION` as initial state and `history[]` for conversation tracking
- `slack-bot/index.js` — sessions start in conversation mode, first message goes through Claude instead of directly to discovery

## [1.19.0] - 2026-04-05

### Added

- Two-way interactive Slack bot conversation — builds now run phase-by-phase by default, posting discovery questions, PRD summaries, and plan summaries to the thread and waiting for user approval or feedback before proceeding. Users can go back and forth at each gate until satisfied.
- `slack-bot/session.js` — session state machine with in-memory lookup and JSON disk persistence, startup recovery for interrupted sessions, 24h expiry cleanup
- `slack-bot/phases.js` — prompt generators for each build phase, structured output parsers, reply classifier (approve/cancel/feedback)
- `slack-bot/interactive.js` — phase orchestrator driving sessions through discovery → preflight → PRD → plan → build with feedback loops at each gate
- `spawnClaude()` export in `slack-bot/runner.js` — reusable Claude Code spawn primitive used by both auto and interactive runners

### Changed

- Slack bot default mode is now interactive (use `--auto` flag for original fire-and-forget behavior)
- `slack-bot/index.js` — thread reply routing, `--auto` flag dispatch, user identity verification on session threads
- `slack-bot/runner.js` — refactored to use `spawnClaude()` internally, exported `extractPrUrl`/`extractBranch` parsers

## [1.18.1] - 2026-04-04

### Fixed

- `/mx:setup-mac-mini` now enforces mandatory phase execution order — Phase 2 (Slack Integration) and Phase 4 (Daemon Setup) explicitly cannot be skipped. Fixes issue where Claude sessions were skipping Slack setup.

## [1.18.0] - 2026-04-04

### Changed

- `/mx:setup-mac-mini` redesigned to be proactive and verification-driven — auto-installs required deps, verifies every step via API/CLI before proceeding, gates each phase, validates Slack tokens on paste, checks #builds channel membership, diagnoses daemon failures, and only reports "complete" when everything is verified working. Added Phase 0 pre-flight readiness check and Phase gates at every stage.

## [1.17.0] - 2026-04-04

### Changed

- `/mx:setup-mac-mini` expanded to full day-one setup — 6 phases: system prerequisites (Homebrew, Node.js, Claude Code, Git/SSH, tmux, Tailscale), Slack integration (guided app creation, token collection, auto-detect bot ID, connection test), project registration, daemon setup (launchd with auto-restart), end-to-end verification, and summary. Supports `--skip-system`, `--skip-slack`, `--projects-only` flags and re-run menu.
- Help card and Slack bot docs page updated to reflect expanded setup

## [1.16.0] - 2026-04-04

### Added

- `/mx:setup-mac-mini` command — one-time interactive setup for the Slack bot. Scans for projects, creates aliases, sets default project, validates CLAUDE.md, writes `.mx-mac-mini.json` config.
- Project resolution in `slack-bot/runner.js` — supports 4 patterns: project prefix (`dashboard: add dark mode`), first word (`api fix bug`), default project (bare messages), explicit flag (`--repo billing add export`)
- `.mx-mac-mini.example.json` — example config for reference

### Changed

- `slack-bot/runner.js` rewritten with project resolution, config loading, new/existing project detection
- `/mx:help` updated with `/mx:setup-mac-mini` in SESSION START and WHICH PATH sections
- Slack bot docs guide updated with project resolution patterns and setup-mac-mini step

## [1.15.0] - 2026-04-03

### Added

- `slack-bot/` — Slack bot orchestrator for headless autonomous builds on a Mac mini. Listens to #builds channel and @mentions, triggers `/mx:build --auto`, streams verbose progress back to Slack in real-time, reports PR links on completion. Includes launchd daemon for auto-start, session isolation, and full logging.

## [1.14.1] - 2026-04-01

### Changed

- Documentation site updated — multi-agent command page and choosing-a-workflow guide now reflect funnel discovery, user roles & expectations, test-first build cycle, and per-role spec conformance

## [1.14.0] - 2026-03-29

### Changed

- `/mx:build` Phase 3 now uses test-first cycle: write test → confirm fails → implement → confirm passes. Applies to both single-agent and agent team strategies.
- `/mx:build-with-agent-team` spawn prompt template updated with test-first build cycle as a REQUIRED protocol for all implementation agents
- QA teammate verification protocol now checks that tests were written alongside features — tasks without tests are failed
- Multi-agent team guide updated with test-first workflow

## [1.13.0] - 2026-03-29

### Added

- Test coverage verification in `mx-quality-keeper` — verifies that every implemented feature has a corresponding test (e2e for user flows, unit for business logic). Auto-detects test infrastructure (Playwright, Cypress, vitest, jest, pytest, Go/Rust). Reports PASS/FAIL/SKIP per role and expectation ID.

### Changed

- `/mx:qa` updated with Step 6 test coverage verification (runs when `--full` or spec found)
- `/mx:build` Phase 4 now includes test coverage check — QA fix cycle writes missing tests
- Multi-agent team guide updated with test coverage in QA verification scope

## [1.12.0] - 2026-03-29

### Changed

- `/mx:build` Phase 0 redesigned with funnel discovery — quick direction questions (yes/no, A/B) → inferred context confirmation → targeted details only where uncertain. Replaces the 7 open-ended questions wall.
- `/mx:build` Phase 1 and `/mx:prd` now include "User Roles & Expectations" section in PRD — each role gets a table of expectations with unique IDs (A1, C2) and priority levels
- `mx-quality-keeper` spec conformance now verifies per role — groups results by role, checks role-gating, reports PASS/FAIL/MISS with expectation IDs
- `/mx:qa` spec conformance updated with per-role verification and role-gating checks
- Multi-agent team guide updated with role-based spec conformance

## [1.11.0] - 2026-03-28

### Added

- Spec conformance check in `mx-quality-keeper` agent — verifies every must-have from the PRD was actually built, wired up, and works as specified. Reports PASS/FAIL/MISS per requirement. MISS items (entirely missing features) escalate immediately.

### Changed

- `/mx:qa` updated with Step 5 spec conformance check (runs when `--full` or spec found)
- `/mx:build` Phase 4 now includes spec conformance as the critical QA check
- `/mx:build-with-agent-team` QA spawn prompt updated with spec verification protocol
- Multi-agent team guide updated with spec conformance in QA verification scope

## [1.10.0] - 2026-03-28

### Added

- `/mx:build` command — full pipeline orchestrator: discovery questions → PRD → plan → build (auto-selects agent team or single-agent) → QA → commit. Defaults to interactive discovery; `--auto` for autonomous mode. Makes incremental commits at each phase for visible progression. Supports `--skip-prd`, `--skip-plan`, and `--stack` flags.

### Changed

- `/mx:help` updated with `/mx:build` in new FULL PIPELINE section and WHICH PATH guidance
- Documentation site multi-agent command page renamed to "Full Pipeline & Multi-Agent" with `/mx:build` reference

## [1.9.0] - 2026-03-28

### Added

- `mx-quality-keeper` agent — dedicated quality gatekeeper that verifies, tests, and rejects work without writing production code. Operates standalone via `/mx:qa` or as a mandatory QA teammate in agent team builds
- `/mx:qa` command — comprehensive quality audit (lint, types, tests, suppressions, contract conformance) with structured reporting to `.agents/reports/`
- QA teammate protocol in `/mx:build-with-agent-team` — automatic QA spawning, Phase 2.5 continuous verification, `TaskCompleted` hook enforcement, 3-attempt rejection loop with lead escalation

### Changed

- `/mx:build-with-agent-team` updated with mandatory QA teammate, continuous verification during implementation, concrete hook configuration examples, and updated definition of done
- `/mx:help` updated with `/mx:qa` in IMPLEMENTATION, ANYTIME, and WHICH PATH sections
- Documentation site multi-agent command page and team guide updated with QA agent protocol

## [1.8.0] - 2026-03-28

### Changed

- `/mx:build-with-agent-team` fully aligned with official Claude Code Agent Teams docs — added display modes (in-process + iTerm2 alongside tmux), keyboard controls, hooks (`TeammateIdle`/`TaskCreated`/`TaskCompleted`), plan approval mode, task management with dependencies and self-claiming, communication patterns (message/broadcast), shutdown and cleanup protocol, troubleshooting guide, and all known limitations
- `/mx:help` description updated to reflect in-process mode support
- Documentation site command page and multi-agent team guide rewritten with full coverage

## [1.7.1] - 2026-03-16

### Changed

- Documentation site updated with `--recursive` flag details on Session & Discovery page

## [1.7.0] - 2026-03-16

### Changed

- `/mx:context-prime` `--recursive` reworked for scalability — deep discovery via module boundary detection (index files + config files across full tree), batched project-wide scoring (2 Greps instead of N), 20-directory cap, deferred overflow, and already-primed detection

## [1.6.0] - 2026-03-16

### Added

- `/mx:context-prime` `--recursive` flag — walks subdirectories, triages by complexity score, and primes all qualifying directories in one pass

## [1.5.0] - 2026-03-16

### Added

- `/mx:whatsnew` command — check for plugin updates, show what's new, and how to update

## [1.4.0] - 2026-03-14

### Added

- `mx-schema-builder` agent — database tables, RLS policies, types, and migrations for orchestrated builds
- `mx-feature-builder` agent — single feature implementation (called per feature in pipeline builds)
- `mx-test-builder` agent — Playwright e2e test suite generation
- `mx-shipkit-builder` agent — production-readiness layer (analytics, SEO, Stripe, feedback, contact)
- `/mx:context-prime` command — analyze a directory and create a `.claude/context.local.md` with non-obvious behavioral notes (hidden coupling, framework quirks, gotchas)
- `/mx:context-prime` enforcement audit (Step 3.5) — filters gotchas already caught by lint, TypeScript strict mode, pre-commit hooks, CI, or build checks
- `/mx:context-prime` `## Verify` section — auto-populates 1–3 concrete test/lint/build commands specific to the target module
- `/mx:context-prime` `--learn` flag — retrospective mode that prompts for session learnings and merges them into existing context files
- `/mx:context-prime` CLAUDE.md overlap check — detects redundant content between root CLAUDE.md and local context files, suggests pruning
- `/mx:context-clean` command — remove local context files for a directory or the entire project
- `/mx:rebase` command — rebase current branch onto trunk (main/master) or a specified branch with pre-flight checks
- Documentation for both context commands on the docs site (Session & Discovery page)

### Changed

- `/mx:help` updated with `/mx:context-prime`, `/mx:context-clean`, and `/mx:rebase`
- `/mx:ship` renamed to `/mx:shipit`

## [1.3.0] - 2026-03-01

### Added

- `/mx:release` command — one-step release that bumps version, updates changelog, commits, tags, pushes, and creates GitHub release. Skips if nothing to release.

### Changed

- `/mx:help` updated with `/mx:release` command in RELEASE section and "Ready to release" path

## [1.2.0] - 2026-03-01

### Added

- Documentation site at [joshtune.github.io/mx-workflow](https://joshtune.github.io/mx-workflow) with command guides, agent references, and getting started tutorials (EIT-57)
- Smart pipeline routing for `/mx:loop` — auto-classifies tickets into Bug Fix [A], Feature [B], Simple/Docs [C], or Refactor [D] pipelines with tailored sub-agent workflows (EIT-58)
- `--branch-per-ticket` mode for `/mx:loop` — creates isolated branches with auto-PR creation via `gh pr create` per ticket (EIT-59)
- Per-ticket pipeline override syntax (e.g., `EIT-42:A`) for `/mx:loop`

### Changed

- `/mx:loop` pre-flight summary now shows pipeline classification per ticket
- `/mx:loop` final report includes pipeline breakdown stats, branch names, and PR URLs
- `/mx:help` updated with new `/mx:loop` flags and pipeline routing

## [1.1.1] - 2026-03-01

### Changed

- Add `/mx:` prefix to all commands in `/mx:help` reference card for consistency

## [1.1.0] - 2026-03-01

### Added

- `/mx:loop` command — sequential ticket processor that fetches Linear tickets and processes them one-by-one via sub-agents (EIT-49 prerequisite)
- `/mx:pr` command — create PRs with auto-generated summaries and agent review findings (EIT-28)
- `/mx:branch` command — ticket-encoded branch creation using `MX_BRANCH_PATTERN` (EIT-29)
- `/mx:agents` command — discover available agents with purposes and command references (EIT-30)
- `/mx:deps` command — dependency security audit, outdated version checks, and unused package detection (EIT-31)
- `/mx:version` command — centralized version management across plugin.json, marketplace.json, and CHANGELOG.md (EIT-36)
- `mx-performance-auditor` agent — performance analysis covering algorithmic complexity, memory, I/O, frontend, and database patterns (EIT-32)
- `--dry-run` flag for `/mx:shipit` — preview what would be committed and pushed without actually doing it (EIT-33)
- `mx-comment-analyzer` integrated into `/mx:implement` review pass for comment quality checks (EIT-41)
- Getting Started walkthrough in README — 7-step first-session guide (EIT-37)
- Troubleshooting section in README — 6 common failure modes with solutions (EIT-38)
- Example project configurations in scope-mappings for frontend SPA, backend API, monorepo, and CLI tool (EIT-39)
- PRD vs Plan usage clarification in README (EIT-40)
- Database rollback/cleanup guidance in `/mx:e2e` (EIT-42)
- CHANGELOG.md following Keep a Changelog format (EIT-49)

### Fixed

- Audited and fixed `allowed-tools` declarations across 5 commands — added missing tools, removed unused ones (EIT-35)

### Changed

- Version management documented in CLAUDE.md now references `/mx:version` command
- `/mx:help` updated with all new commands across IMPLEMENTATION, DISCOVERY, RELEASE, and ANYTIME sections

## [1.0.1] - 2026-02-28

### Fixed

- Replace non-standard "ultrathink" language with clear instructions in check-ignores command (EIT-26)
- Standardize `.agents/` output directory naming to all-lowercase-hyphenated format (EIT-34)

### Changed

- Document output directory convention in CLAUDE.md

## [1.0.0] - 2026-02-27

### Added

- 15 slash commands for the full dev lifecycle: ticket intake, planning, implementation, quality checks, conventional commits, MR creation, batch AI implementation, and multi-agent team builds
- 6 specialized agents for code review, testing, debugging, and analysis
- Plugin manifest (`plugin.json`) and marketplace configuration
- CLAUDE.md with project development guidelines
- Scope mappings and agent browser references

[Unreleased]: https://github.com/joshtune/mx-workflow/compare/v1.21.2...HEAD
[1.21.2]: https://github.com/joshtune/mx-workflow/compare/v1.21.1...v1.21.2
[1.21.1]: https://github.com/joshtune/mx-workflow/compare/v1.21.0...v1.21.1
[1.21.0]: https://github.com/joshtune/mx-workflow/compare/v1.20.0...v1.21.0
[1.20.0]: https://github.com/joshtune/mx-workflow/compare/v1.19.0...v1.20.0
[1.19.0]: https://github.com/joshtune/mx-workflow/compare/v1.18.1...v1.19.0
[1.18.1]: https://github.com/joshtune/mx-workflow/compare/v1.18.0...v1.18.1
[1.18.0]: https://github.com/joshtune/mx-workflow/compare/v1.17.0...v1.18.0
[1.17.0]: https://github.com/joshtune/mx-workflow/compare/v1.16.0...v1.17.0
[1.16.0]: https://github.com/joshtune/mx-workflow/compare/v1.15.0...v1.16.0
[1.15.0]: https://github.com/joshtune/mx-workflow/compare/v1.14.1...v1.15.0
[1.14.1]: https://github.com/joshtune/mx-workflow/compare/v1.14.0...v1.14.1
[1.14.0]: https://github.com/joshtune/mx-workflow/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/joshtune/mx-workflow/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/joshtune/mx-workflow/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/joshtune/mx-workflow/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/joshtune/mx-workflow/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/joshtune/mx-workflow/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/joshtune/mx-workflow/compare/v1.7.1...v1.8.0
[1.7.1]: https://github.com/joshtune/mx-workflow/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/joshtune/mx-workflow/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/joshtune/mx-workflow/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/joshtune/mx-workflow/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/joshtune/mx-workflow/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/joshtune/mx-workflow/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/joshtune/mx-workflow/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/joshtune/mx-workflow/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/joshtune/mx-workflow/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/joshtune/mx-workflow/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/joshtune/mx-workflow/releases/tag/v1.0.0
