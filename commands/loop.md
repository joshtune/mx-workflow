---
description: "Process Linear tickets sequentially — plan, implement, commit, mark done"
argument-hint: "[ticket-id | 'all']"
allowed-tools: ["Bash", "Glob", "Read", "Write", "Agent",
                "mcp__plugin_linear_linear__list_issues",
                "mcp__plugin_linear_linear__get_issue",
                "mcp__plugin_linear_linear__save_issue",
                "mcp__plugin_linear_linear__list_issue_statuses"]
---

# Loop — Sequential Ticket Processor

Process Linear tickets one by one: plan, implement, validate, commit, mark done.

**Arguments:** $ARGUMENTS

## Phase 0: Pre-flight

### 0.1 Check Git Clean

```bash
git status --porcelain
```

If there are uncommitted changes, **abort** with:
> Working tree is dirty. Please commit or stash changes before running `/loop`.

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

Based on `$ARGUMENTS`:

| Input | Behavior |
|-------|----------|
| *(blank)* | Fetch all open tickets assigned to me (states: Backlog, Todo, In Progress) |
| `EIT-37` | Single ticket by identifier |
| `EIT-25,EIT-30` | Comma-separated list of specific tickets |
| `all` | All open project tickets regardless of assignee |

Use `mcp__plugin_linear_linear__list_issues` with appropriate filters. For each ticket, fetch full details with `mcp__plugin_linear_linear__get_issue` if needed.

### 0.5 Sort and Filter

1. **Sort by priority** (Urgent=1 → High=2 → Medium=3 → Low=4 → None=0 last), then by issue number ascending
2. **Dependency check** — For each ticket, check if it has blocking relations:
   - If blocked by a ticket **outside** this run → skip it immediately
   - If blocked by a ticket **inside** this run → defer it (move to end of queue once)
   - If still blocked after deferral → skip with reason

### 0.6 Create Run Report

Create a report file at `.agents/loop-reports/loop-YYYY-MM-DD-HH-MM.md`:

```markdown
# Loop Run — YYYY-MM-DD HH:MM

## Configuration
- Branch: <current branch>
- Tickets queued: <count>
- Quality tools: <detected tools>

## Results

| # | Ticket | Title | Status | Commit | Notes |
|---|--------|-------|--------|--------|-------|
```

### 0.7 Print Pre-flight Summary

```
LOOP PRE-FLIGHT
===============
Branch:     <current branch>
Tickets:    <count> queued
Quality:    <lint cmd> | <typecheck cmd> | <test cmd>

Queue:
  1. EIT-XX — <title> (Priority: High)
  2. EIT-YY — <title> (Priority: Medium)
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
[N/total] EIT-XX — <title>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 1.2 Update Linear to In Progress

Use `mcp__plugin_linear_linear__save_issue` to set the ticket status to "In Progress" using the status ID from Phase 0.3.

### 1.3 Spawn Sub-agent

Use the **Agent** tool with `subagent_type: "general-purpose"` and the following prompt (fill in the placeholders):

```
You are implementing a single Linear ticket for the mx-workflow project.

## Ticket
- ID: <ticket_identifier>
- Title: <ticket_title>
- Description: <ticket_description>
- Labels: <ticket_labels>

## Quality Commands
- Lint/fix: <lint_command or "not available">
- Type-check: <typecheck_command or "not available">
- Test: <test_command or "not available">

## Instructions

Follow these steps exactly:

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

### Step 6: Commit
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

### Step 7: Report Result

You MUST end your response with exactly this block (no markdown fencing around it):

LOOP_RESULT:
status: SUCCESS or FAILURE
commit: <commit hash from git log -1 --format=%h, or "none">
summary: <one-line summary of what was done>
error: <error description if FAILURE, or "none">
```

### 1.4 Handle Result

Parse the `LOOP_RESULT:` block from the sub-agent response.

**On SUCCESS:**
- Use `mcp__plugin_linear_linear__save_issue` to set the ticket status to "Done"
- Update the run report with commit hash and summary
- Print: `  ✓ Done — <commit hash> <summary>`

**On FAILURE:**
- Leave the ticket as "In Progress" in Linear (do not revert)
- Update the run report with error
- Print: `  ✗ Failed — <error>`
- **Continue to the next ticket** (do not stop the loop)

## Phase 2: Final Report

### 2.1 Print Summary

```
LOOP COMPLETE
=============
Done:    X / total
Failed:  Y / total
Skipped: Z / total

Results:
  ✓ EIT-XX — <summary> (abc1234)
  ✗ EIT-YY — <error>
  ⊘ EIT-ZZ — Skipped: blocked by EIT-AA
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
```

## Rules

- **Never force-push or rebase.** Each ticket gets its own commit on the current branch.
- **Failures skip, don't stop.** A failed ticket is logged and left as In Progress; the loop continues.
- **One ticket at a time.** Do not parallelize sub-agents — each builds on prior commits.
- **Minimal changes only.** Sub-agents implement only what the ticket requires.
- **Always validate.** Quality checks run after every implementation.
- **Report everything.** Every ticket outcome is logged in the report file.
