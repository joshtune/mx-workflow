---
description: "Audit dependencies for security issues and outdated versions"
argument-hint: "[--security | --outdated | --unused]"
allowed-tools: ["Bash", "Read", "Glob", "Write"]
---

# Dependency Security & Version Audit

Audit project dependencies for security vulnerabilities, outdated versions, and unused packages.

**Options:** $ARGUMENTS

- `--security` — Only run security audit
- `--outdated` — Only check for outdated dependencies
- `--unused` — Only check for unused dependencies
- *(no flag)* — Run all checks

## Instructions

### Step 0: Detect Package Manager

Detect the project's package manager and ecosystem by checking for lock files and manifests in the project root:

| Lock file / Manifest | Package Manager | Ecosystem |
|---|---|---|
| `pnpm-lock.yaml` | `pnpm` | Node.js |
| `yarn.lock` | `yarn` | Node.js |
| `bun.lockb` | `bun` | Node.js |
| `package-lock.json` | `npm` | Node.js |
| `package.json` (no lock file) | `npm` | Node.js |
| `Cargo.lock` / `Cargo.toml` | `cargo` | Rust |
| `poetry.lock` / `pyproject.toml` (with `[tool.poetry]`) | `poetry` | Python |
| `Pipfile.lock` / `Pipfile` | `pipenv` | Python |
| `requirements.txt` / `pyproject.toml` | `pip` | Python |
| `go.sum` / `go.mod` | `go` | Go |
| `Gemfile.lock` / `Gemfile` | `bundler` | Ruby |
| `composer.lock` / `composer.json` | `composer` | PHP |

If multiple ecosystems are detected, audit all of them and combine results.

If no package manager is detected, stop and tell the user: "No supported package manager detected. Supported: npm, yarn, pnpm, bun, cargo, pip, poetry, pipenv, go, bundler, composer."

### Step 1: Security Audit (unless --outdated or --unused only)

Skip this step if `$ARGUMENTS` is exactly `--outdated` or `--unused`.

Run the appropriate security audit command:

| Package Manager | Command |
|---|---|
| `npm` | `npm audit --json` (parse JSON for structured output) |
| `yarn` (v1) | `yarn audit --json` |
| `yarn` (berry) | `yarn npm audit --all` |
| `pnpm` | `pnpm audit --json` |
| `bun` | `bun audit` (if available, else skip with note) |
| `cargo` | `cargo audit` (requires `cargo-audit`; if missing, note: `cargo install cargo-audit`) |
| `pip` | `pip-audit` (if available; if missing, note: `pip install pip-audit`) |
| `poetry` | `poetry audit` or `pip-audit` |
| `pipenv` | `pipenv check` |
| `go` | `govulncheck ./...` (if available; if missing, note: `go install golang.org/x/vuln/cmd/govulncheck@latest`) |
| `bundler` | `bundle audit check` (requires `bundler-audit`; if missing, note: `gem install bundler-audit`) |
| `composer` | `composer audit` |

Capture the output. Do NOT fail if the audit command exits non-zero (vulnerabilities found is expected). Categorize findings by severity: **critical**, **high**, **moderate/medium**, **low**.

### Step 2: Outdated Dependencies (unless --security or --unused only)

Skip this step if `$ARGUMENTS` is exactly `--security` or `--unused`.

Run the appropriate outdated check:

| Package Manager | Command |
|---|---|
| `npm` | `npm outdated --json` |
| `yarn` | `yarn outdated` |
| `pnpm` | `pnpm outdated --format json` |
| `bun` | `bun outdated` |
| `cargo` | `cargo outdated` (requires `cargo-outdated`; if missing, note it) |
| `pip` | `pip list --outdated --format json` |
| `poetry` | `poetry show --outdated` |
| `pipenv` | `pipenv update --dry-run` |
| `go` | `go list -m -u all` |
| `bundler` | `bundle outdated` |
| `composer` | `composer outdated --format json` |

Categorize outdated packages into:
- **Major** — major version behind (likely breaking changes)
- **Minor** — minor version behind (new features)
- **Patch** — patch version behind (bug fixes)

### Step 3: Unused Dependencies (unless --security or --outdated only)

Skip this step if `$ARGUMENTS` is exactly `--security` or `--outdated`.

Attempt to detect unused dependencies if tooling is available:

| Package Manager | Command |
|---|---|
| Node.js | `npx depcheck` (if available) |
| Rust | `cargo machete` (if available) |
| Python | `pip-extra-reqs` or manual scan of imports vs requirements |

If no unused-dependency tool is available for the detected ecosystem, skip this step with a note: "No unused dependency tool available for [ecosystem]. Consider installing [tool]."

### Step 4: Report

Output a summary to the terminal:

```
DEPENDENCY AUDIT — [project name]
==================================
Package Manager: [detected manager]
Date: [YYYY-MM-DD]

SECURITY VULNERABILITIES
────────────────────────
  Critical:  [count]
  High:      [count]
  Moderate:  [count]
  Low:       [count]
  Total:     [count]

  [If any critical/high, list the top findings with package name, severity, and advisory title]

OUTDATED DEPENDENCIES
─────────────────────
  Major updates:  [count] (breaking changes likely)
  Minor updates:  [count]
  Patch updates:  [count]
  Total outdated: [count]

  [List major-version-behind packages: name current → latest]

UNUSED DEPENDENCIES
───────────────────
  [count] potentially unused packages found
  [List them, or "Skipped — no tooling available for [ecosystem]"]

─────────────────────────────────────
Overall: [PASS if 0 critical/high vulns, else NEEDS ATTENTION]
```

### Step 5: Save Report (optional)

If `$ARGUMENTS` contains `--save`, or if any critical or high severity vulnerabilities were found, save the full report to:

```
.agents/reports/deps-audit-YYYY-MM-DD.md
```

Create the `.agents/reports/` directory if it does not exist.

Tell the user the file path where the report was saved.
