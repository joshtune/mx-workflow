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

## Step 5: Spec Conformance Check (if --full or spec found)

**This is the most important check.** Structural checks verify the code is clean. Spec conformance verifies the feature was actually built.

### 5.1 Find the Spec

Look for PRD files in `.agents/prds/` and plan files in `.agents/plans/`. If multiple exist, use the most recent one. Also check conversation context for requirements.

If no spec is found and `--full` was not passed, skip this step.

### 5.2 Extract Requirements by Role

From the PRD's "User Roles & Expectations" section, pull every role and every "Must" expectation with its unique ID (e.g., A1, C2). Also pull from the MVP Scope table for system-level must-haves not tied to a specific role.

### 5.3 Verify Each Requirement

For every must-have, grouped by role:

1. **Does the code exist?** Search for the implementation — routes, components, functions, database tables, API endpoints.

2. **Is it wired up?** A component that exists but isn't rendered, an endpoint that exists but isn't routed, or a function that exists but isn't called is NOT implemented.

3. **Does it handle the expected behavior?** Read the implementation and verify it matches the spec — correct fields, correct logic, correct flow.

4. **Is it role-gated?** If the system has multiple roles, verify that role-specific actions are properly restricted. An admin action accessible to all users is a FAIL.

### 5.4 Report

For each must-have, grouped by role, report one of:

| Verdict | Meaning |
|---------|---------|
| **PASS** | Implementation exists, is wired up, and matches the spec |
| **FAIL** | Implementation exists but is incomplete or incorrect |
| **MISS** | No implementation found at all — the spec item was likely dropped or forgotten |

```
SPEC CONFORMANCE
================

ADMIN
[ PASS ] A1: Can remove users from system — DELETE /api/users/:id exists, admin middleware applied
[ FAIL ] A2: Can view all users — GET /api/users exists but no UI page renders the list

CUSTOMER
[ PASS ] C1: Can add items to cart — POST /api/cart exists, AddToCart button wired up
[ MISS ] C2: Can checkout and pay — no checkout implementation found

Summary: 2/4 PASS, 1 FAIL, 1 MISS
```

**MISS items are escalated immediately** — they indicate a requirement was entirely forgotten, not just implemented incorrectly.

## Step 6: Produce Report

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
Spec conformance:  X/Y must-haves (Z fail, W miss)  [--full or spec found]
────────────────────────────────
Overall:           PASS / FAIL

SPEC CONFORMANCE (if checked)
[ PASS ] <requirement> — <evidence>
[ FAIL ] <requirement> — <what's wrong>
[ MISS ] <requirement> — <no implementation found>

FAILURES (if any)
- [check]: [file:line] — [description]

File: .agents/reports/qa-audit-{date}.md
```

Only include checks that were actually run — don't report on skipped or unavailable checks.
