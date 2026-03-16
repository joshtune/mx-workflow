---
description: "Check for mx-workflow updates and show what's new"
allowed-tools: ["Bash", "Read", "Grep"]
---

# Update Check

Check whether a newer version of mx-workflow is available, show what changed, and explain how to update.

## Instructions

### Step 1: Get Current Version

Read `plugin.json` in the mx-workflow plugin directory and extract the `"version"` field. This is the currently installed version.

To find the plugin directory, check these locations in order:
1. If the current working directory contains `plugin.json` with `"name": "mx-workflow"` — use it directly.
2. Otherwise, check `~/.claude/plugins/mx-workflow/plugin.json`.
3. Otherwise, check `~/.claude/settings.json` for the plugin path.

If none found, print:

```
Could not locate mx-workflow plugin directory.
```

Then **stop**.

### Step 2: Get Latest Release

Run:

```bash
gh release view --repo joshtune/mx-workflow --json tagName,body,publishedAt
```

Extract the tag name (e.g., `v1.4.0`) and strip the `v` prefix to get the latest version.

If the command fails (repo not accessible, gh not installed), print:

```
Could not check for updates — ensure `gh` is installed and authenticated.
```

Then **stop**.

### Step 3: Compare Versions

Compare the current installed version with the latest release version.

**If already up to date** (current >= latest), print:

```
MX-WORKFLOW UP TO DATE
======================
Installed:  v{current}
Latest:     v{latest}

You're on the latest version. Nothing to do.
```

Then **stop**.

**If an update is available** (current < latest), continue to Step 4.

### Step 4: Show What's New

Print the update report with the release notes body from Step 2:

```
MX-WORKFLOW UPDATE AVAILABLE
=============================
Installed:  v{current}
Latest:     v{latest}

What's new in v{latest}:
────────────────────────
{release notes body from gh release view}

How to update:
────────────────────────
  cd {plugin directory path}
  git pull origin main
```

If there are multiple versions between current and latest, also run:

```bash
gh release list --repo joshtune/mx-workflow --json tagName,publishedAt --limit 10
```

Filter to only show releases newer than the current version, and note how many releases behind the user is:

```
You are {N} release(s) behind. To see all changes:
  gh release list --repo joshtune/mx-workflow
```
