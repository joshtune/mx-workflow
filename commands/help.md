---
description: "Quick reference for all workflow commands"
allowed-tools: []
---

Display the ENTIRE code block below exactly as written. Do NOT summarize, paraphrase, or shorten it.

```
MX-WORKFLOW COMMANDS
==========================

All commands use the /mx: prefix (e.g., /mx:plan, /mx:commit).

SESSION START
  /mx:prime                            Warm up codebase context (reads key files, runs checks)
  /mx:context-prime <path>             Analyze a directory and create local context notes
  /mx:context-clean [path | --all]     Remove local context files
  /mx:status                           Show project status and available tools

IMPLEMENTATION (most common path)
  /mx:rca <error or symptom>           Deep root cause analysis (5 Whys + git history)
  /mx:plan                             Create implementation plan from understanding
  /mx:implement                        Execute plan with validation + agent review
  /mx:validate                         Run quality checks (lint, type-check, tests)
  /mx:deps [--security|--outdated]     Audit deps for vulnerabilities and outdated versions
  /mx:e2e [url or 'auto']              Browser-based E2E testing (screenshots, DB validation, bug fixes)
  /mx:check-ignores                    Audit type/lint suppression comments
  /mx:branch <ticket> <desc>           Create branch with ticket-encoded naming convention
  /mx:commit                           Conventional commit (auto-infers scope/type/ticket)
  /mx:ship [desc]                      Fix + check + commit + push in one step
  /mx:pr [--draft | --base <branch>]   Create PR with auto-generated summary and agent findings
  /mx:loop [ticket | all] [--branch-per-ticket]
                                       Process Linear tickets with smart pipeline routing (A/B/C/D)
                                       --branch-per-ticket: separate branch + auto-PR per ticket

MULTI-AGENT TEAM BUILD (complex features)
  /mx:prd                              Define the problem, scope, and spec first
  /mx:build-with-agent-team            Spawn agent team in tmux (contract-first protocol)

PLANNING & DESIGN
  /mx:prd [idea]                       Problem-first PRD generator (asks questions, outputs spec)
  /mx:create-command <name>            Create new slash commands
  /mx:create-rules                     Generate CLAUDE.md from codebase analysis

TESTING
  /mx:e2e [url or 'auto']              Browser-based E2E testing (screenshots, DB validation, bug fixes)

DISCOVERY
  /mx:agents                           List available agents and their purposes

RELEASE
  /mx:release [patch|minor|major|x.y.z] One-step release: bump, commit, tag, push, GitHub release
  /mx:version [patch|minor|major|x.y.z] Bump version only (no push or GitHub release)

ANYTIME
  /mx:prime                            Re-ground context after git pull or branch switch
  /mx:context-prime <path>             Build local context before diving into unfamiliar code
  /mx:validate                         Quick quality check
  /mx:deps [--security|--outdated]     Audit deps for vulnerabilities and outdated versions
  /mx:e2e                              Full browser E2E testing with screenshots
  /mx:rca <symptom>                    Root cause analysis (add "quick" for fast scan)
  /mx:check-ignores                    Find unnecessary type/lint suppressions
  /mx:commit                           Create a conventional commit
  /mx:ship [desc]                      Fix + check + commit + push in one step

WHICH PATH SHOULD I USE?
  New session               → /mx:status (check project readiness) → /mx:prime (warm up context)
  New feature (needs spec)  → /mx:prd → /mx:plan → /mx:implement
  Bug fix or small feature  → /mx:rca (if needed) → /mx:plan → /mx:implement
  After implementing        → /mx:e2e (verify it works in the browser)
  Complex multi-component   → /mx:prd → /mx:build-with-agent-team
  Ready to open a PR        → /mx:pr (or /mx:pr --draft for work-in-progress)
  Starting a ticket         → /mx:branch <ticket> <desc> → /mx:plan → /mx:implement
  Quick code change         → Just code, then /mx:ship (or /mx:validate → /mx:commit)
  Batch Linear tickets      → /mx:loop (or /mx:loop EIT-25,EIT-30 --branch-per-ticket)
  Mysterious bug            → /mx:rca <error message or symptom>
  Tech debt cleanup         → /mx:check-ignores
  Dependency health check   → /mx:deps
  Need a new command        → /mx:create-command <name> <purpose>
  Ready to release          → /mx:release (or /mx:release minor)
  Entering unfamiliar code  → /mx:context-prime <path> (build local context)
  Cleaning up context files → /mx:context-clean --all (remove all local context)
  New project setup         → /mx:create-rules (generate CLAUDE.md)
```
