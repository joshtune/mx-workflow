---
description: "Process Linear tickets sequentially — plan, implement, commit, mark done"
argument-hint: "[ticket-id | 'all'] [--branch-per-ticket | --single-branch]"
allowed-tools: ["Bash", "Glob", "Read", "Write", "Agent",
                "mcp__plugin_linear_linear__list_issues",
                "mcp__plugin_linear_linear__get_issue",
                "mcp__plugin_linear_linear__save_issue",
                "mcp__plugin_linear_linear__list_issue_statuses"]
---

# Loop — Sequential Ticket Processor

Process Linear tickets one by one: classify, plan, implement, validate, commit, mark done.

**Arguments:** $ARGUMENTS

## Flags

Parse `$ARGUMENTS` for flags:

| Flag | Default | Behavior |
|------|---------|----------|
| `--branch-per-ticket` | off | Create a separate branch + PR per ticket |
| `--single-branch` | **on** (default) | All commits on current branch (original behavior) |

Flags can appear anywhere in the argument string. Strip them before resolving tickets.

**Per-ticket pipeline overrides:** Append `:A`, `:B`, `:C`, or `:D` to a ticket ID to force a pipeline (e.g., `EIT-42:A,EIT-43:C`). Parse and store overrides, then strip the suffix before looking up tickets.

## Phase 0: Pre-flight

### 0.1 Check Git Clean

```bash
git status --porcelain
```

If there are uncommitted changes, **abort** with:
> Working tree is dirty. Please commit or stash changes before running `/loop`.

Record the current branch as `BASE_BRANCH` for use in branch-per-ticket mode:
```bash
git branch --show-current
```

### 0.2 Detect Quality Commands

Determine how to validate in this project (reuse the same detection as `/validate`):

1. Check `CLAUDE.md` for documented quality commands
2. Detect from project files (`package.json` scripts, `Makefile`, `Cargo.toml`, `go.mod`, `pyproject.toml`)
3. Detect package manager from lock files (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, `package-lock.json` → npm)

Identify available checks:
- **Lint/fix command** (e.g., `pnpm lint:fix`, `cargo clippy --fix`)
- **Type-check command** (e.g., `npm run type-check`, `cargo check`)
- **Test command** (e.g., `pnpm test`, `cargo test`)

Store these as strings to pass into each sub-agent prompt.

### 0.3 Fetch Linear Status IDs

Use `mcp__plugin_linear_linear__list_issue_statuses` to get the status IDs for:
- **In Progress** (for marking tickets when work begins)
- **Done** (for marking tickets when work completes)

Store these IDs for use in Phase 1.

### 0.4 Resolve Ticket List

Based on `$ARGUMENTS` (after stripping flags and pipeline suffixes):

| Input | Behavior |
|-------|----------|
| *(blank)* | Fetch all open tickets assigned to me (states: Backlog, Todo, In Progress) |
| `EIT-37` | Single ticket by identifier |
| `EIT-25,EIT-30` | Comma-separated list of specific tickets |
| `all` | All open project tickets regardless of assignee |

Use `mcp__plugin_linear_linear__list_issues` with appropriate filters. For each ticket, fetch full details with `mcp__plugin_linear_linear__get_issue` (with `includeRelations: true` for dependency checks).

### 0.5 Sort and Filter

1. **Sort by priority** (Urgent=1 → High=2 → Medium=3 → Low=4 → None=0 last), then by issue number ascending
2. **Dependency check** — For each ticket, check if it has blocking relations:
   - If blocked by a ticket **outside** this run → skip it immediately
   - If blocked by a ticket **inside** this run → defer it (move to end of queue once)
   - If still blocked after deferral → skip with reason

### 0.6 Classify Pipeline Per Ticket

Assign each ticket a pipeline type using the following algorithm. If a per-ticket override was provided (e.g., `EIT-42:A`), use that and skip classification.

**Pipeline Types:**

