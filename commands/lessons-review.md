---
description: "Curate the lessons log: merge tags, promote clusters to general rules, place them where they apply, prune"
argument-hint: "[--threshold <n>] [--dry-run]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# Lessons Review

Turn the raw lessons log into a small set of general rules, in the place each one applies. Run it weekly or on demand, **never during a ticket run**.

The counting and bookkeeping are done by a script with no AI. Your job is the judgment the script cannot do: which tags mean the same thing, what the general rule is, where it belongs, and what to delete.

**Options:** $ARGUMENTS

| Flag | Effect |
|------|--------|
| `--threshold <n>` | Entries per tag before it is flagged (default `3`) |
| `--dry-run` | Show the proposed changes and write nothing |

## Locate the Script

```bash
LESSONS="${CLAUDE_PLUGIN_ROOT:-}/scripts/lessons.mjs"
[ -f "$LESSONS" ] || LESSONS="$(find ~/.claude/plugins -path '*mx*/scripts/lessons.mjs' 2>/dev/null | head -1)"
[ -f "$LESSONS" ] || LESSONS="./scripts/lessons.mjs"
```

If the script cannot be found, stop and say so. If `.claude/lessons/log.jsonl` does not exist, tell the user there is nothing to review yet and point to `/mx:lesson`.

## Step 1: Count

```bash
node "$LESSONS" tags --json
node "$LESSONS" count --json --threshold <n>
```

This returns the tag vocabulary and every cluster of unpromoted entries, with the flagged ones marked. Work from this output. Do not read the raw log.

If nothing is flagged and no tags look mergeable, report that and go straight to Step 5 (pruning).

## Step 2: Merge Similar Tags

Look at the tag list for tags that mean the same thing (`error-handling` and `exception-handling`, `tests-flaky` and `test-isolation`). Propose each merge with the reason. After confirmation:

```bash
node "$LESSONS" merge-tags --from <old> --to <kept>
```

Re-run the count afterward. Merging often pushes a cluster over the threshold.

## Step 3: Turn Flagged Clusters Into General Rules

For each flagged tag:

1. Read its entries (the JSON already has them).
2. Write **one general rule**. It must still be true on a ticket that has nothing to do with the ones that produced it. Never write a ticket-specific note. If the entries do not add up to a rule, say so and leave the cluster unpromoted: more evidence is better than a bad rule.
3. Check the rule does not already exist (`Grep` `CLAUDE.md` files and `.claude/skills/`). If it does, promote the entries to the existing rule instead of writing a duplicate.
4. State the rule as a do or don't, one or two lines, with the reason when it is not obvious.

## Step 4: Place Each Rule Where It Applies

Use the entries' `area` values to choose, narrowest first:

| Where | When |
|---|---|
| **Nested `CLAUDE.md`** in the relevant folder | The rule applies to one area (all entries share a folder). The default. |
| **A skill** under `.claude/skills/<name>/SKILL.md` | A specialized playbook: a bug-fix or feature checklist, a multi-step procedure |
| **Root `CLAUDE.md`** | Only a truly global rule that holds across the whole codebase |

Show the full proposal before writing anything: rule text, destination file, and the entry IDs it covers. In `--dry-run`, stop here.

After the user confirms, write the rules, then mark the source entries:

```bash
node "$LESSONS" promote --tag <tag> --to <destination path> [--ids id1,id2]
```

## Step 5: Prune

Pruning keeps the rules useful. Review the rule files you touched, and the root `CLAUDE.md`:

- **Duplicates**: the same rule worded twice
- **Outdated**: rules that reference code, tools, or patterns that no longer exist (verify with `Grep` before removing)
- **Not needed**: anything a senior developer new to the codebase would not need to be told
- **History**: ticket narratives and "we used to" notes. A rules file is not a changelog

List each proposed removal with its reason. Remove only after confirmation.

Then check the root file size:

```bash
node "$LESSONS" check-claude-md
```

If it is over about 100 lines, flag it and propose moving rules down into nested `CLAUDE.md` files or a skill.

## Step 6: Report

```
LESSONS REVIEW
==============
Tags merged:       <n>
Clusters reviewed: <n> (<promoted> promoted, <held> held for more evidence)

Rules written
  <destination> — <rule>

Pruned:            <n> (<duplicates>, <outdated>, <not needed>)
Root CLAUDE.md:    <n> lines (limit ~100)
Unpromoted left:   <n>
```

## Important

- The log is append-only. Never edit `.claude/lessons/log.jsonl` by hand; merges and promotions are recorded as events by the script
- Never write a rule that names a ticket, a person, or a one-off incident
- Do not write to the root `CLAUDE.md` when a nested file or skill fits
- Show changes and wait for confirmation before writing or deleting. Rules files are shared, and a bad rule misleads every future session
- Holding a cluster back is a valid result. Do not promote to hit a number
