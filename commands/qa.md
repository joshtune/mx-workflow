---
description: "Run comprehensive quality audit on current work"
argument-hint: "[--scope <path> | --full | --contracts-only]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Agent"]
---

# Quality Audit

Run a comprehensive quality audit using the `mx-quality-keeper` agent. Goes beyond `/mx:validate` by adding suppression audits, dependency checks, and contract conformance verification.

**Options:** $ARGUMENTS

## Flags

| Flag | Effect |
|------|--------|
| (none) | Audit current git diff (staged + unstaged changes) — lint, types, tests only |
| `--scope <path>` | Limit audit to a specific directory or file |
| `--full` | All checks: lint, types, tests, suppression audit, dependency audit |
| `--contracts-only` | Only check contract/interface conformance (for use after team builds) |

## Step 0: Detect Quality Commands

Determine what checks are available:

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

## Step 1: Determine Scope

Parse `$ARGUMENTS` to determine what to audit:

- **No flags**: Scope to files in `git diff` and `git diff --cached` (staged + unstaged changes)
- **`--scope <path>`**: Scope to the specified path
- **`--full`**: Full codebase — all checks including suppression audit and dependency audit
- **`--contracts-only`**: Skip quality checks, only verify contract conformance

If there are no changes and no flags, tell the user there's nothing to audit.

## Step 2: Run Quality Checks

Run lint, type-check, and tests using the detected commands. Collect all output — do not stop at the first failure.

If `--contracts-only` is set, skip this step entirely.

## Step 3: Run Extended Checks (if --full)

If `$ARGUMENTS` contains `--full`, run these additional checks:

### Suppression Audit

Scan changed files for suppression comments based on the detected stack:

- TypeScript/JavaScript: `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `eslint-disable-next-line`
- Svelte: `svelte-ignore`
- Biome: `biome-ignore`
- Rust: `#[allow(`, `#![allow(`
- Python: `# noqa`, `# type: ignore`
- Go: `//nolint`

Flag new suppressions. A suppression is acceptable only with an adjacent justification comment.

### Dependency Audit

Run a security-only dependency check for critical and high vulnerabilities:

| Manager | Command |
|---------|---------|
| npm | `npm audit --json` |
| pnpm | `pnpm audit --json` |
| yarn | `yarn audit --json` |
| cargo | `cargo audit` |
| pip | `pip-audit` |
| go | `govulncheck ./...` |

Report critical/high vulnerabilities. Moderate/low are warnings, not failures.

## Step 4: Contract Conformance Check (if --contracts-only or --full)

Look for contract definitions in:
- `.agents/` directory (contract files from team builds)
- Recent conversation context (if invoked during/after a team build)

If contracts are found, compare the implementation against them:
- Do API endpoints match? (URLs, methods, trailing slashes)
- Do request/response shapes match? (field names, types, nesting)
- Are status codes correct?

If no contracts are found and `--contracts-only` was specified, tell the user no contracts were found.

## Step 5: Produce Report

Save the full report to `.agents/reports/qa-audit-{YYYY-MM-DD}.md`. Create the directory if it does not exist.

Display a terminal summary:

```
QA AUDIT COMPLETE
=================
Scope:             [what was checked]
Date:              [YYYY-MM-DD]

CHECKS
──────
Lint:              PASS / FAIL
Type-check:        PASS / FAIL
Tests:             PASS / FAIL
Suppressions:      X new (Y flagged)      [--full only]
Dependencies:      PASS / FAIL            [--full only]
Contract:          PASS / FAIL / N/A      [--full or --contracts-only]
────────────────────────────────
Overall:           PASS / FAIL

FAILURES (if any)
- [check]: [file:line] — [description]

File: .agents/reports/qa-audit-{date}.md
```

Only include checks that were actually run — don't report on skipped or unavailable checks.