| Code | Name | Steps |
|------|------|-------|
| **A** | Bug Fix | RCA → Plan → Implement → Validate → Commit |
| **B** | Feature | Plan → Implement → Validate → Commit |
| **C** | Simple/Docs | Implement → Validate → Commit |
| **D** | Refactor | Plan → Implement → Validate → Commit |

**Classification Algorithm (first match wins):**

1. **Labels check:**
   - Has "Bug" label → **A**
   - Has "Feature" label → **B**
   - Has "Documentation" or "Docs" label → **C**
   - Has "Refactor" or "Improvement" label → **D**
2. **Title keywords:**
   - Title contains "fix", "bug", "crash", "error", "broken" (case-insensitive) → **A**
   - Title contains "docs", "documentation", "readme", "changelog", "typo", "comment" → **C**
   - Title contains "refactor", "rename", "cleanup", "clean up", "simplify", "reorganize" → **D**
3. **Description complexity:**
   - Description is empty or under 200 characters → **C**
4. **Fallback** → **B**

Store the pipeline assignment alongside each ticket in the queue.

### 0.7 Create Run Report

Create a report file at `.agents/loop-reports/loop-YYYY-MM-DD-HH-MM.md`:

```markdown
# Loop Run — YYYY-MM-DD HH:MM

## Configuration
- Base branch: <BASE_BRANCH>
- Mode: <single-branch | branch-per-ticket>
- Tickets queued: <count>
- Quality tools: <detected tools>

## Pipeline Legend
- [A] Bug Fix: RCA → Plan → Implement
- [B] Feature: Plan → Implement
- [C] Simple/Docs: Implement directly
- [D] Refactor: Plan → Implement

## Results

| # | Ticket | Title | Pipeline | Status | Branch | PR | Commit | Notes |
|---|--------|-------|----------|--------|--------|----|--------|-------|
```

### 0.8 Print Pre-flight Summary

```
LOOP PRE-FLIGHT
===============
Branch:     <BASE_BRANCH>
Mode:       <single-branch | branch-per-ticket>
Tickets:    <count> queued
Quality:    <lint cmd> | <typecheck cmd> | <test cmd>

Pipelines:  [A] Bug Fix    [B] Feature    [C] Simple/Docs    [D] Refactor

Queue:
  1. EIT-XX — <title> [B] (Priority: High)
  2. EIT-YY — <title> [C] (Priority: Medium)
  ...

Proceed? (Y/n)
```

Ask for confirmation before starting the loop.

## Phase 1: Process Each Ticket

For each ticket in the sorted queue:

### 1.1 Announce

Print:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[N/total] EIT-XX — <title> [<pipeline>]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 1.2 Update Linear to In Progress

Use `mcp__plugin_linear_linear__save_issue` to set the ticket status to "In Progress" using the status ID from Phase 0.3.

### 1.3 Branch Setup (branch-per-ticket mode only)

If `--branch-per-ticket` is active:

1. Ensure you are on `BASE_BRANCH`:
   ```bash
   git checkout <BASE_BRANCH>
   ```
2. Create and switch to the ticket's branch using Linear's `gitBranchName` field from the issue details:
   ```bash
   git checkout -b <ticket.gitBranchName>
   ```

If `--single-branch` (default), skip this step.

### 1.4 Spawn Sub-agent

Use the **Agent** tool with `subagent_type: "general-purpose"` and a **pipeline-specific prompt**.

The prompt is assembled from: **Common Header** + **Pipeline Steps** + **Common Footer**.

---

#### Common Header (all pipelines)

```
You are implementing a single Linear ticket for the mx-workflow project.

## Ticket
- ID: <ticket_identifier>
- Title: <ticket_title>
- Description: <ticket_description>
- Labels: <ticket_labels>
- Pipeline: <pipeline_code> (<pipeline_name>)

## Quality Commands
- Lint/fix: <lint_command or "not available">
- Type-check: <typecheck_command or "not available">
- Test: <test_command or "not available">

## Instructions

Follow these steps exactly:
```

