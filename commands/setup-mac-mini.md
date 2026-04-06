---
description: "One-time Mac mini setup — system prereqs, Slack integration, daemon"
argument-hint: "[--skip-system | --skip-slack]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write"]
---

# Mac Mini Setup

Complete setup for turning a Mac mini into a personal developer agent assistant.
Run this once on day one — it handles everything from system prerequisites to
Slack integration to project registration.

**Run:** `/mx:setup-mac-mini`

## Core Behavior

**This command is proactive, not passive.** Its goal is to ensure the Mac mini is fully ready to receive Slack build requests by the time it finishes running. It does not just report problems — it fixes them.

**MANDATORY EXECUTION ORDER — YOU MUST FOLLOW ALL 5 PHASES:**

```
Phase 0: Pre-Flight Check     ← run FIRST, always
Phase 1: System Prerequisites  ← install all missing tools
Phase 2: Slack Integration     ← configure bot, tokens, test connection
Phase 3: Daemon Setup          ← install launchd, start bot daemon
Phase 4: End-to-End Verification + Summary
```

**DO NOT skip Phase 2 (Slack Integration).** The entire purpose of this setup is to get the Slack bot working. Without Slack configured, the Mac mini is not ready. Phase 2 is not optional — it is the core of this command.

**DO NOT skip Phase 3 (Daemon Setup).** Without the daemon, the bot stops when the terminal closes. The bot must run permanently.

**No project registration phase.** Projects are registered automatically after each build completes. The bot derives a meaningful name from the PRD or branch and logs it in `.mx-mac-mini.json`.

**Rules:**
- **Execute ALL phases in order.** The only way to skip a phase is if the pre-flight check confirms it is already fully working. Even then, re-verify at the end.
- **Required dependencies are installed automatically.** Do not ask "want to install Node.js?" — it is required, install it. Only ask when there is a genuine choice (e.g., which project is the default).
- **If something fails, stop and fix it before moving on.** Do not continue to Phase 2 if Phase 1 has unresolved failures. Each phase must be green before proceeding.
- **If a step requires user action** (e.g., creating a Slack app in the browser, adding an SSH key to GitHub), give clear instructions, wait for them to complete it, then **verify it worked** before moving on. Do not take their word for it — check via API or CLI.
- **At the end of every phase, re-verify** that everything in that phase is working. If something slipped through, catch it now.
- **At the very end, run a full end-to-end check.** If anything is still not right, tell the user exactly what's wrong and what to do. Do not say "setup complete" if setup is not actually complete.
- **Never leave the user in a broken state.** If the command is interrupted or a step fails permanently, tell the user what was completed, what was not, and what to run next time to pick up where they left off.

## Flags

| Flag | Effect |
|------|--------|
| (none) | Full setup — all phases |
| `--skip-system` | Skip system prerequisite checks |
| `--skip-slack` | Skip Slack integration setup |

## Phase 0: Pre-Flight Readiness Check

**Run this FIRST before any interactive steps.** Quickly check the state of everything and give the user a full picture of what's ready, what's missing, and what the setup will need to do.

```bash
# Run all of these in parallel — they're independent checks
which brew                                          # Homebrew
node --version 2>/dev/null                          # Node.js
claude --version 2>/dev/null                        # Claude Code CLI
git --version                                       # Git
ssh -T git@github.com 2>&1                          # GitHub SSH
which tmux                                          # tmux
which tailscale                                     # Tailscale
ls <mx-workflow>/slack-bot/.env 2>/dev/null          # Slack .env exists
ls <mx-workflow>/slack-bot/node_modules 2>/dev/null  # Slack bot deps installed
launchctl list 2>/dev/null | grep mx-workflow        # Daemon running
```

Display a readiness report:

```
PRE-FLIGHT CHECK
================
System:
  Homebrew:      INSTALLED / MISSING
  Node.js:       INSTALLED (v22.1.0) / MISSING
  Claude Code:   INSTALLED (v2.1.35) / MISSING — auth: OK / NOT AUTHENTICATED
  Git:           INSTALLED / MISSING
  GitHub SSH:    CONFIGURED / NOT CONFIGURED
  tmux:          INSTALLED / MISSING
  Tailscale:     INSTALLED / MISSING

Slack Integration:
  .env config:   CONFIGURED / NOT CONFIGURED
  Bot deps:      INSTALLED / NOT INSTALLED
  Bot daemon:    RUNNING / NOT RUNNING / NOT INSTALLED

Projects:
  Build dir:     ~/builds (X projects registered)
────────────────────────────────────────────────────
Ready for Slack:  YES / NO — <what's missing>
```

