# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/joshtune/mx-workflow/compare/v1.7.1...HEAD
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