---

#### Pipeline [A] Bug Fix Steps

```
### Step 1: Root Cause Analysis
Read the ticket description and any error messages. Search git log for related recent changes. Identify the root cause — don't just treat symptoms. Write a brief RCA (what broke, why, when it was introduced).

### Step 2: Explore
Search the codebase to understand the relevant files, patterns, and conventions. Read CLAUDE.md for project-specific guidelines.

### Step 3: Plan
Determine the minimal fix. Consider if the root cause has other manifestations that should be fixed together. List files to modify.

### Step 4: Implement
Apply the fix. Keep changes focused — fix the root cause, not symptoms.

### Step 5: Validate
Run each available quality command:
- Lint/fix: <lint_command>
- Type-check: <typecheck_command>
- Test: <test_command>

If any check fails, fix the issue and re-run. Repeat until all checks pass.
If you cannot fix a validation failure after 3 attempts, stop and report the failure.
```

---

#### Pipeline [B] Feature Steps

```
### Step 1: Understand
Read the ticket description carefully. Identify what needs to change and what the acceptance criteria are.

### Step 2: Explore
Search the codebase to understand the relevant files, patterns, and conventions. Read CLAUDE.md for project-specific guidelines.

### Step 3: Plan
Determine the minimal set of changes needed. List the files to create or modify.

### Step 4: Implement
Make the changes. Keep them focused and minimal — only what the ticket requires.

### Step 5: Validate
Run each available quality command:
- Lint/fix: <lint_command>
- Type-check: <typecheck_command>
- Test: <test_command>

If any check fails, fix the issue and re-run. Repeat until all checks pass.
If you cannot fix a validation failure after 3 attempts, stop and report the failure.
```

---

#### Pipeline [C] Simple/Docs Steps

```
### Step 1: Understand
Read the ticket description. This is a straightforward change — identify the exact files and changes needed.

### Step 2: Implement
Make the changes directly. For documentation changes, ensure accuracy and consistent formatting. For simple code changes, follow existing patterns.

### Step 3: Validate
Run each available quality command:
- Lint/fix: <lint_command>
- Type-check: <typecheck_command>
- Test: <test_command>

If any check fails, fix the issue and re-run. Repeat until all checks pass.
If you cannot fix a validation failure after 3 attempts, stop and report the failure.
```

---

#### Pipeline [D] Refactor Steps

```
### Step 1: Understand
Read the ticket description carefully. Identify what is being refactored and why. Understand the desired end state.

### Step 2: Explore
Search the codebase to map all usages of the code being refactored. Read CLAUDE.md for project-specific guidelines. Identify all callers and dependents.

### Step 3: Plan
Determine the refactoring steps. Prioritize preserving behavior — this should be a structural change, not a functional one. List all files to modify.

### Step 4: Implement
Apply the refactoring. Update all callers and references. Ensure no dead code is left behind.

### Step 5: Validate
Run each available quality command:
- Lint/fix: <lint_command>
- Type-check: <typecheck_command>
- Test: <test_command>

If any check fails, fix the issue and re-run. Repeat until all checks pass.
If you cannot fix a validation failure after 3 attempts, stop and report the failure.
```

---

#### Common Footer (all pipelines)

```
### Commit
Stage all changed files and create a commit:

```bash
git add <specific files you changed>
git commit -m "$(cat <<'COMMIT_EOF'
<type>(<scope>)[<ticket_identifier>] <short description>

<body explaining what changed and why>

Co-Authored-By: Claude <noreply@anthropic.com>
COMMIT_EOF
)"
```

Use the commit type/scope conventions:
- Type: feat (new feature), fix (bug fix), refactor, docs, chore, perf
- Scope: infer from changed file paths (commands, agents, references, config, general)

### Report Result

You MUST end your response with exactly this block (no markdown fencing around it):

LOOP_RESULT:
status: SUCCESS or FAILURE
commit: <commit hash from git log -1 --format=%h, or "none">
summary: <one-line summary of what was done>
error: <error description if FAILURE, or "none">
```