**If everything is green:**
```
Mac mini is fully configured and ready.

  1. Run verification checks
  2. Reconfigure Slack
  3. Full setup (re-run everything)
  4. Exit
>
```

**If something is missing**, tell the user exactly what needs to happen:
```
Missing 2 items before Slack bot can work:

  [MISSING] Claude Code CLI — needed to run builds
  [MISSING] Slack .env — bot tokens not configured

The setup will walk you through fixing these. Proceed? (Y/n)
```

Then skip phases that are already complete and only run what's needed. For example, if system tools are all installed but Slack isn't configured, jump straight to Phase 2.

---

## Phase 1: System Prerequisites

**Skip this phase if pre-flight showed all system tools are installed.** Otherwise, install everything that's missing. These are all required — install them automatically, do not ask.

```
SYSTEM CHECK
============
```

### 1.1 Homebrew

```bash
which brew
```

If missing — Homebrew is required for everything else. Install it:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Verify:** `which brew` must succeed before continuing. If it fails, stop and tell the user what went wrong.

### 1.2 Node.js 20+

```bash
node --version
```

If missing or below v20 — required for the Slack bot. Install it:
```bash
brew install node
```

**Verify:** `node --version` must show v20+. If not, stop.

### 1.3 Claude Code CLI

```bash
claude --version
```

If missing — this is the engine that runs builds. Install it:
```bash
npm install -g @anthropic-ai/claude-code
```

**Verify:** `claude --version` must succeed.

Then check authentication:
```bash
claude --print "echo hello" 2>&1
```

If not authenticated, this is a **blocker** — the user must authenticate interactively:
```
Claude Code is installed but not authenticated.
You need to log in before builds can run.

Please run this command now:  claude auth login

I'll wait — press Enter when you're done.
```

Wait for user to press Enter. Then **re-check** authentication. If still not authenticated, repeat the instruction. Do not proceed until auth is confirmed.

### 1.4 Git + SSH

```bash
git --version
ssh -T git@github.com 2>&1
```

Git is pre-installed on macOS. If somehow missing: `brew install git`

If GitHub SSH is not configured — this is a **blocker** for pushing code. Generate a key automatically:
```bash
ssh-keygen -t ed25519 -C "mac-mini-agent" -f ~/.ssh/id_ed25519 -N ""
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Show the public key and instruct:
```
GitHub SSH key generated. You need to add it to your GitHub account:

1. Copy the key above
2. Go to https://github.com/settings/keys
3. Click "New SSH key", paste it, save

Press Enter when done.
```

Wait for user. Then **re-check**: `ssh -T git@github.com 2>&1`. If it still fails, repeat the instruction. Do not proceed until SSH works.

### 1.5 tmux

```bash
which tmux
```

If missing — required for agent team builds. Install it:
```bash
brew install tmux
```

**Verify:** `which tmux` must succeed.

### 1.6 Tailscale (remote access)

```bash
which tailscale
```

If missing — required for remote SSH access from your MacBook. Install it:
```bash
brew install tailscale
```

After install, check if connected:
```bash
tailscale status 2>&1
```

If not connected:
```
Tailscale is installed but not connected to your network.

Please run this command now:  tailscale up

