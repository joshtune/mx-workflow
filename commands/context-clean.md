---
description: "Remove local context files — clean up a directory or all context files in the project"
argument-hint: "[path | --all]"
allowed-tools: ["Bash", "Glob", "Read"]
---

# Context Clean

Remove `.claude/context.local.md` files created by `/mx:context-prime`.

**Input**: $ARGUMENTS

## Instructions

### Step 1: Determine Scope

Parse `$ARGUMENTS`:

- **`--all`** — remove every `.claude/context.local.md` in the project
- **`<path>`** — remove the context file in the specified directory only
- **No arguments** — remove the context file in the current working directory

### Step 2: Find Context Files

Use Glob to find matching `.claude/context.local.md` files:

- For `--all`: search `**/.claude/context.local.md` from project root
- For a specific path: check `<path>/.claude/context.local.md`

If no context files are found, report that and stop.

### Step 3: Preview

List the files that will be removed:

```
CONTEXT FILES TO REMOVE
========================
- src/auth/.claude/context.local.md (23 lines)
- src/dashboard/.claude/context.local.md (18 lines)

Total: 2 files
```

Ask the user to confirm before deleting.

### Step 4: Remove

After confirmation, delete the context files using `rm`.

Also clean up empty `.claude/` directories left behind — if the `.claude/` directory in that location is now empty, remove it with `rmdir`.

### Step 5: Report

```
CONTEXT CLEANED
===============
Removed: {count} context file(s)
Cleaned: {count} empty .claude/ directories
```
