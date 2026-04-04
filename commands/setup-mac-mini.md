---
description: "One-time Mac mini setup — system prereqs, Slack integration, project aliases, daemon"
argument-hint: "[--skip-system | --skip-slack | --projects-only]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write"]
---

# Mac Mini Setup

Complete setup for turning a Mac mini into a personal developer agent assistant.
Run this once on day one — it handles everything from system prerequisites to
Slack integration to project registration.

**Run:** `/mx:setup-mac-mini`

## Flags

| Flag | Effect |
|------|--------|
| (none) | Full setup — all phases |
| `--skip-system` | Skip system prerequisite checks |
| `--skip-slack` | Skip Slack integration setup |
| `--projects-only` | Only run project scanning and alias registration |

## Phase 1: System Prerequisites

Check and install everything needed. For each tool, check if installed, report status, and offer to install if missing.

```
SYSTEM CHECK
============
```

### 1.1 Homebrew

```bash
which brew
```

If missing:
```
Homebrew is not installed. It's needed to install other tools.
Install now? (y/n) >
```

If yes: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

### 1.2 Node.js 20+

```bash
node --version
```

If missing or below v20:
```
Node.js 20+ is required for the Slack bot.
Install via Homebrew? (y/n) >
```

If yes: `brew install node`

### 1.3 Claude Code CLI

```bash
claude --version
```

If missing:
```
Claude Code CLI is required. It's the engine that runs builds.
Install now? (y/n) >
```

If yes: `npm install -g @anthropic-ai/claude-code`

After install, check if authenticated:
```bash
claude --print "echo hello" 2>&1
```

If not authenticated:
```
Claude Code is installed but not authenticated.
Please run: claude auth login
Then re-run /mx:setup-mac-mini
```

### 1.4 Git + SSH

```bash
git --version
ssh -T git@github.com 2>&1
```

Check if SSH is configured for GitHub. If not:
```
GitHub SSH is not configured. You'll need it for pushing code.
Want me to generate an SSH key and show you how to add it? (y/n) >
```

If yes:
```bash
ssh-keygen -t ed25519 -C "mac-mini-agent" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Show the public key and instruct: "Add this to https://github.com/settings/keys"

### 1.5 tmux

```bash
which tmux
```

If missing:
```
tmux is needed for agent team builds and persistent sessions.
Install via Homebrew? (y/n) >
```

If yes: `brew install tmux`

### 1.6 Tailscale (remote access)

```bash
which tailscale
```

If missing:
```
Tailscale lets you SSH into the Mac mini from anywhere without port forwarding.
Install via Homebrew? (y/n) >
```

If yes: `brew install tailscale`

After install:
```
Run 'tailscale up' to connect to your Tailnet.
Your MacBook also needs Tailscale installed to connect remotely.
```

### 1.7 mx-workflow Plugin

Check if mx-workflow is installed as a Claude Code plugin:
```bash
claude plugin list 2>&1
```

If not found, check if the repo is cloned locally. If cloned but not registered:
```
mx-workflow repo found at <path> but not registered as a plugin.
Register it now? (y/n) >
```

### 1.8 System Summary

```
SYSTEM CHECK COMPLETE
=====================
Homebrew:       INSTALLED (4.2.0)
Node.js:        INSTALLED (v22.1.0)
Claude Code:    INSTALLED (v2.1.35) — authenticated
Git:            INSTALLED (2.44.0)
GitHub SSH:     CONFIGURED
tmux:           INSTALLED (3.4)
Tailscale:      INSTALLED — connected
mx-workflow:    INSTALLED (v1.16.0)
────────────────────────────────
Status:         READY
```

If anything is missing or failed, list what needs attention before proceeding.

Wait for user to confirm before moving to Phase 2.

---

## Phase 2: Slack Integration

Guide the user through setting up the Slack bot. This phase is interactive — some steps require the user to do things in the Slack web UI.

### 2.1 Check for Existing Config

```bash
ls slack-bot/.env 2>/dev/null
```

If `.env` already exists:
```
Existing Slack bot config found.
  1. Test current connection
  2. Reconfigure from scratch
  3. Skip Slack setup
>
```

If "Test current connection", jump to Step 2.6.

### 2.2 Create Slack App (guided)

Display these instructions:

```
SLACK APP SETUP
===============

