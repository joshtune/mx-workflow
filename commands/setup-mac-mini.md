---
description: "One-time Mac mini setup — scan projects, create aliases, configure Slack bot"
argument-hint: ""
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write"]
---

# Mac Mini Setup

One-time interactive setup for the mx-workflow Slack bot on a headless Mac mini.
Scans for existing projects, creates aliases, sets a default project, and writes
the `.mx-mac-mini.json` config the Slack bot reads on every build.

**Run this once when your Mac mini arrives, before using the Slack bot.**

## Step 1: Scan for Projects

Scan these directories for git repos (directories containing `.git/`):
- `~/projects/`
- `~/workspace/`
- `~/dev/`
- `~/code/`
- `~/work/`

For each repo found, display:
```
Found: /Users/josh/projects/dashboard-app  (last commit: 2 days ago)
Found: /Users/josh/projects/api-service    (last commit: today)
Found: /Users/josh/projects/billing-app    (last commit: 1 week ago)
```

Get the last commit date with: `git -C <path> log -1 --format="%ar" 2>/dev/null`

Ask: **"Are there any other directories I should scan? (Enter path or press Enter to skip)"**

Wait for response. Scan any additional paths provided.

## Step 2: Create Aliases

For each found repo, ask:
```
What short name for /Users/josh/projects/dashboard-app?
(suggestion: dashboard) >
```

Suggest an alias based on the directory name (strip common suffixes like `-app`, `-service`, `-api`). Accept the suggestion on Enter, or let the user type a custom name. Type "skip" to exclude a repo.

Also ask: **"Any other projects to add manually? (Enter path or press Enter to finish)"**

Build the alias map.

## Step 3: Set Default Project

```
Which project should be the default for bare Slack messages?
(Used when no project name is specified, e.g., "@mx-bot fix the login bug")

  1. dashboard  -> /Users/josh/projects/dashboard-app
  2. api        -> /Users/josh/projects/api-service
  3. billing    -> /Users/josh/projects/billing-app
  4. None (always require a project name)

>
```

Wait for user selection.

## Step 4: Set New Project Directory

```
Where should brand new projects be created?
(default: ~/builds) >
```

Accept default on Enter, or let the user specify a custom path.

## Step 5: Validate CLAUDE.md

For each registered project, check if a `CLAUDE.md` exists at the project root.

If missing:
```
[warn] dashboard is missing a CLAUDE.md
  Without it, Claude won't know your project's stack and conventions.
  Generate one now? (y/n) >
```

If yes, navigate to that project directory and run the same logic as `/mx:create-rules` to generate a CLAUDE.md.

## Step 6: Detect GitHub Remote

For each project, extract the GitHub repo from git remote:
```bash
git -C <path> remote get-url origin 2>/dev/null
```

Parse `owner/repo` from the URL. Store in config.

## Step 7: Write Config

Write the config to the mx-workflow slack-bot directory. Determine the path:
- If `MX_PLUGIN_DIR` env var is set, use `$MX_PLUGIN_DIR/slack-bot/.mx-mac-mini.json`
- Otherwise, look for mx-workflow in common locations (`~/mx-workflow`, `~/workspace/*/mx-workflow`)
- If not found, ask the user for the path

```json
{
  "version": "1.0",
  "default_project": "dashboard",
  "new_project_dir": "/Users/josh/builds",
  "projects": {
    "dashboard": {
      "path": "/Users/josh/projects/dashboard-app",
      "repo": "joshtune/dashboard-app",
      "has_claude_md": true
    },
    "api": {
      "path": "/Users/josh/projects/api-service",
      "repo": "joshtune/api-service",
      "has_claude_md": true
    }
  }
}
```

## Step 8: Dry-Run Validation

Test that the config works by simulating Slack messages:

```
Testing: "dashboard: add dark mode"         -> routes to dashboard-app
Testing: "api fix the webhook bug"          -> routes to api-service
Testing: "add a login page"                 -> routes to dashboard-app (default)
Testing: "--repo billing add export button" -> routes to billing-app
Testing: "Build a new SaaS billing system"  -> new project in ~/builds
```

Report each as PASS or FAIL.

## Step 9: Summary

```
Mac mini setup complete!

Registered projects:
  dashboard -> /Users/josh/projects/dashboard-app
  api       -> /Users/josh/projects/api-service
  billing   -> /Users/josh/projects/billing-app

Default project: dashboard
New projects go to: ~/builds
Config: ~/mx-workflow/slack-bot/.mx-mac-mini.json

Slack patterns you can use:

  Project prefix:   @mx-bot dashboard: add dark mode
  First word:       @mx-bot api fix the webhook bug
  Default (bare):   @mx-bot fix the login bug
  Explicit flag:    @mx-bot --repo billing add export
  New project:      @mx-bot Build a new SaaS billing system

To update later, run /mx:setup-mac-mini again.
```

## Re-running Setup

If `.mx-mac-mini.json` already exists, load it and show current projects first:

```
Current config found. Registered projects:
  dashboard -> /Users/josh/projects/dashboard-app
  api       -> /Users/josh/projects/api-service

Options:
  1. Add more projects
  2. Remove a project
  3. Change default project
  4. Re-scan and start fresh
  5. Exit (keep current config)

>
```
