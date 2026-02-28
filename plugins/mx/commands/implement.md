---
description: "Execute implementation plan with validation loops"
argument-hint: "[plan reference or 'continue']"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit", "Task"]
---

# Execute Plan with Validation

Implement the current plan step by step, validating after each change.

**Context:** $ARGUMENTS

## Instructions

### Step 0: Detect Quality Commands

Before implementing, determine how to validate in this project:

1. Check `CLAUDE.md` for documented quality commands
2. Detect from project files (`package.json` scripts, `Makefile`, `Cargo.toml`, `go.mod`, `pyproject.toml`)
3. Detect package manager from lock files (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, `package-lock.json` → npm)

Identify the available checks:
- **Lint/fix command** (e.g., `pnpm lint:fix`, `cargo clippy --fix`, `ruff check --fix .`)
- **Type-check command** (e.g., `npm run type-check`, `cargo check`, `mypy .`)
- **Test command** (e.g., `pnpm test`, `cargo test`, `pytest`)
- **Combined quality command** if one exists (e.g., `pnpm code-quality`, `make check`)

Use whatever is available. A combined command is preferred if it exists; otherwise chain the individual checks.

### Step 1: Load the Plan

If a plan was provided in the conversation context or as an argument, use it. The plan can be:
- From a previous `/mx:plan` command in this session
- Pasted directly in the arguments
- Referenced by section (e.g., "follow Step 2 of the plan")

If no explicit plan exists, ask for clarification: "What changes should I implement?"

### Step 2: Execute Each Step

For each step in the plan:

1. **Implement the change**
   - Write or edit the file(s) as specified
   - Follow the patterns identified in the plan
   - Keep changes minimal and focused

2. **Validate immediately**
   Run the quality checks detected in Step 0.

3. **If validation fails:**
   - Read the error output carefully (file:line:column)
   - Fix the specific issue
   - Re-run validation
   - Repeat until clean

4. **If validation passes:**
   - Note the step as complete
   - Move to the next step

### Step 3: Write Tests

After implementation steps are complete:

1. Write tests as specified in the plan
2. Run the test command
3. If tests fail, read the diff (expected vs actual), fix, and re-run

### Step 4: Final Validation

Run the full suite — all quality checks plus tests.

### Step 5: Agent Review Pass

After all checks pass, run review agents using the Task tool to catch issues before commit.

**Always run (in parallel):**
- **mx-code-reviewer** — Check changes against CLAUDE.md guidelines and catch bugs
- **mx-silent-failure-hunter** — Audit error handling in changed code

**Run if applicable:**
- **mx-type-design-analyzer** — If new types/interfaces were added
- **mx-mr-test-analyzer** — If test files were added or modified

**After agents report:**
- Fix any CRITICAL issues they find (confidence >= 90 or severity CRITICAL)
- Address IMPORTANT issues (confidence >= 80 or severity HIGH)
- Re-run quality checks if fixes were made

**Then run:**
- **mx-code-simplifier** — Polish pass on changed code (preserves functionality, improves clarity)
- Re-run quality checks after simplification

### Step 6: Implementation Report

Output a summary:

```markdown
## Implementation Complete

### Changes Made
- `path/to/file.ext` - <what changed>
- `path/to/file.ext` - <what changed>

### Tests
- <test file> - <X tests passing>

### Validation
- <check 1>: PASS
- <check 2>: PASS

### Agent Review
- mx-code-reviewer: PASS (X issues found, X fixed)
- mx-silent-failure-hunter: PASS (X issues found, X fixed)
- mx-code-simplifier: X refinements applied

### Ready for
- `/commit` - Create conventional commit
```

## Rules

- **Never skip validation.** Run quality checks after every file change.
- **Fix errors before moving on.** Do not proceed to the next step while checks are failing.
- **One step at a time.** Don't batch multiple unrelated changes.
- **Follow the plan.** If the plan needs adjusting, say so and get confirmation.
- **Track progress.** Report which steps are complete as you go.
- **Agent reviews are not optional.** Run them before declaring implementation complete.
