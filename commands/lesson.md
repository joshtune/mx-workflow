---
description: "Collect candidate lessons from the work just done into the append-only lessons log"
argument-hint: "[ticket id] [free-text lesson]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Collect Lessons

Record what this piece of work taught us, so the next session starts smarter. Every ticket may run in a fresh session, so memory lives in files, never in the conversation.

This command only **collects**. It appends candidate lessons to `.claude/lessons/log.jsonl`. Turning them into rules happens later, in `/mx:lessons-review`, never during a ticket run.

**Input:** $ARGUMENTS

## Locate the Script

Bookkeeping is done by a script with no AI, so it costs no tokens and is consistent. Resolve its path once:

```bash
LESSONS="${CLAUDE_PLUGIN_ROOT:-}/scripts/lessons.mjs"
[ -f "$LESSONS" ] || LESSONS="$(find ~/.claude/plugins -path '*mx*/scripts/lessons.mjs' 2>/dev/null | head -1)"
[ -f "$LESSONS" ] || LESSONS="./scripts/lessons.mjs"   # running inside the plugin repo
```

If none exists, stop and tell the user the plugin's `scripts/lessons.mjs` could not be found.

## Step 1: Gather What Happened

Use what is already in this session, and nothing more. Do not re-read the codebase.

- The ticket ID and type: `bug` or `feature` (from `$ARGUMENTS`, the branch name, or the plan)
- Review, `/mx:verify`, and validation findings that had to be fixed
- Fix-loop rounds that were needed, and why
- Anything that surprised the work: a wrong assumption, a convention that was not written down, a failure that took more than one attempt

If the user passed free text, treat it as one candidate lesson.

## Step 2: Decide What Is Worth Keeping

A lesson is worth recording only if a future session working on **different** code could avoid a mistake or save time by knowing it. Keep a candidate only if it is:

- **General**: a rule about how this codebase works, not a note about this ticket
- **Non-obvious**: something a senior developer new to the codebase would not already know
- **Actionable**: it can be stated as a do or don't

Drop: ticket-specific details, things already in `CLAUDE.md`, anything obvious from reading the code, and anything you are guessing at. **Record at most 3 per run.** Recording nothing is a normal and correct outcome. Say so and stop.

Write each description as one line in the imperative, with no ticket-specific names: "Validate request bodies at the route boundary, not in the service" rather than "Fixed the bug in the orders service".

## Step 3: Pick Consistent Tags

```bash
node "$LESSONS" tags
```

**Reuse an existing tag whenever one fits.** Only create a new tag when nothing existing does, and then pass `--new-tag` with a one-line meaning. Tags are lowercase-hyphenated categories (`error-handling`, `test-isolation`, `api-contracts`), not ticket names.

## Step 4: Append

For each lesson, `--area` is the folder or file the lesson applies to (it decides where the rule will live later):

```bash
node "$LESSONS" add \
  --ticket "<ID>" --type <bug|feature> \
  --tag "<existing-tag>" --area "<path>" \
  --description "<one-line imperative rule>"
# only when no existing tag fits:
#   --new-tag "<one-line meaning of the new tag>"
```

The script rejects unknown tags, bad types, and exact duplicates.

## Step 5: Report

```
LESSONS COLLECTED
=================
Added:   <n>
  [<tag>] <description>  (<area>)

Log: .claude/lessons/log.jsonl
```

Then run the counter and mention it only if something is flagged:

```bash
node "$LESSONS" count
```

If any tag is flagged (3 or more unpromoted entries), add one line: "`<tag>` has `<n>` unpromoted lessons. Run `/mx:lessons-review` when convenient."

## Important

- Never create or edit `CLAUDE.md`, skills, or rule files here. Collection only.
- `.claude/lessons/` is meant to be committed so the whole team shares it
- Do not record secrets, credentials, or customer data in a lesson
- Keep the run cheap: no subagents, no code reading
