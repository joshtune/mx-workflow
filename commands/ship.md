---
description: "Fix, check, commit, and push in one step"
argument-hint: "[commit description]"
allowed-tools: ["Bash", "Read", "Glob"]
---

# Ship It

Run quality checks, commit, and push — all in one command.

**Description (optional):** $ARGUMENTS

## Instructions

### Step 0: Detect Project Tools

Determine quality commands and package manager using the same detection as `/validate`:

1. Check `CLAUDE.md` for documented commands
2. Detect from `package.json` scripts, `Makefile`, `Cargo.toml`, `go.mod`, `pyproject.toml`
3. Detect package manager from lock files (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, `package-lock.json` → npm)

### Step 1: Auto-fix

Run the lint/fix command if the project has one. If it fails, stop and report the errors.

### Step 2: Type Check

Run the type-check command if available. If it fails, stop and report the errors.

### Step 3: Framework-Specific Checks

Run any framework-specific checks (e.g., `svelte-check`, `next lint`, `astro check`). If any fail, stop and report the errors.

### Step 4: Stage & Commit

Follow the same commit logic as `/commit`:

1. Run in parallel:
```bash
git status
git diff --cached --stat
git diff --stat
git branch --show-current
```

2. Infer ticket number from branch (if `FV_BRANCH_PATTERN` is set):
```bash
git branch --show-current | grep -oP '${FV_BRANCH_PATTERN}\K\d+' | head -1
```

3. Infer scope from changed files and type from context — read `references/scope-mappings.md` from this plugin for the mapping tables.

4. If there are unstaged changes and nothing is staged, run `git add -A`. If some files are already staged, ask the user if they want to add more.

5. Build commit message:
```
<type>(<scope>)[${FV_TICKET_PREFIX} <ticket>] <description>

<optional body - what changed and why>

Co-Authored-By: ${FV_CO_AUTHOR:-Claude <noreply@anthropic.com>}
```

If `FV_TICKET_PREFIX` or ticket number is not available, omit the `[PREFIX TICKET]` portion.

If `$ARGUMENTS` provides a description, use it. Otherwise, summarize from the diff.

6. Show the proposed commit message and ask: "Ship it?"

7. Create the commit:
```bash
git commit -m "$(cat <<'EOF'
<formatted message>
EOF
)"
```

### Step 5: Push

```bash
git push
```

If the branch has no upstream, use:
```bash
git push -u origin $(git branch --show-current)
```

### Step 6: Report

```
SHIP RESULTS
============
<check 1>:       PASS / FAIL
<check 2>:       PASS / FAIL
Commit:           <hash> <message>
Push:             PASS / FAIL
─────────────────────────────
Overall:          SHIPPED / FAILED
```

Only include checks that were actually run.
