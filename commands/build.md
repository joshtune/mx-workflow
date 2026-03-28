---
description: "Full pipeline: discovery questions, PRD, plan, build, QA, commit & ship"
argument-hint: "[product/feature idea] [--auto] [--skip-prd <path>] [--skip-plan <path>] [--stack <stack>]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit", "Agent"]
---

# Build — Full Pipeline Orchestrator

Take a product or feature idea from concept to committed code. By default, starts with discovery questions before doing anything.

**Input:** $ARGUMENTS

## Flags

Parse `$ARGUMENTS` for flags (strip them before treating the remainder as `IDEA`):

| Flag | Default | Behavior |
|------|---------|----------|
| `--auto` | off | Skip all gates and discovery questions, run fully autonomous |
| `--skip-prd <path>` | off | Skip PRD generation, use the PRD at the given path |
| `--skip-plan <path>` | off | Skip plan generation, use the plan at the given path |
| `--stack <stack>` | none | Pre-specify the tech stack (e.g., "sveltekit+supabase") |

After stripping flags, the remaining text is `IDEA`.

---

## Phase 0: Discovery

**CRITICAL: This phase runs by default.** Do NOT skip directly to PRD generation unless `--auto` is set.

### 0.1 If no IDEA provided

Ask:
> What do you want to build? Describe the product or feature in a few sentences.

Wait for response. Store as `IDEA`.

### 0.2 If IDEA provided

Confirm understanding:
> I understand you want to build: {restated understanding}. Before I start, I have some questions.

### 0.3 Discovery Questions

Ask all at once (do not ask one by one):

> **Discovery Questions:**
> 1. **What does the user see/experience?** Walk me through the main interaction.
> 2. **Who is it for?** The specific user, persona, or audience.
> 3. **What stack/framework?** *(Skip if `--stack` was provided.)* Languages, frameworks, database, UI library.
> 4. **Scope** — MVP or full feature? What's explicitly out of scope?
> 5. **Existing code?** Building from scratch, or extending something in this repo?
> 6. **Deployment target?** Local only, hosted (where?), or not yet decided?
> 7. **Any constraints?** Time, dependencies on other systems, specific patterns to follow.

**Wait for user responses.** Store all answers as `DISCOVERY_CONTEXT`.

### 0.4 Auto Mode

If `--auto` is set, skip all questions. Infer answers from:
- The `IDEA` text
- The codebase (`CLAUDE.md`, `package.json`, project structure)
- The `--stack` flag if provided

Print what was inferred and proceed without pausing.

---

## Phase 0.5: Pre-flight

1. **Detect quality commands** — same detection as `/mx:validate`:
   - Check `CLAUDE.md` for documented commands
   - Detect from project files (`package.json` scripts, `Makefile`, `Cargo.toml`, `go.mod`, `pyproject.toml`)
   - Detect package manager from lock files

2. **Check git status** — if dirty, warn but do not abort (this command creates new work)

3. **Print pipeline overview**:

```
BUILD PIPELINE
==============
Idea:       <IDEA summary>
Stack:      <detected or specified>
Scope:      <MVP / full>

Pipeline:
  Phase 1: PRD Generation          <or SKIP — using existing PRD>
  Phase 2: Implementation Plan     <or SKIP — using existing plan>
  Phase 3: Build                   <team / single — TBD after plan>
  Phase 4: QA Audit
  Phase 5: Final Commit

Quality:    <lint cmd> | <typecheck cmd> | <test cmd>

Proceed? (Y/n)
```

If `--auto`, skip the confirmation.

---

## Phase 1: PRD Generation

**Skip if `--skip-prd <path>` was provided** — set `PRD_PATH` to the provided path and proceed to Phase 2.

### 1.1 Codebase Context

Search for existing components, services, and patterns related to the feature. Identify:
- Existing implementations that overlap or relate
- Patterns to follow (frameworks, modules, naming conventions)
- Files likely to be affected

### 1.2 Generate PRD

Using `IDEA` + `DISCOVERY_CONTEXT` + codebase context, write the PRD to `.agents/prds/{kebab-case-name}.prd.md`.

Create directory if needed: `mkdir -p .agents/prds`