I'll wait — press Enter when you're done.
```

Wait for user. **Re-check** `tailscale status`. If not connected, repeat. Also remind:
```
Your MacBook also needs Tailscale installed to connect remotely.
```

### 1.7 mx-workflow Plugin

Check if mx-workflow is registered as a Claude Code plugin:
```bash
claude plugin list 2>&1
```

If not found, look for the repo locally. If found but not registered, register it automatically. If the repo is not cloned at all:
```
mx-workflow is not found on this machine.
Cloning from GitHub...
```
```bash
git clone https://github.com/joshtune/mx-workflow.git ~/mx-workflow
```

Then register it as a plugin.

**Verify:** mx-workflow must appear in `claude plugin list`.

### 1.8 Phase 1 Gate

Re-run ALL checks from 1.1–1.7 to confirm everything is installed and working:

```
PHASE 1 VERIFICATION
=====================
Homebrew:       PASS (4.2.0)
Node.js:        PASS (v22.1.0)
Claude Code:    PASS (v2.1.35) — authenticated
Git:            PASS (2.44.0)
GitHub SSH:     PASS
tmux:           PASS (3.4)
Tailscale:      PASS — connected
mx-workflow:    PASS (v1.17.0)
────────────────────────────────
Phase 1:        ALL CLEAR — proceeding to Slack integration
```

If ANY item shows FAIL, **do not proceed**. Show the failure and attempt to fix it again. Only move to Phase 2 when Phase 1 is fully green.

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

### 2.3 Collect and Verify Tokens

Ask for each token one at a time. **Validate each immediately** — do not collect all three and hope they work.

**Bot Token:**
```
Paste your Bot Token (xoxb-...): >
```

Validate format (starts with `xoxb-`). Then **immediately verify** it works:
```bash
curl -s -H "Authorization: Bearer $TOKEN" https://slack.com/api/auth.test
```

If `"ok": true` — token is valid. Show: `Bot Token: VALID (workspace: <team_name>)`
If `"ok": false` — token is bad. Show the error and ask them to paste again. Do not proceed with a bad token.

**App Token:**
```
Paste your App Token (xapp-...): >
```

Validate format (starts with `xapp-`). Store it — this one can't be verified with a simple API call, but format validation catches most errors.

**Signing Secret:**
```
Paste your Signing Secret: >
```

Validate it's a hex string (32+ chars). Store it.

### 2.4 Auto-Detect Bot User ID

Use the already-verified bot token to fetch the user ID:
```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test
```

Parse `user_id` from the JSON response. This must succeed — we already verified the token. Show: `Bot User ID: <id>`

### 2.5 Write .env and Install Dependencies

Write `slack-bot/.env` with all collected values. Auto-detect paths — do not ask unless detection fails:

- `MX_PLUGIN_DIR` = the directory where this command is running from (the mx-workflow repo)
- `MX_WORK_DIR` = `~/builds`
- `MX_LOG_DIR` = `~/builds/.logs`

Create directories:
```bash
mkdir -p ~/builds/.logs
```

Install bot dependencies:
```bash
cd <mx-workflow>/slack-bot && npm install
```

**Verify:** `ls slack-bot/node_modules/@slack/bolt` must exist. If npm install failed, show the error and retry.

### 2.6 Test Slack Connection

Start the bot briefly to verify it can connect:
```bash
timeout 10 node index.js 2>&1
```

Check output for "mx-workflow Slack bot is running".

If it connects: `Slack connection: PASS`

If it fails, diagnose:
- "invalid_auth" → bot token is wrong, ask user to re-paste
- "not_authed" → app token is wrong, ask user to re-paste
- Connection timeout → network issue, check if the Mac mini has internet access
- Other error → show the full error message

**Do not proceed until the bot successfully connects to Slack.**

### 2.7 Verify #builds Channel

Use the bot token to check if a #builds channel exists and the bot is a member:
```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  "https://slack.com/api/conversations.list?types=public_channel&limit=200"
```

Search the response for a channel named "builds".

If it exists and bot is a member: `#builds channel: READY`

If it exists but bot is NOT a member:
```
The #builds channel exists but the bot isn't in it.
Please invite @mx-bot to #builds in Slack.
Press Enter when done.
```

Wait. **Re-check** membership. Repeat until confirmed.

If it doesn't exist:
```
No #builds channel found. Create it in Slack and invite @mx-bot.
Press Enter when done.
```

Wait. **Re-check.** Repeat until the channel exists and the bot is in it.

### 2.8 Phase 2 Gate

```
PHASE 2 VERIFICATION
=====================
Bot Token:       VALID (workspace: <name>)
App Token:       CONFIGURED
Signing Secret:  CONFIGURED
Bot User ID:     <id>
.env file:       WRITTEN
Dependencies:    INSTALLED
Slack connection: PASS
#builds channel: READY (bot is a member)
────────────────────────────────
Phase 2:         ALL CLEAR — proceeding to project registration
```

If ANY item shows FAIL, **do not proceed**. Fix it first.

---

## Phase 2.5: Write Build Config

Write a minimal `.mx-mac-mini.json` to the slack-bot directory. Projects will be registered automatically after each build completes.

