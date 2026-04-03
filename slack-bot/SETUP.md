# Slack Bot Setup Guide

Get the mx-workflow Slack bot running on your Mac mini in ~30 minutes.

## Prerequisites

- Mac mini with macOS (headless, SSH-accessible via Tailscale)
- Node.js 20+ (`brew install node`)
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- mx-workflow plugin installed (via `claude plugin add` or cloned locally)
- A GitHub account with SSH configured

---

## Step 1 — Create your Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it `mx-bot`, pick your workspace

### Enable Socket Mode
- **Settings → Socket Mode** → Enable → Generate an App-Level Token
- Name it `mx-socket`, scope: `connections:write`
- **Save the token** — starts with `xapp-`

### Add Bot Scopes
Go to **OAuth & Permissions → Scopes → Bot Token Scopes**, add:
```
channels:history
channels:read
chat:write
commands
groups:history
im:history
im:write
mpim:history
```

### Enable Event Subscriptions
- **Event Subscriptions** → Enable
- Subscribe to bot events:
  - `message.channels`
  - `message.groups`
  - `message.im`

### Add Slash Command
- **Slash Commands** → Create New Command
- Command: `/build`
- Short description: `Kick off an mx-workflow build`
- Usage hint: `<what to build>`

### Install to Workspace
- **OAuth & Permissions** → **Install to Workspace**
- Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Get your Signing Secret
- **Basic Information** → **App Credentials** → **Signing Secret**

---

## Step 2 — Configure the bot

```bash
cd ~/mx-workflow/slack-bot
cp .env.example .env
```

Edit `.env` and fill in:
- `SLACK_BOT_TOKEN` — your `xoxb-` token
- `SLACK_SIGNING_SECRET` — from Basic Information
- `SLACK_APP_TOKEN` — your `xapp-` token
- `SLACK_BOT_USER_ID` — run this to get it:

```bash
curl -s -H "Authorization: Bearer xoxb-YOUR-TOKEN" \
  https://slack.com/api/auth.test | jq .user_id
```

Update paths:
```
MX_PLUGIN_DIR=/Users/YOUR_USERNAME/mx-workflow
MX_WORK_DIR=/Users/YOUR_USERNAME/builds
MX_LOG_DIR=/Users/YOUR_USERNAME/builds/.logs
```

---

## Step 3 — Install dependencies & test

```bash
cd ~/mx-workflow/slack-bot
npm install

# Test run (Ctrl+C to stop)
node index.js
```

You should see:
```
mx-workflow Slack bot is running
  Listening in #builds and for @mentions
```

Go to Slack, create a `#builds` channel, invite your bot, and send a message:
```
Build a simple Express hello world API
```

Watch the terminal and Slack for output.

---

## Step 4 — Run as a daemon (survives reboots)

Update the plist file with your actual username:
```bash
sed -i '' 's/YOUR_USERNAME/'"$USER"'/g' \
  ~/mx-workflow/slack-bot/com.joshtune.mx-workflow-slack-bot.plist
```

Install and start the daemon:
```bash
cp ~/mx-workflow/slack-bot/com.joshtune.mx-workflow-slack-bot.plist \
   ~/Library/LaunchAgents/

launchctl load ~/Library/LaunchAgents/com.joshtune.mx-workflow-slack-bot.plist
launchctl start com.joshtune.mx-workflow-slack-bot
```

Verify it's running:
```bash
launchctl list | grep mx-workflow
```

---

## Step 5 — Remote access from your MacBook

Install Tailscale on both machines:
```bash
brew install tailscale
```

Then SSH into the Mac mini from anywhere:
```bash
ssh your-username@mac-mini-tailscale-hostname
```

Tail live build logs remotely:
```bash
ssh mac-mini "tail -f ~/builds/.logs/slack-bot.log"

# Or tail a specific build session
ssh mac-mini "tail -f ~/builds/.logs/<session-id>.log"
```

---

## How it works

```
You in #builds:   "Build a task management system with admin and user roles"

Slack bot:        Build started
                  > Build a task management system with admin and user roles
                  Spinning up Claude Code + mx-workflow...

                  Build log:
                  [mx] Session a3f1b2c4 started
                  [mx] Running /mx:build --auto ...
                  [mx] Inferred: Web app, SvelteKit + Supabase, auth, multi-user
                  [mx] Generating PRD with role expectations...
                  [mx] PRD committed: docs(prd): add PRD for task-management
                  [mx] Generating plan...
                  [mx] Plan committed: docs(plan): add implementation plan
                  [mx] Strategy: Agent Team (3 agents + QA)
                  [mx] Building test-first...
                  [mx] QA: spec conformance 8/8 PASS
                  [mx] QA: test coverage 8/8 features have tests
                  [mx] Running /mx:validate... PASS
                  [mx] Committed: feat(tasks): implement task-management

                  Build complete!
                  Branch: `feature/task-management`
                  PR: https://github.com/you/repo/pull/7
```

The bot uses `/mx:build --auto` which runs the full pipeline:
1. **Discovery** — infers stack, scope, and roles from the instruction + codebase
2. **PRD** — generates spec with User Roles & Expectations (each must-have gets a unique ID)
3. **Plan** — codebase-aware implementation plan
4. **Build** — test-first cycle (write test → implement → verify), auto-selects agent team or single-agent
5. **QA** — spec conformance per role, test coverage verification, structural checks
6. **Commit** — incremental commits at each phase

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bot not responding | Check `~/builds/.logs/slack-bot.log` for errors |
| `claude: command not found` | Add to PATH in `.env`: `PATH=/opt/homebrew/bin:$PATH` |
| Build hangs | SSH in and check `~/builds/.logs/<session-id>.log` |
| Slack rate limit errors | Log updates are debounced to 3s — this is expected |
| Daemon not starting | `launchctl unload ...` then `load` again; check Console.app |

---

## Updating the bot

```bash
cd ~/mx-workflow
git pull

# Restart the daemon
launchctl stop com.joshtune.mx-workflow-slack-bot
launchctl start com.joshtune.mx-workflow-slack-bot
```