Follow the same template as `/mx:prd` Phase 5:
- Problem Statement
- Key Hypothesis
- Users (primary, JTBD, non-users)
- Solution with MVP Scope table (Must/Should/Won't)
- Codebase Context (patterns found, files affected)
- Success Metrics
- Open Questions
- Implementation Phases
- Suggested Tickets

Store `PRD_PATH` = the generated file path.

### 1.3 Incremental Commit

```bash
git add .agents/prds/
git commit -m "docs(prd): add PRD for {kebab-case-name}"
```

### 1.4 Gate (unless --auto)

```
PHASE 1 COMPLETE — PRD Generated
=================================
File: .agents/prds/{name}.prd.md

Problem:   <one line>
Solution:  <one line>
MVP Scope: <count> must-haves, <count> should-haves

Review the PRD and confirm to proceed, or suggest changes.
```

Wait for user approval. If user suggests changes, apply them to the PRD file, amend the commit, and re-present.

---

## Phase 2: Plan Generation

**Skip if `--skip-plan <path>` was provided** — set `PLAN_PATH` to the provided path and proceed to Phase 3.

### 2.1 Read PRD

Read the PRD at `PRD_PATH`. Extract:
- What components are needed
- How they interact
- What the dependencies are between components

### 2.2 Analyze Codebase

For each area the PRD touches:
1. Read files and understand structure
2. Find similar implementations for reference
3. Note conventions: naming, error handling, test patterns, imports

### 2.3 External Research (if applicable)

If the task involves unfamiliar libraries or APIs:
1. Check project docs (`docs/`, `ai_docs/`, `.agents/reference/`)
2. Check library versions from package manifest
3. Research if needed (official docs, migration guides)

### 2.4 Generate Plan

Write the plan to `.agents/plans/{kebab-case-name}.plan.md`.

Create directory if needed: `mkdir -p .agents/plans`

Follow the same template as `/mx:plan` Step 4:
- Summary
- Mandatory Reading (file:lines table)
- External References
- Changes (numbered by file path)
- New Files
- Tests
- Order of Operations
- Validation
- Risks / Notes
- Confidence: X/10

### 2.5 Determine Build Strategy

Based on the plan, decide:

| Signal | Strategy |
|--------|----------|
| 3+ independent components, separate concerns (frontend/backend/DB), or 10+ cross-domain file changes | **Agent Team** (parallel multi-agent) |
| Focused on a single concern, < 10 files, linear dependencies | **Single Agent** (sequential) |

Store as `BUILD_STRATEGY` = `"team"` or `"single"`.

### 2.6 Incremental Commit

```bash
git add .agents/plans/
git commit -m "docs(plan): add implementation plan for {kebab-case-name}"
```

### 2.7 Gate (unless --auto)

```
PHASE 2 COMPLETE — Plan Generated
==================================
File: .agents/plans/{name}.plan.md

Summary:    <plan summary>
Changes:    <count> files
New Files:  <count>
Tests:      <count> scenarios
Confidence: <X>/10
Strategy:   <Agent Team (N agents) / Single Agent>

Review the plan and confirm to proceed, or suggest changes.
```

Wait for user approval.

---

## Phase 3: Build

### If BUILD_STRATEGY = "single"

Execute the plan sequentially (same logic as `/mx:implement`):

1. **For each step in the plan's Order of Operations:**
   - Implement the change
   - Run quality checks (lint, typecheck, tests)
   - If validation fails: fix, re-run, repeat until clean
   - Move to next step

2. **Run agent review pass** (via Agent tool, in parallel):
   - Always: `mx-code-reviewer`, `mx-silent-failure-hunter`
   - If applicable: `mx-type-design-analyzer`, `mx-mr-test-analyzer`, `mx-comment-analyzer`
   - Fix CRITICAL (confidence >= 90) and IMPORTANT (confidence >= 80) issues
   - Re-run quality checks after fixes

3. **Run `mx-code-simplifier`** for a final polish pass

4. **Incremental commit:**
   ```bash
   git add -A
   git commit -m "feat(<scope>): implement {feature-name}"
   ```

### If BUILD_STRATEGY = "team"

Execute the plan using Agent Teams (same logic as `/mx:build-with-agent-team`):

1. **Check prerequisites:**
   - Claude Code v2.1.32+ (`claude --version`)
   - Experimental flag (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`)
   - If not enabled, fall back to single-agent strategy with a warning

2. **Determine team structure** from the plan:
   - Assign roles, ownership, file boundaries
   - Map the contract dependency chain (upstream → downstream)

3. **Contract-first spawning** (staggered, not fully parallel):
   - Spawn upstream agents first
   - Each publishes their contract (exact URLs, JSON shapes, status codes)
   - Lead verifies contracts, forwards to downstream agents
   - Spawn downstream agents with verified contracts

4. **Spawn QA teammate** (mx-quality-keeper agent):
   - Verifies every task before it closes
   - Routes failures back to owning agents
   - 3-attempt rejection loop, then escalates to lead

5. **Enter delegate mode** — coordinate, do NOT implement

6. **Facilitate phases:**
   - Phase 1: Contracts (sequential, lead-orchestrated)
   - Phase 2: Implementation (parallel)
   - Phase 2.5: Continuous QA
   - Phase 3: Pre-completion contract diff
   - Phase 4: Cross-review

7. **Lead validation** (end-to-end):
   - QA summary clean?
   - Can the system start?
   - Does the happy path work?
   - Do integrations connect?

8. **Incremental commits** — each agent commits their work as they complete tasks. The lead does a final merge commit if needed:
   ```bash
   git add -A
   git commit -m "feat(<scope>): implement {feature-name} via agent team"
   ```

9. **Shutdown and cleanup** — shut down all teammates, then lead cleans up

---

## Phase 4: QA

Run a full quality audit (same logic as `/mx:qa --full`):

1. **Quality checks** — lint, typecheck, tests
2. **Suppression audit** — scan for new `@ts-ignore`, `eslint-disable`, `# noqa`, etc.
3. **Dependency audit** — security-only check for critical/high vulnerabilities
4. **Contract conformance** (if team build) — verify implementation matches agreed contracts

Save report to `.agents/reports/build-qa-{YYYY-MM-DD}.md`.

### If QA fails

1. Attempt to fix issues (up to 3 fix-then-revalidate cycles)
2. After each fix cycle, commit the fixes:
   ```bash
   git add -A
   git commit -m "fix(<scope>): address QA findings for {feature-name}"
   ```
3. If still failing after 3 cycles:
   - If `--auto`: report failure and stop
   - Otherwise: pause and ask user for guidance

---

## Phase 5: Final Report

```
BUILD COMPLETE
==============
Idea:       <IDEA>
Stack:      <stack>
Strategy:   <Single Agent / Agent Team (N agents)>

Artifacts:
  PRD:      .agents/prds/{name}.prd.md         <or SKIPPED>
  Plan:     .agents/plans/{name}.plan.md       <or SKIPPED>
  QA:       .agents/reports/build-qa-{date}.md

Changes:
  Files modified: <count>
  Files created:  <count>
  Tests:          <count> passing

Quality:
  Lint:       PASS / FAIL
  Types:      PASS / FAIL
  Tests:      PASS / FAIL
  QA Audit:   PASS / FAIL

Git:
  Commits:    <count> commits created
  Branch:     <branch>
─────────────────────────────────────────
Overall:      SUCCESS / PARTIAL / FAILED
```

If `PARTIAL` or `FAILED`, list what failed and what remains to be done.

---

## Commit Strategy

Incremental commits give the user visibility into progression:

| Phase | Commit | Message pattern |
|-------|--------|----------------|
| Phase 1 | PRD generated | `docs(prd): add PRD for {name}` |
| Phase 2 | Plan generated | `docs(plan): add implementation plan for {name}` |
| Phase 3 | Implementation complete | `feat(<scope>): implement {name}` |
| Phase 4 | QA fixes (if any) | `fix(<scope>): address QA findings for {name}` |

In team builds, agents may create additional intermediate commits during Phase 3.

All commits use: `Co-Authored-By: ${MX_CO_AUTHOR:-Claude <noreply@anthropic.com>}`

---

## Rules

- **Discovery first.** Always ask questions before building unless `--auto` is set. Never skip to PRD generation without understanding the user's intent.
- **Gates are not optional.** In default mode, pause after PRD and after plan for user review. Only `--auto` skips gates.
- **Commit incrementally.** Each major phase produces a commit. The user should be able to see progression in `git log`.
- **Context flows forward.** Each phase reads the output of the previous phase. Discovery → PRD → Plan → Build → QA.
- **Strategy is data-driven.** Choose team vs. single-agent based on plan complexity, not assumptions. The user can override at the Phase 2 gate.
- **Fix before committing.** If QA fails, attempt fixes. Do not commit broken code in the final state.
- **Report everything.** Every phase outcome appears in the final report.