```
Where should new projects be created?
(default: ~/builds) >
```

```bash
mkdir -p ~/builds
```

```json
{
  "version": "1.0",
  "new_project_dir": "/Users/josh/builds",
  "projects": {}
}
```

---

## Phase 3: Daemon Setup

Set up the Slack bot to run automatically on boot and restart on crash.

### 3.1 Configure launchd

Update the plist with the actual username and paths:

```bash
sed -i '' "s/YOUR_USERNAME/$USER/g" <mx-workflow>/slack-bot/com.joshtune.mx-workflow-slack-bot.plist
```

### 3.2 Create Wrapper Script

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

### 3.3 Install Daemon

```bash
cp <mx-workflow>/slack-bot/com.joshtune.mx-workflow-slack-bot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.joshtune.mx-workflow-slack-bot.plist
launchctl start com.joshtune.mx-workflow-slack-bot
```

### 3.4 Verify Daemon

```bash
launchctl list | grep mx-workflow
```

If running: `Daemon: RUNNING (PID <pid>)`

If NOT running — diagnose immediately:
```bash
cat ~/builds/.logs/slack-bot-error.log 2>/dev/null | tail -10
```

Common fixes:
- "Cannot find module" → `npm install` in slack-bot dir, then restart daemon
- "invalid_auth" → token in .env is wrong, re-run Phase 2 token collection
- Path errors → plist has wrong username, re-run `sed` from 4.1

Attempt the fix, then restart:
```bash
launchctl stop com.joshtune.mx-workflow-slack-bot
launchctl start com.joshtune.mx-workflow-slack-bot
```

**Re-check.** Do not proceed until the daemon is running.

### 3.5 Phase 3 Gate

```
PHASE 3 VERIFICATION
=====================
launchd plist:   INSTALLED
start.sh:        EXECUTABLE
Daemon:          RUNNING (PID <pid>)
────────────────────────────────
Phase 3:         ALL CLEAR — proceeding to verification
```

---

## Phase 4: End-to-End Verification + Summary

**Do not show "setup complete" unless everything actually works.** Run every critical check.

### 4.1 Slack Bot Health Check

```bash
launchctl list | grep mx-workflow
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test | grep ok
```

### 4.2 Claude Code Readiness

```bash
claude --print --dangerously-skip-permissions "echo 'Mac mini agent ready'" 2>&1
```

### 4.3 Build Directory

```bash
ls ~/builds 2>/dev/null
cat slack-bot/.mx-mac-mini.json
```

### 4.4 Report

If ALL checks pass:

```
MAC MINI SETUP COMPLETE — ALL VERIFIED
=======================================

System:
  Homebrew:     PASS (4.2.0)
  Node.js:      PASS (v22.1.0)
  Claude Code:  PASS (v2.1.35) — authenticated
  Git + SSH:    PASS — GitHub connected
  tmux:         PASS (3.4)
  Tailscale:    PASS — connected as <hostname>
  mx-workflow:  PASS (v1.17.0)

Slack:
  Bot Token:    PASS — connected to <workspace>
  #builds:      PASS — bot is a member
  Daemon:       PASS — running (PID <pid>, auto-restarts, starts on boot)

Builds:
  New projects:  ~/builds
  Projects:      (none yet — projects register automatically after each build)

Your Mac mini is ready. Chat with it in Slack:

  @mx-bot I want to build a task management app
  @mx-bot let's add dark mode to task-manager
  /build <anything>

Projects are named automatically after each build and can be
referenced in future conversations (e.g., "task-manager: add export").

Remote access:
  ssh <user>@<tailscale-hostname>
  ssh <mini> "tail -f ~/builds/.logs/slack-bot.log"
```

If ANY check fails:

```
MAC MINI SETUP INCOMPLETE
=========================

PASSED: X/Y checks
FAILED: Z checks

  [FAIL] <what failed> — <how to fix>

Fix the above and run /mx:setup-mac-mini again to re-verify.
```

**Never say "complete" when something is broken.**

---

## Re-running Setup

If setup has been run before, detect existing state and offer targeted options:

```
Mac mini is already configured. What would you like to do?

  1. Full setup (re-run everything)
  2. Reconfigure Slack integration
  3. Reinstall daemon
  4. Run verification checks only
  5. Exit

>
```
