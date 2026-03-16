# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/joshtune/mx-workflow/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/joshtune/mx-workflow/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/joshtune/mx-workflow/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/joshtune/mx-workflow/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/joshtune/mx-workflow/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/joshtune/mx-workflow/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/joshtune/mx-workflow/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/joshtune/mx-workflow/releases/tag/v1.0.0
