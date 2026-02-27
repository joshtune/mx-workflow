---
description: "Quick reference for all workflow commands"
allowed-tools: []
---

Display the ENTIRE code block below exactly as written. Do NOT summarize, paraphrase, or shorten it.

```
FV-WORKFLOW COMMANDS
==========================

SESSION START
  /prime                            Warm up codebase context (reads key files, runs checks)

IMPLEMENTATION (most common path)
  /rca <error or symptom>           Deep root cause analysis (5 Whys + git history)
  /plan                             Create implementation plan from understanding
  /implement                        Execute plan with validation + agent review
  /validate                         Run quality checks (lint, type-check, tests)
  /e2e [url or 'auto']              Browser-based E2E testing (screenshots, DB validation, bug fixes)
  /check-ignores                    Audit type/lint suppression comments
  /commit                           Conventional commit (auto-infers scope/type/ticket)
  /ship [desc]                      Fix + check + commit + push in one step

MULTI-AGENT TEAM BUILD (complex features)
  /prd                              Define the problem, scope, and spec first
  /build-with-agent-team            Spawn agent team in tmux (contract-first protocol)

PLANNING & DESIGN
  /prd [idea]                       Problem-first PRD generator (asks questions, outputs spec)
  /create-command <name>            Create new slash commands
  /create-rules                     Generate CLAUDE.md from codebase analysis

TESTING
  /e2e [url or 'auto']              Browser-based E2E testing (screenshots, DB validation, bug fixes)

ANYTIME
  /prime                            Re-ground context after git pull or branch switch
  /validate                         Quick quality check
  /e2e                              Full browser E2E testing with screenshots
  /rca <symptom>                    Root cause analysis (add "quick" for fast scan)
  /check-ignores                    Find unnecessary type/lint suppressions
  /commit                           Create a conventional commit
  /ship [desc]                      Fix + check + commit + push in one step

WHICH PATH SHOULD I USE?
  New session               → /prime (warm up context)
  New feature (needs spec)  → /prd → /plan → /implement
  Bug fix or small feature  → /rca (if needed) → /plan → /implement
  After implementing        → /e2e (verify it works in the browser)
  Complex multi-component   → /prd → /build-with-agent-team
  Quick code change         → Just code, then /ship (or /validate → /commit)
  Mysterious bug            → /rca <error message or symptom>
  Tech debt cleanup         → /check-ignores
  Need a new command        → /create-command <name> <purpose>
  New project setup         → /create-rules (generate CLAUDE.md)
```
