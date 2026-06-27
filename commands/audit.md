---
description: "Comprehensive whole-repo quality audit with trend tracking — the periodic/cron-friendly evolution of /mx:qa"
argument-hint: "[--scope <path>] [--since <date>] [--no-trend]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Agent"]
---

# Audit

Where `/mx:qa` audits your **current diff**, `/mx:audit` audits the **whole repository** and tracks how its health changes over time. It's built to run on a schedule (e.g. a weekly cron) or by hand at a milestone, and it tells you not just "is the code clean today" but "is it getting better or worse."

It wraps `/mx:qa --full`'s checks at whole-repo scope and adds historical trend comparison. No breaking changes to `/mx:qa` — that command stays as the fast, diff-scoped audit.

**Options:** $ARGUMENTS

## Flags

| Flag | Effect |
|------|--------|
| (none) | Audit the entire repository, compare against the previous audit |
| `--scope <path>` | Limit the audit to a subtree (still whole-subtree, not diff) |
| `--since <date>` | Compare trend against the audit nearest this date instead of the most recent |
| `--no-trend` | Skip historical comparison (first run, or one-off snapshot) |

## Step 1: Run the Full Quality Audit (whole repo)

Invoke the `mx-quality-keeper` agent to run the `/mx:qa --full` check suite, but scoped to the **entire codebase** rather than the git diff:

- **Lint / type-check / tests** — full run, all output collected (don't stop at first failure)
- **Suppression audit** — count and locate every suppression comment in the repo (not just new ones)
- **Dependency audit** — security scan for critical/high vulnerabilities (`npm audit`, `pip-audit`, `cargo audit`, `govulncheck`, etc.)
- **Spec conformance** — if PRDs/plans exist in `.agents/`, verify must-haves repo-wide

Detect tooling and package manager exactly as `/mx:qa` does. Skip (and note) any check whose tooling is absent.

## Step 2: Snapshot the Metrics

Capture a compact, comparable metrics block for trend tracking:

```
date, lint_issues, type_errors, test_pass, test_fail, coverage_pct,
suppressions, vuln_critical, vuln_high, spec_pass, spec_total
```

## Step 3: Trend Comparison (unless --no-trend)

Look for prior reports in `.agents/reports/audit-*.md`. Pick the comparison point (most recent, or nearest `--since`). For each metric, show the delta and whether it's improving or regressing. If no prior audit exists, note "baseline run — no trend yet."

## Step 4: Report

Save to `.agents/reports/audit-{YYYY-MM-DD}.md` (suffix `-2`, `-3` if one already exists for today). Embed the machine-readable metrics block near the top (so the next run can parse it) and print a summary:

```
REPOSITORY AUDIT
================
Scope:  whole repo   Date: 2026-06-26
Prev:   2026-06-19 (7 days ago)

HEALTH                 NOW       PREV      TREND
──────────────────────────────────────────────────
Lint issues            4         9         ▼ -5   improving
Type errors            0         0         =      held
Tests                  142/142   138/140   ▲ +4   improving
Coverage               84.1%     82.0%     ▲ +2.1 improving
Suppressions           13        11        ▲ +2   REGRESSING
Vulns (crit/high)      0 / 1     0 / 3     ▼ -2   improving
Spec conformance       18/20     17/20     ▲ +1   improving
──────────────────────────────────────────────────
OVERALL: Improving — one regression (suppressions +2)

ACTION ITEMS
  - Suppressions climbed by 2 — see src/api.ts:40, src/api.ts:77
  - 1 high-severity dependency vuln remains — <pkg> <advisory>

File: .agents/reports/audit-2026-06-26.md
```

## Running on a schedule

This command is cron-friendly. To run it headless weekly, point a scheduler at:

```bash
claude -p "/mx:audit" --permission-mode acceptEdits
```

Each run appends a dated report, so the trend builds itself over time. Mention this when the user asks about automation; don't install a cron job for them without being asked.
