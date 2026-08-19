---
description: "Quality only goes up — block any change that regresses test coverage, type safety, lint cleanliness, or suppression count vs trunk"
argument-hint: "[--branch <name>] [--dimensions coverage,types,lint,suppressions]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write"]
---

# Ratchet

A one-way gate: quality is allowed to climb, never to slip. `/mx:ratchet` measures a set of objective dimensions on **trunk** and on **your branch**, then fails if any dimension regressed. It's how you stop the slow erosion that AI-assisted churn causes — a stray `@ts-ignore` here, a dropped test there.

The bar is computed **live from trunk** every run (no stored baseline file to drift), so it always reflects the real current state of `main`.

**Options:** $ARGUMENTS

## Dimensions

Default set (override with `--dimensions`):

| Dimension | Metric | Direction |
|-----------|--------|-----------|
| `coverage` | Test coverage % (if a coverage tool is configured) | must not **decrease** |
| `types` | Count of type-check errors | must not **increase** (target: 0) |
| `lint` | Count of lint errors + warnings | must not **increase** |
| `suppressions` | Count of suppression comments (`@ts-ignore`, `eslint-disable`, `# noqa`, `#[allow(`, `//nolint`, …) | must not **increase** |
| `structure` | Count of layout violations — sibling-subtree imports, hand-written barrels (see `references/project-structure.md`) | must not **increase** |

Only measure dimensions whose tooling actually exists (detect like `/mx:validate` / `/mx:qa` do). Skip — don't fail — a dimension with no tooling, and say it was skipped.

`structure` is measured by running the project's configured gate (`.dependency-cruiser.js`, or `import/no-restricted-paths` zones) on both trunk and branch. **If no gate is configured, skip the dimension** — do not substitute a manual scan, since a hand-counted number isn't comparable across two checkouts and would produce phantom regressions. Nesting depth is deliberately excluded: it's a QA advisory, not a ratchet dimension.

## Step 1: Resolve Trunk & Base

Detect trunk (`--branch` override, else `main`/`master`). If the working tree has uncommitted changes, note that ratchet measures the **branch as it stands** (working tree) against trunk's committed state.

## Step 2: Measure Trunk — in an Isolated Worktree

**Never mutate the user's working tree to measure trunk.** Use a throwaway git worktree:

```bash
WT=$(mktemp -d)
git worktree add --detach "$WT" <trunk>
# install deps if needed, then run the metric commands inside $WT
```

Run each enabled dimension's command in `$WT` and record the trunk numbers. When done, always clean up: `git worktree remove --force "$WT"`. If worktree creation fails (e.g. dirty index, shallow clone), fall back to measuring the merge-base commit and clearly note the reduced fidelity.

## Step 3: Measure the Branch

Run the same metric commands in the current working tree (so uncommitted changes count). Use identical commands and flags as Step 2 so the numbers are comparable.

## Step 4: Compare & Verdict

For each dimension, compare branch vs trunk in the required direction. Any regression → **RATCHET BROKEN** (a reject). Equal or better on every measured dimension → **PASS**. Improvements are celebrated but never required.

## Step 5: Report

Save to `.agents/reports/ratchet-{YYYY-MM-DD}.md` and print:

```
RATCHET
=======
Trunk: main @ <sha>   Branch: <name> (working tree)

DIMENSION        TRUNK     BRANCH    Δ        STATUS
─────────────────────────────────────────────────────
coverage         82.4%     84.1%     +1.7    ✓ up
type errors      0         0         0       ✓ held
lint             3         3         0       ✓ held
suppressions     11        13        +2      ✗ REGRESSED
─────────────────────────────────────────────────────
VERDICT: RATCHET BROKEN

Regressions:
  suppressions +2 — new in this branch:
    src/api.ts:40  // @ts-ignore  (no justification)
    src/api.ts:77  // eslint-disable-next-line

To pass: remove the 2 new suppressions (or justify + raise the bar deliberately
in a separate, reviewed change).
```

For the `suppressions` and `structure` (and where feasible, `lint`/`types`) regressions, **name the specific new offenders** with file:line by diffing the offending set, not just the counts — a bare "+2" isn't actionable.

For `structure` offenders, name the fix rather than just the violation: a sibling-subtree import is resolved by hoisting the shared code to the lowest common ancestor of its consumers, not by adding a suppression.
