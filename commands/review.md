---
description: "Review-grade verdict on your code — bundles the 8 review agents into one Pass / Warnings / Reject report"
argument-hint: "[--strict | --advisory] [--staged | --commit <sha> | --branch <name>] [--scope <path>]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Task"]
---

# Review

The headline review command. Bundles all 8 review-grade agents into a single verdict on your changes: **PASS**, **PASS WITH WARNINGS**, or **REJECT**, with per-agent findings and a recommendation.

This is the refusal layer — it interrogates code (yours or an AI's) and pushes back on silent failures, hallucinated APIs, suppressed errors, weak types, missing tests, and unjustified shortcuts. It is **read-only**: it reports and recommends, it never modifies code.

**Options:** $ARGUMENTS

## Flags

| Flag | Effect |
|------|--------|
| (none) | Review everything that differs from trunk — committed branch work **and** uncommitted changes |
| `--staged` | Review only staged changes (`git diff --cached`) |
| `--commit <sha>` | Review a single commit's diff (`git show <sha>`) |
| `--branch <name>` | Compare against an explicit base branch instead of auto-detected trunk |
| `--scope <path>` | Limit the review to a directory or file |
| `--strict` | **Mode 1** — REJECT on any CRITICAL **or** HIGH finding |
| (default) | **Mode 2 (balanced)** — REJECT on CRITICAL; HIGH becomes a warning |
| `--advisory` | **Mode 3** — never REJECT; report all findings labeled by severity |

## Step 1: Determine Scope

Compute the set of changed files. Default behavior reviews **all changes relative to trunk**, so it works whether you're mid-branch or just have uncommitted edits.

1. **Detect trunk.** Use `--branch <name>` if given. Otherwise pick the first that exists: `main`, then `master` (`git rev-parse --verify <name>`). If neither exists, fall back to reviewing uncommitted changes only.

2. **Resolve the base** (unless a scoping flag overrides):
   - Default: `BASE=$(git merge-base HEAD <trunk>)`. Then the review set is `git diff --name-only $BASE` — this captures committed-on-branch changes **and** the working tree (staged + unstaged). When you're sitting on trunk itself, the merge-base is `HEAD`, so this naturally reduces to just your uncommitted changes.
   - `--staged`: review set is `git diff --cached --name-only`.
   - `--commit <sha>`: review set is `git show --name-only --format= <sha>`.
   - `--branch <name>`: same as default but with the given base.

3. **Include untracked files.** `git diff` ignores new files that were never added — and brand-new files are the most common shape of AI-generated code. For the default and `--branch` cases, add `git ls-files --others --exclude-standard` (respecting `--scope`) to the review set so whole new modules don't slip through unreviewed. (`--staged` and `--commit` cases don't need this — those sets are explicit.)

4. **Apply `--scope <path>`** if present — filter the review set to files under that path.

5. Capture the actual content for the review set: `git diff $BASE -- <tracked files>` plus the full text of any untracked files. Agents review this, not the whole repo.

If the review set is empty, tell the user there's nothing to review and stop.

## Step 2: Classify What Changed

Inspect the diff so you only spend agents where they apply:

- **Types/interfaces touched?** (new or modified `type`/`interface`/`struct`/`class`/`enum` declarations) → run type-design analysis
- **Test files touched?** (`*.test.*`, `*.spec.*`, `*_test.*`, `e2e/`, `tests/`) → run test analysis
- **Comments/docstrings touched?** → run comment analysis

The four always-on agents run regardless.

## Step 3: Run the Review Agents (in parallel)

Invoke the review-grade agents via the Task tool. Pass each agent the diff and the list of changed files as scope. Launch them concurrently — they are independent and read-only.

**Always run:**
- **mx-code-reviewer** — bugs, CLAUDE.md guideline violations, logic/null/race issues (reports issues scoring ≥80)
- **mx-silent-failure-hunter** — empty catches, swallowed errors, inappropriate fallbacks, mock code in production paths
- **mx-performance-auditor** — algorithmic complexity, N+1s, memory and render hot paths
- **mx-quality-keeper** — orchestrates structural checks (lint, type-check, tests via `/mx:validate`; suppressions via `/mx:check-ignores`) and reports pass/fail

**Run if applicable (from Step 2):**
- **mx-type-design-analyzer** — if types/interfaces changed
- **mx-mr-test-analyzer** — if test files changed
- **mx-comment-analyzer** — if comments/docstrings changed

**Always run last, in suggest-only mode:**
- **mx-code-simplifier** — runs in **report-only** mode for this command: surface simplification opportunities as findings (severity INFO). **It must NOT modify any files here** — `/mx:review` is read-only. Direct the user to `/mx:implement` or `/mx:simplify` to apply.

Each agent returns its findings with severity. Normalize severities to a common scale:

| Normalized | Maps from |
|-----------|-----------|
| CRITICAL | severity CRITICAL, or confidence ≥ 90 |
| HIGH | severity HIGH / IMPORTANT, or confidence ≥ 80 |
| MEDIUM | severity MEDIUM, criticality 5–6 |
| INFO | INFO, simplifier suggestions, nice-to-haves |

## Step 4: Compute the Verdict

Pick the threshold from the mode flag (default **balanced**):

| Mode | Flag | REJECT when | WARNINGS when |
|------|------|-------------|---------------|
| 1 — strict | `--strict` | any CRITICAL **or** HIGH finding | (n/a — HIGH already rejects) MEDIUM/INFO present |
| 2 — balanced *(default)* | none | any CRITICAL finding | any HIGH finding (no CRITICAL) |
| 3 — advisory | `--advisory` | never | any finding present |

Verdict resolution:
- **REJECT** — threshold for the active mode is met.
- **PASS WITH WARNINGS** — no REJECT trigger, but warnings exist.
- **PASS** — no findings above INFO.

**Always produce a recommendation with reasons**, regardless of mode — e.g. "Reject: the auth fallback in `auth.ts:42` silently grants access on token-parse failure; fix before merge." In advisory mode, still state what the verdict *would be* under balanced mode so the signal isn't lost.

## Step 5: Report

Save the full report to `.agents/reports/review-{YYYY-MM-DD}.md` (create the directory if needed; if a report already exists for today, append a `-2`, `-3` suffix).

Display a terminal summary:

```
MX REVIEW
=========
Scope:      <e.g. branch vs main — committed + uncommitted>
Base:       <trunk> @ <merge-base sha>
Mode:       balanced
Files:      <N> changed

VERDICT:    PASS / PASS WITH WARNINGS / REJECT

Recommendation:
  <one or two sentences — what to do and why, citing the strongest findings>

AGENT FINDINGS
──────────────
mx-code-reviewer         <PASS | N findings: X critical, Y high, Z info>
mx-silent-failure-hunter <…>
mx-performance-auditor   <…>
mx-quality-keeper        <lint/types/tests: PASS|FAIL · suppressions: N>
mx-type-design-analyzer  <… | not run (no type changes)>
mx-mr-test-analyzer      <… | not run (no test changes)>
mx-comment-analyzer      <… | not run (no comment changes)>
mx-code-simplifier       <N suggestions (report-only)>

TOP FINDINGS
────────────
[CRITICAL] <file:line> — <what's wrong> (mx-silent-failure-hunter)
[HIGH]     <file:line> — <what's wrong> (mx-code-reviewer)
[INFO]     <file:line> — <suggestion> (mx-code-simplifier)

File: .agents/reports/review-{date}.md
```

Only list agents that actually ran with results; mark conditional agents that were skipped as "not run (reason)". Keep the terminal output focused — full per-finding detail lives in the saved report.
