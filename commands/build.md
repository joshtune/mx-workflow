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

### 0.3 Quick Direction (yes/no, A/B choices)

Start with fast, binary questions that narrow the solution space. Each answer eliminates entire branches of decisions. Ask all at once:

> **Quick Direction:**
> 1. **Web or mobile?** (Web / Mobile / Both)
> 2. **Needs a backend/database?** (Yes / No)
> 3. **Auth required?** (Yes / No)
> 4. **Public-facing or internal tool?** (Public / Internal)
> 5. **Multi-user or single-user?** (Multi / Single)
> 6. **New project or extending existing code in this repo?** (New / Existing)

These questions are **dynamic** — tailor them to the idea. A CLI tool doesn't need "web or mobile." A data pipeline doesn't need "auth required." Only ask questions relevant to the idea. Skip questions where the answer is obvious from context.

**Wait for user responses.**

### 0.4 Inferred Context

Based on the quick direction answers, infer the technical decisions and present them for confirmation:

```
INFERRED CONTEXT
================
Platform:    Web app
Stack:       [infer from project CLAUDE.md, package.json, or user's known preferences]
Database:    [Yes → Supabase/Postgres/etc. based on project context]
Auth:        [Yes → method based on stack]
Deployment:  [infer from project context or ask]
Scope:       MVP

Does this look right? Anything to change?
```

The user confirms or corrects. This is fast — most of the time they'll say "yes" or tweak one thing.

### 0.5 Targeted Details (only where uncertain)

Only ask open-ended questions for things you could NOT infer from the quick direction:

> **A few more details I need:**
> 1. **User roles** — Who are the distinct types of users? (e.g., admin, customer, viewer). For each role, what's the one thing they must be able to do?
> 2. [Any other genuinely uncertain detail — e.g., specific business logic, third-party integrations, data constraints]

**Do NOT re-ask** things already answered in quick direction or inferred context. Keep this to 1-3 questions maximum. If you can infer everything, skip this step entirely and move to pre-flight.

**Wait for user responses.** Store all answers (quick direction + inferred context + targeted details) as `DISCOVERY_CONTEXT`.

### 0.6 Auto Mode

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
- **User Roles & Expectations** (see below)
- Solution with MVP Scope table (Must/Should/Won't)
- Codebase Context (patterns found, files affected)
- Success Metrics
- Open Questions
- Implementation Phases
- Suggested Tickets

**User Roles & Expectations (REQUIRED):**

The PRD MUST include a "User Roles & Expectations" section that defines every distinct role and what they can do. This section is the primary input for QA spec conformance — if it's not in the PRD, QA can't verify it.

Format:

```markdown
## User Roles & Expectations

### Admin
| # | Expectation | Priority |
|---|-------------|----------|
| A1 | Can remove users from the system | Must |
| A2 | Can view all users and their activity | Must |
| A3 | Can configure system settings | Should |

### Customer
| # | Expectation | Priority |
|---|-------------|----------|
| C1 | Can add items to shopping cart | Must |
| C2 | Can checkout and pay | Must |
| C3 | Can view order history | Should |

### Viewer (unauthenticated)
| # | Expectation | Priority |
|---|-------------|----------|
| V1 | Can browse product catalog | Must |
| V2 | Can search products by name | Should |
```

Each expectation gets a unique ID (role prefix + number) for traceability. QA will verify every "Must" expectation by role.

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

### 4.1 Structural Checks
1. **Quality checks** — lint, typecheck, tests
2. **Suppression audit** — scan for new `@ts-ignore`, `eslint-disable`, `# noqa`, etc.
3. **Dependency audit** — security-only check for critical/high vulnerabilities
4. **Contract conformance** (if team build) — verify implementation matches agreed contracts

### 4.2 Spec Conformance (CRITICAL)

This is the most important check. Read the PRD at `PRD_PATH` and verify **every must-have was actually built**:

1. Extract every role and every "Must" expectation from the PRD's "User Roles & Expectations" section, using the unique IDs (A1, C2, etc.)
2. For each must-have, grouped by role, verify:
   - **Does the code exist?** Search for the implementation (routes, components, functions, endpoints, tables)
   - **Is it wired up?** A component that exists but isn't rendered, or an endpoint that isn't routed, is NOT implemented
   - **Does it match the spec?** Read the implementation and verify it handles the expected behavior
   - **Is it role-gated?** If multiple roles exist, verify role-specific actions are properly restricted
3. Report each as PASS / FAIL / MISS, grouped by role:

```
SPEC CONFORMANCE
================

ADMIN
[ PASS ] A1: Can remove users — DELETE /api/users/:id exists, admin middleware applied
[ FAIL ] A2: Can view all users — endpoint exists but no UI page

CUSTOMER
[ PASS ] C1: Can add items to cart — POST /api/cart wired up
[ MISS ] C2: Can checkout and pay — no implementation found

Summary: 2/4 PASS, 1 FAIL, 1 MISS
```

- **FAIL**: Implementation exists but is incomplete → fix it in the QA fix cycle
- **MISS**: No implementation at all → this is critical, the requirement was dropped

### 4.3 Test Coverage Verification

After spec conformance, verify that tests exist for the features that were built:

1. **Detect test infrastructure** — Playwright, Cypress, vitest, jest, pytest, Go/Rust test files
2. **For each must-have that PASSED spec conformance**, search test files for a corresponding test
3. Match test type to feature: user-facing flows → e2e tests (if available); business logic → unit tests
4. Report per role:

```
TEST COVERAGE
=============

ADMIN
[ PASS ] A1: Can remove users — test in admin.spec.ts:24 "should delete user"
[ FAIL ] A2: Can view all users — feature exists but no test

CUSTOMER
[ PASS ] C1: Can add to cart — test in cart.spec.ts:12 "should add item"
[ SKIP ] C2: Can checkout — feature MISS, no test expected

Summary: 2/3 implemented features have tests (1 missing)
```

- **FAIL** here means the feature works but has no test → the fix cycle should write the test
- **SKIP** means the feature itself is MISS/FAIL → can't test what doesn't work yet

### 4.4 Save Report

Save report to `.agents/reports/build-qa-{YYYY-MM-DD}.md`.

### 4.5 If QA Fails

1. Attempt to fix issues (up to 3 fix-then-revalidate cycles)
   - For spec **FAIL** items: fix the incomplete implementation
   - For spec **MISS** items: implement the missing feature
   - For test coverage **FAIL** items: write the missing test
2. After each fix cycle, commit the fixes:
   ```bash
   git add -A
   git commit -m "fix(<scope>): address QA findings for {feature-name}"
   ```
3. Re-run spec conformance and test coverage after each fix cycle
4. If still failing after 3 cycles:
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

Spec Conformance:
  Roles:      <count> roles verified
  Must-haves: X/Y verified
  Failed:     <count> (incomplete implementations)
  Missing:    <count> (not implemented at all)
  Per-role:
    Admin:    X/Y PASS
    Customer: X/Y PASS

Test Coverage:
  Features with tests: X/Y
  Missing tests:       <count>

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
