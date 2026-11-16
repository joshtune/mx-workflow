---
description: "Prove the work: Playwright video and screenshots, coverage report, and an independent acceptance review, with a capped fix loop"
argument-hint: "[--criteria <file|text>] [--ticket <id>] [--url <url>] [--max-rounds <n>] [--no-coverage] [--no-browser]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit", "Task"]
---

# Verify

Hold the work accountable. After implementation, collect real evidence — recorded browser runs, screenshots, a coverage report — then have a reviewer with fresh context check the result against the ticket's acceptance criteria. Failures go back to be fixed, capped at 2 rounds.

The orchestrator stays lean: it coordinates and decides. The agents read code, drive the browser, and measure coverage, and send back short structured summaries.

**Options:** $ARGUMENTS

## Flags

| Flag | Effect |
|------|--------|
| `--criteria <file\|text>` | Acceptance criteria source (a file, or inline text) |
| `--ticket <id>` | Fetch criteria from the ticket |
| `--url <url>` | App URL if already running (skips starting the dev server) |
| `--max-rounds <n>` | Fix-loop rounds before stopping and flagging you (default `2`) |
| `--no-coverage` | Skip the coverage step |
| `--no-browser` | Skip the Playwright step (backend-only changes) |

## Step 1: Resolve Acceptance Criteria

Look in this order and stop at the first that yields criteria:

1. `--criteria` / `--ticket`
2. Criteria in the current plan or conversation (`/mx:plan`, `/mx:prd` output)
3. `.agents/feasibility/{slug}.md` or a PRD under `.agents/prds/`
4. None found → derive candidate criteria from the diff and branch name, show them, and **ask the user to confirm** before continuing

Number them `AC1…ACn`. Each must be observable ("the list shows a delete button for owners"), not an intention ("delete works"). Rewrite vague ones and show the rewrite.

## Step 2: Resolve Scope and Evidence Directory

1. Detect trunk (`main`, then `master`) and compute the diff: `git merge-base HEAD <trunk>` → `git diff --name-only $BASE` plus `git ls-files --others --exclude-standard`. Same scoping as `/mx:review`. If the set is empty, tell the user there is nothing to verify and stop.
2. Choose a slug (ticket ID, else branch name) and create `.agents/evidence/{slug}/` with `screenshots/`, `videos/`, `coverage/`.

If the project has no browser-accessible frontend, set `--no-browser` automatically and say so. Browser-less changes still get coverage and review.

## Step 3: Gather Evidence (parallel)

Launch both agents in one message via the Task tool — they are independent:

- **`mx-playwright-validator`** — criteria, evidence directory, app URL or start instructions. Skipped with `--no-browser`.
- **`mx-coverage-verifier`** — changed files, evidence directory, trunk. Skipped with `--no-coverage`.

Each returns a short table plus file paths. Do not read the videos or screenshots yourself; the reviewer opens what it needs.

If the validator reports `BLOCKED: Playwright not available`, show the install suggestion and continue with the remaining evidence — the reviewer will mark browser-dependent criteria `PARTIAL`.

## Step 4: Independent Review

Launch **`mx-acceptance-reviewer`** with a fresh context. Give it **only**:

- the acceptance criteria
- the diff (and untracked file contents)
- the evidence index from Step 3 and the evidence directory path

Do **not** give it the plan, the conversation, or the implementer's summary.

## Step 5: Verdict

| Condition | Verdict |
|---|---|
| Reviewer `ACCEPTED`, validator no FAIL, coverage not REGRESSED | **VERIFIED** |
| Reviewer `ACCEPTED WITH GAPS`, or coverage MAINTAINED with uncovered new lines | **VERIFIED WITH GAPS** |
| Any criterion NOT MET / NOT IMPLEMENTED, any validator FAIL, or coverage REGRESSED | **NOT VERIFIED** |

If **VERIFIED** or **VERIFIED WITH GAPS**, go to Step 7.

## Step 6: Close the Loop (capped)

For round `1…max-rounds` (default 2) while the verdict is **NOT VERIFIED**:

1. Collect the reviewer's fix instructions, validator failures (with screenshot paths), and coverage gaps.
2. Hand each to a fix subagent (Task, general-purpose) as a **self-contained** instruction. Tell it: fix the product code; do not weaken assertions, skip tests, add suppressions, or add coverage exclusions.
3. Run `/mx:validate`-style quality checks (lint, types, tests). If they fail, the fix is not done — send it back within the same round.
4. Re-run **only** the agents whose area changed (failed criteria → validator; coverage gaps → coverage verifier), then the reviewer again with fresh context.

After the last round, if the verdict is still **NOT VERIFIED**, **stop**. Do not keep trying and do not downgrade the verdict. Report what remains, with evidence paths, and ask the user how to proceed.

## Step 7: Report

Write the full report to `.agents/evidence/{slug}/report.md`: criteria table, validator table with video/screenshot paths, coverage table, reviewer verdicts, rounds used, and what was fixed in each round.

Display:

```
MX VERIFY
=========
Slug:        <slug>
Criteria:    <n> (<met> met, <partial> partial, <failed> failed)
Rounds used: <k> of <max>

VERDICT:     VERIFIED / VERIFIED WITH GAPS / NOT VERIFIED

Browser:     <n>/<n> PASS · <n> videos · <n> screenshots
Coverage:    <IMPROVED | MAINTAINED | REGRESSED | no tooling> (<before>% → <after>% on changed files)
Review:      <ACCEPTED | ACCEPTED WITH GAPS | REJECTED>

Remaining (if any)
  - [AC2] <what is still wrong> — <evidence path>

Evidence: .agents/evidence/{slug}/
MX_VERIFY=<verified|verified-with-gaps|not-verified>
```

The final `MX_VERIFY=` line is a machine-readable marker, the same convention as `/mx:reject`.

## Step 8: Collect Lessons

Run `/mx:lesson` as the last step, passing the slug as the ticket. The fix-loop rounds, validator failures, and reviewer gaps from this run are the best source of lessons: each round that was needed means something was not known up front. Collection is cheap and may legitimately record nothing.

## Important

- Evidence lives under `.agents/evidence/`, which is git-ignored. Videos and screenshots are local; attach them to the PR or ticket manually or via your tracker's upload
- The reviewer must never see the implementer's reasoning — that is what makes it independent
- Never edit a test to make it pass, and never lower a criterion to match the result
- A verdict that stops at NOT VERIFIED after the cap is a successful run of this command — the point is to be told
