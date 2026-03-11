---
description: "Rebase current branch onto trunk (main/master) or a specified branch"
argument-hint: "[branch]"
allowed-tools: ["Bash"]
---

# Rebase

Rebase the current branch onto the trunk branch or a specified base branch.

**Input**: $ARGUMENTS

## Instructions

### Step 1: Determine Base Branch

Parse `$ARGUMENTS`:

- **If a branch name is provided** — use it as the base branch. Verify it exists locally or as a remote tracking branch. If it doesn't exist, report the error and stop.
- **If no argument is provided** — auto-detect the trunk branch:
  1. Check for `main` (local or `origin/main`)
  2. Check for `master` (local or `origin/master`)
  3. If neither exists, report the error and suggest passing a branch name explicitly.

### Step 2: Pre-flight Checks

1. **Check for uncommitted changes** — run `git status --porcelain`. If there are unstaged or staged changes, warn the user:
   ```
   You have uncommitted changes. Stash or commit them before rebasing.
   ```
   Stop here — do not proceed.

2. **Check current branch** — if the current branch IS the base branch, warn and stop:
   ```
   You're already on {base branch}. Switch to a feature branch first.
   ```

3. **Show what will happen** — display the current branch, base branch, and how many commits ahead:
   ```
   REBASE PLAN
   ===========
   Current branch:  feature/my-work
   Base branch:     main
   Commits ahead:   3
   ```

### Step 3: Fetch Latest

Run `git fetch origin` to ensure the base branch ref is up to date.

### Step 4: Rebase

Run the rebase:

```bash
git rebase origin/{base-branch}
```

If the base branch is local-only (no remote tracking), use:

```bash
git rebase {base-branch}
```

### Step 5: Handle Conflicts

If the rebase encounters conflicts:

1. Report which files have conflicts
2. Tell the user:
   ```
   REBASE CONFLICT
   ===============
   Conflicts in:
   - src/auth/login.ts
   - src/utils/helpers.ts

   Resolve the conflicts, then run:
     git rebase --continue

   Or abort the rebase with:
     git rebase --abort
   ```
3. Stop — do not attempt to resolve conflicts automatically.

### Step 6: Report

On success:

```
REBASED
=======
Branch:    {current branch}
Onto:      {base branch}
Commits:   {count} replayed
─────────────────────────────
Branch is up to date with {base branch}.
```