### 1.5 Handle Result

Parse the `LOOP_RESULT:` block from the sub-agent response.

**On SUCCESS:**

1. **Branch-per-ticket mode — push and create PR:**
   ```bash
   git push -u origin <ticket.gitBranchName>
   ```
   Then create a PR:
   ```bash
   gh pr create --base <BASE_BRANCH> --title "<type>(<scope>)[<ticket_identifier>] <ticket_title>" --body "$(cat <<'PR_EOF'
   ## Summary
   Resolves <ticket_identifier>: <ticket_title>

   <one-line summary from LOOP_RESULT>

   ## Ticket
   <ticket_url>

   ---
   Generated by `/mx:loop` (pipeline: <pipeline_code>)
   PR_EOF
   )"
   ```
   Store the PR URL from the output.

2. **Update Linear** — Use `mcp__plugin_linear_linear__save_issue` to set the ticket status to "Done"
3. **Update the run report** with commit hash, branch, PR URL, and summary
4. Print: `  ✓ Done — <commit hash> <summary>` (add `→ PR: <url>` if branch-per-ticket)

**On FAILURE:**
- Leave the ticket as "In Progress" in Linear (do not revert)
- If in branch-per-ticket mode, return to base branch: `git checkout <BASE_BRANCH>`
- Update the run report with error
- Print: `  ✗ Failed — <error>`
- **Continue to the next ticket** (do not stop the loop)

### 1.6 Return to Base (branch-per-ticket mode only)

If `--branch-per-ticket` is active and the ticket succeeded:
```bash
git checkout <BASE_BRANCH>
```

This ensures the next ticket starts from a clean base.

## Phase 2: Final Report

### 2.1 Print Summary

```
LOOP COMPLETE
=============
Done:    X / total
Failed:  Y / total
Skipped: Z / total

Pipeline Breakdown:
  [A] Bug Fix:      X processed, Y succeeded
  [B] Feature:      X processed, Y succeeded
  [C] Simple/Docs:  X processed, Y succeeded
  [D] Refactor:     X processed, Y succeeded

Results:
  ✓ EIT-XX — <summary> (abc1234) [B]
  ✓ EIT-YY — <summary> (def5678) [C] → PR: <url>
  ✗ EIT-ZZ — <error> [A]
  ⊘ EIT-AA — Skipped: blocked by EIT-BB
─────────────────────────────────────────
Report: .agents/loop-reports/loop-YYYY-MM-DD-HH-MM.md
```

### 2.2 Finalize Report

Update the `.agents/loop-reports/` file with final results, filling in all table rows and adding a summary section at the bottom:

```markdown
## Summary
- **Done:** X
- **Failed:** Y
- **Skipped:** Z
- **Total time:** (approximate)

## Pipeline Breakdown
- **[A] Bug Fix:** X processed, Y succeeded
- **[B] Feature:** X processed, Y succeeded
- **[C] Simple/Docs:** X processed, Y succeeded
- **[D] Refactor:** X processed, Y succeeded
```

## Rules

- **Never force-push or rebase.** Each ticket gets its own commit on the current branch (or its own branch in branch-per-ticket mode).
- **Failures skip, don't stop.** A failed ticket is logged and left as In Progress; the loop continues.
- **One ticket at a time.** Do not parallelize sub-agents — each builds on prior commits.
- **Minimal changes only.** Sub-agents implement only what the ticket requires.
- **Always validate.** Quality checks run after every implementation.
- **Report everything.** Every ticket outcome is logged in the report file.
- **Branch-per-ticket isolation.** In `--branch-per-ticket` mode, always return to `BASE_BRANCH` between tickets. Never cross-contaminate branches.
- **Pipeline-driven prompts.** Always use the classified pipeline to select the sub-agent prompt template. Never use a generic prompt.