Open https://api.slack.com/apps in your browser and follow these steps:

1. Create New App → From scratch
   - Name: mx-bot
   - Workspace: (your workspace)

2. Enable Socket Mode:
   - Settings → Socket Mode → Enable
   - Generate App-Level Token named "mx-socket" with scope: connections:write
   - Copy the token (starts with xapp-)

3. Add Bot Scopes (OAuth & Permissions → Bot Token Scopes):
   channels:history, channels:read, chat:write, commands,
   groups:history, im:history, im:write, mpim:history

4. Enable Event Subscriptions → Subscribe to bot events:
   message.channels, message.groups, message.im

5. Add Slash Command:
   - Command: /build
   - Description: Kick off an mx-workflow build
   - Usage hint: <what to build>

6. Install to Workspace (OAuth & Permissions → Install)
   - Copy the Bot User OAuth Token (starts with xoxb-)

7. Get your Signing Secret (Basic Information → App Credentials)

When you have all three tokens, press Enter to continue.
```

Wait for user to confirm they have the tokens.

### 2.3 Collect Tokens

Ask for each token one at a time:

```
Paste your Bot Token (xoxb-...): >
```

Validate it starts with `xoxb-`. Store it.

```
Paste your App Token (xapp-...): >
```

Validate it starts with `xapp-`. Store it.

```
Paste your Signing Secret: >
```

Store it.

### 2.4 Auto-Detect Bot User ID

Use the bot token to fetch the user ID automatically:

```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test
```

Parse `user_id` from the JSON response. If the call fails, ask the user to provide it manually.

### 2.5 Write .env

Write `slack-bot/.env` with all collected values:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_USER_ID=U...
SLACK_BUILDS_CHANNEL=builds
MX_PLUGIN_DIR=<detected path to mx-workflow>
MX_WORK_DIR=<home>/builds
MX_LOG_DIR=<home>/builds/.logs
```

Also set the paths based on the current environment:
- `MX_PLUGIN_DIR` = the directory where mx-workflow is cloned
- `MX_WORK_DIR` = `~/builds` (or ask)
- `MX_LOG_DIR` = `~/builds/.logs`

Create the work and log directories:
```bash
mkdir -p ~/builds/.logs
```

### 2.6 Test Slack Connection

Install dependencies and test:

```bash
cd <mx-workflow>/slack-bot && npm install
```

Then start the bot briefly to verify connection:
```bash
timeout 10 node index.js 2>&1
```

Check output for "mx-workflow Slack bot is running". Report:

```
Slack bot connection: PASS — connected to workspace
```

Or if it fails, show the error and suggest fixes.

### 2.7 Create #builds Channel

```
Do you have a #builds channel in Slack? (y/n) >
```

If no:
```
Create a channel called "builds" in Slack and invite your bot (@mx-bot).
Press Enter when done.
```

---

## Phase 3: Project Registration

This is the existing project scanning and alias setup. Same as before but renumbered.

### 3.1 Scan for Projects

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

### 3.2 Create Aliases

For each found repo, ask:
```
What short name for /Users/josh/projects/dashboard-app?
(suggestion: dashboard) >
```

Suggest an alias based on the directory name (strip common suffixes like `-app`, `-service`, `-api`). Accept the suggestion on Enter, or let the user type a custom name. Type "skip" to exclude a repo.

Also ask: **"Any other projects to add manually? (Enter path or press Enter to finish)"**

### 3.3 Set Default Project

```
Which project should be the default for bare Slack messages?
(Used when no project name is specified, e.g., "@mx-bot fix the login bug")

  1. dashboard  -> /Users/josh/projects/dashboard-app
  2. api        -> /Users/josh/projects/api-service
  3. billing    -> /Users/josh/projects/billing-app
  4. None (always require a project name)

>
```

### 3.4 Set New Project Directory

```
Where should brand new projects be created?
(default: ~/builds) >
```

### 3.5 Validate CLAUDE.md

For each registered project, check if a `CLAUDE.md` exists at the project root.

If missing:
```
[warn] dashboard is missing a CLAUDE.md
  Without it, Claude won't know your project's stack and conventions.
  Generate one now? (y/n) >
```

If yes, navigate to that project directory and run the same logic as `/mx:create-rules`.

### 3.6 Detect GitHub Remote

