---
description: "Run all quality checks (lint, type-check, tests)"
argument-hint: "[--fix | --no-test]"
allowed-tools: ["Bash", "Read", "Glob"]
---

# Run All Quality Checks

Run the full validation suite and report results.

**Options:** $ARGUMENTS

## Instructions

### Step 0: Detect Quality Commands

Determine what checks are available by reading the project's configuration:

1. Check `CLAUDE.md` at the project root for documented quality commands
2. If no CLAUDE.md, detect from project files:

| Indicator | Lint/Fix | Type Check | Tests |
|-----------|----------|------------|-------|
| `package.json` scripts | `lint` or `lint:fix` or `fix` | `type-check` or `typecheck` or `check` | `test` |
| `Makefile` / `Justfile` | `make lint` | `make check` | `make test` |
| `Cargo.toml` | `cargo clippy --fix` | `cargo check` | `cargo test` |
| `go.mod` | `golangci-lint run --fix` | `go vet ./...` | `go test ./...` |
| `pyproject.toml` | `ruff check --fix .` | `mypy .` or `pyright` | `pytest` |

3. Detect the package manager from lock files:

| Lock file | Package manager |
|-----------|----------------|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `bun.lockb` | `bun` |
| `package-lock.json` | `npm` |

Use the detected package manager to run scripts (e.g., `pnpm lint`, `npm run lint`).

### Step 1: Auto-fix (if available and not skipped)

If `$ARGUMENTS` contains `--no-fix`, skip this step. Otherwise, run the lint/fix command if the project has one.

### Step 2: Type Check (if available)

Run the type-check command if the project has one. Skip silently if not available.

### Step 3: Framework-Specific Checks (if available)

Run any framework-specific checks detected in `package.json` scripts (e.g., `svelte-check`, `next lint`, `astro check`). Skip silently if not applicable.

### Step 4: Tests (unless --no-test)

If `$ARGUMENTS` contains `--no-test`, skip this step. Otherwise, run the test command.

### Step 5: Report

Output a clear report listing each check that was run:

```
VALIDATION RESULTS
==================
<check 1>:       PASS / FAIL
<check 2>:       PASS / FAIL
<check 3>:       PASS / FAIL
─────────────────────────────
Overall:          PASS / FAIL
```

If any check fails, show the first few errors with file:line references so they can be fixed.

Only include checks that were actually run — don't report on skipped or unavailable checks.
