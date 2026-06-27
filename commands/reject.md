---
description: "Formal 'this does not meet bar' gate — strict review with a machine-readable verdict for CI"
argument-hint: "[--staged | --commit <sha> | --branch <name>] [--scope <path>]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Task"]
---

# Reject

The gate. `/mx:reject` runs the review team in **strict mode** and produces a formal verdict designed to block bad code: a "does not meet bar" report plus a machine-readable marker that CI can act on.

Think of it as `/mx:review --strict` with a CI-shaped contract: where `/mx:review` informs, `/mx:reject` **decides**.

**Options:** $ARGUMENTS

## Step 1: Scope

Resolve the review set exactly as `/mx:review` (default: everything differing from trunk, committed + uncommitted + untracked; same `--staged`/`--commit`/`--branch`/`--scope` flags).

## Step 2: Strict Review

Run the `/mx:review` agent pipeline in **strict mode** (REJECT on any CRITICAL **or** HIGH finding). Collect and normalize findings identically.

## Step 3: Decide & Emit the Marker

Compute the verdict (`PASS` or `REJECT` — strict mode has no soft "warnings" pass; HIGH rejects). Then emit a stable, greppable marker as the **final lines** of output so a wrapper can gate on it deterministically:

```
MX_VERDICT=REJECT
MX_REJECT_COUNT=3
MX_BLOCKING=billing.ts:54,auth.ts:12,api.ts:88
```

(or `MX_VERDICT=PASS` / `MX_REJECT_COUNT=0` on a pass.)

The marker lines must be the last thing printed, in this exact key=value format, so `grep` matches are unambiguous.

## Step 4: Report

Print the formal gate report and save it to `.agents/reports/reject-{YYYY-MM-DD}.md`:

```
REJECTION GATE
==============
Scope:   <…>   Mode: strict

VERDICT: REJECT — 3 blocking findings

This change does not meet the quality bar. Blocking:

  [CRITICAL] billing.ts:54 — signature-verification failure is swallowed
  [HIGH]     auth.ts:12    — `verifyJwt` not exported by jose@5.2.0 (hallucinated)
  [HIGH]     api.ts:88     — unbounded N+1 query in request hot path

Each blocking finding must be resolved (or explicitly waived) before this passes.

MX_VERDICT=REJECT
MX_REJECT_COUNT=3
MX_BLOCKING=billing.ts:54,auth.ts:12,api.ts:88
```

On a pass, state plainly that the change meets bar and emit `MX_VERDICT=PASS`.

## Using it as a CI gate (headless)

Slash commands don't set a process exit code directly, so gate on the marker. Run Claude Code headless and check the verdict:

```bash
# Fails the CI step (exit 1) when the gate rejects
claude -p "/mx:reject --branch origin/main" 2>/dev/null | grep -q '^MX_VERDICT=PASS' \
  || { echo "mx:reject blocked the change"; exit 1; }
```

For richer reporting, parse `MX_REJECT_COUNT` / `MX_BLOCKING` from the same output. Document this snippet for the user when they ask about CI integration; do **not** modify their CI config without being asked.