For each project, extract the GitHub repo:
```bash
git -C <path> remote get-url origin 2>/dev/null
```

Parse `owner/repo` from the URL.

### 3.7 Write Config

Write `.mx-mac-mini.json` to the slack-bot directory:

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

---

## Phase 4: Daemon Setup

Set up the Slack bot to run automatically on boot and restart on crash.

### 4.1 Configure launchd

Update the plist with the actual username and paths:

```bash
sed -i '' "s/YOUR_USERNAME/$USER/g" <mx-workflow>/slack-bot/com.joshtune.mx-workflow-slack-bot.plist
```

### 4.2 Create Wrapper Script

Ensure `slack-bot/start.sh` exists and is executable:

```bash
cat > <mx-workflow>/slack-bot/start.sh << 'SCRIPT'
#!/bin/bash
set -a
source "$(dirname "$0")/.env"
set +a
exec node "$(dirname "$0")/index.js"
SCRIPT
chmod +x <mx-workflow>/slack-bot/start.sh
```

### 4.3 Install Daemon

```bash
cp <mx-workflow>/slack-bot/com.joshtune.mx-workflow-slack-bot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.joshtune.mx-workflow-slack-bot.plist
launchctl start com.joshtune.mx-workflow-slack-bot
```

### 4.4 Verify Daemon

```bash
launchctl list | grep mx-workflow
```

If running, report:
```
Daemon: RUNNING (PID <pid>)
```

If not running, check the error log:
```bash
cat ~/builds/.logs/slack-bot-error.log 2>/dev/null | tail -5
```

---

## Phase 5: End-to-End Verification

Run a complete test to verify everything works together.

### 5.1 Dry-Run Project Resolution

Test that the config routes correctly:

```
Testing: "dashboard: add dark mode"         -> routes to dashboard-app
Testing: "api fix the webhook bug"          -> routes to api-service
Testing: "add a login page"                 -> routes to dashboard-app (default)
Testing: "--repo billing add export button" -> routes to billing-app
Testing: "Build a new SaaS billing system"  -> new project in ~/builds
```

### 5.2 Slack Bot Health Check

Verify the daemon is running and can reach Slack:
```bash
launchctl list | grep mx-workflow
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test | grep ok
```

### 5.3 Claude Code Readiness

Verify Claude Code can run a command headlessly:
```bash
claude --print --dangerously-skip-permissions "echo 'Mac mini agent ready'" 2>&1
```

---

## Phase 6: Summary

```
MAC MINI SETUP COMPLETE
========================

System:
  Homebrew:     INSTALLED
  Node.js:      INSTALLED (v22.1.0)
  Claude Code:  INSTALLED (v2.1.35) — authenticated
  Git + SSH:    CONFIGURED
  tmux:         INSTALLED
  Tailscale:    INSTALLED
  mx-workflow:  INSTALLED (v1.16.0)

Slack:
  Bot:          CONNECTED (mx-bot)
  Channel:      #builds
  Daemon:       RUNNING (auto-restarts on crash, starts on boot)

Projects:
  dashboard -> /Users/josh/projects/dashboard-app
  api       -> /Users/josh/projects/api-service
  billing   -> /Users/josh/projects/billing-app
  Default:     dashboard
  New builds:  ~/builds

Verification:
  Project routing:  PASS (5/5 patterns)
  Slack connection: PASS
  Claude Code:      PASS

How to use from Slack:

  @mx-bot dashboard: add dark mode toggle
  @mx-bot api fix the webhook bug
  @mx-bot fix the login bug (uses default: dashboard)
  @mx-bot --repo billing add export button
  @mx-bot Build a new SaaS billing system
  /build <anything>

Remote access from your MacBook:

  ssh <user>@<mac-mini-tailscale> (access the mini)
  ssh <mac-mini> "tail -f ~/builds/.logs/slack-bot.log" (watch bot)
  ssh <mac-mini> "tail -f ~/builds/.logs/<session>.log" (watch build)

To update later, run /mx:setup-mac-mini again.
```

---

## Re-running Setup

If setup has been run before, detect existing state and offer targeted options:

```
Mac mini is already configured. What would you like to do?

  1. Full setup (re-run everything)
  2. Add/remove projects
  3. Reconfigure Slack integration
  4. Reinstall daemon
  5. Run verification checks only
  6. Exit

>
```
