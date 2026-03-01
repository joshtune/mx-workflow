# mx-workflow

Development workflow plugin for [Claude Code](https://claude.com/claude-code) covering the full dev lifecycle: planning, implementation, quality checks, conventional commits, E2E testing, and multi-agent team builds.

## Installation

### Option A: Marketplace install (recommended)

Register this repo as a plugin marketplace, then install:

```bash
# 1. Add the marketplace (one-time)
/plugin marketplace add https://github.com/joshtune/mx-workflow.git

# 2. Install the plugin
/plugin install mx@joshtune-mx-workflow

# Choose scope when prompted:
#   user    → available in all projects (~/.claude/settings.json)
#   project → shared with team via .claude/settings.json
#   local   → gitignored, this machine only
```

### Option B: Clone + load per-session

```bash
# Clone the repo
git clone https://github.com/joshtune/mx-workflow.git ~/mx-workflow

# Load for current session
claude --plugin-dir ~/mx-workflow
```

This is temporary — the plugin is only available for that session.

### Option C: Clone + permanent manual config

```bash
# Clone the repo
git clone https://github.com/joshtune/mx-workflow.git ~/mx-workflow
```

Then add the path to your Claude Code settings. Edit `~/.claude/settings.json`:

```json
{
  "plugins": ["~/mx-workflow"]
}
```

### Verify installation

Once installed, type `/mx:` and you should see all commands in autocomplete.

Test with:
```
/mx:help
```

This should display the full command reference card.

## Getting Started

Once installed, here is a typical first session to get productive:

1. **Load codebase context** — Run `/mx:prime` to warm up. This reads key files and runs initial quality checks so Claude understands your project.

2. **Check project readiness** — Run `/mx:status` or `/mx:validate` to see if lint, type-checks, and tests pass. Fix any blockers before writing code.

3. **Pick a task and plan** — Run `/mx:plan` to create an implementation plan. If your task has a ticket, start with `/mx:branch <ticket> <desc>` first.

4. **Implement** — Run `/mx:implement` to execute the plan. This includes built-in validation loops and agent review.

5. **Validate** — Run `/mx:validate` to confirm lint, type-checks, and tests still pass after your changes.

6. **Commit** — Run `/mx:commit` to create a conventional commit with auto-inferred scope, type, and ticket reference.

7. **Open a PR** — Run `/mx:pr` to create a pull request with an auto-generated summary. Use `/mx:pr --draft` if it is not ready for review yet.

That is the core loop. For more complex workflows, see [Which Path Should I Use?](#which-path-should-i-use) below.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) CLI installed
- `git` configured with SSH or HTTPS access to your repos

## Usage

Commands are invoked as `/mx:<command-name>`:

```
/mx:plan                # Create an implementation plan
/mx:implement           # Execute plan with validation
/mx:e2e                 # Browser-based E2E testing
/mx:commit              # Create a conventional commit
/mx:ship                # Fix + check + commit + push
/mx:help                # Show the full command reference
```

## Configuration

All settings use environment variables with sensible defaults. Override only what you need.

Set them in your shell profile (`~/.bashrc`, `~/.zshrc`) or in `~/.claude/settings.json` under `"env"`:

```json
{
  "env": {
    "MX_TICKET_PREFIX": "PROJ",
    "MX_BRANCH_PATTERN": "feature/[^/]+/"
  }
}
```

| Variable | Purpose | Default |
|---|---|---|
| `MX_TICKET_PREFIX` | Ticket reference prefix in commits (e.g., `PROJ`) | *(none — optional)* |
| `MX_BRANCH_PATTERN` | Branch naming template for `/mx:branch` (e.g., `{type}/{ticket}-{description}`) | `{type}/{ticket}-{description}` |
| `MX_CO_AUTHOR` | Co-author line for AI commits | `Claude <noreply@anthropic.com>` |

See `.env.example` for detailed documentation on each variable.

## Commands

### Session Start

| Command | Description |
|---|---|
| `/mx:prime` | Warm up codebase context (reads key files, runs quality checks) |

### Implementation (most common path)

| Command | Description |
|---|---|
| `/mx:rca <error or symptom>` | Deep root cause analysis (5 Whys + git history) |
| `/mx:plan` | Create implementation plan with codebase analysis |
| `/mx:implement` | Execute plan with validation loops + agent review |
| `/mx:validate` | Run quality checks (lint, type-check, tests) |
| `/mx:deps [--security\|--outdated\|--unused]` | Audit dependencies for security issues and outdated versions |
| `/mx:e2e [url]` | Browser-based E2E testing (screenshots, DB validation, bug fixes) |
| `/mx:check-ignores` | Audit type/lint suppression comments |
| `/mx:branch <ticket> <desc>` | Create branch with ticket-encoded naming convention |
| `/mx:commit` | Conventional commit (auto-infers scope/type/ticket) |
| `/mx:ship [desc]` | Fix + check + commit + push in one step |
| `/mx:pr [--draft]` | Create PR with auto-generated summary and agent findings |

### Multi-Agent Team Build (complex features)

| Command | Description |
|---|---|
| `/mx:prd [idea]` | Problem-first PRD generator |
| `/mx:build-with-agent-team` | Spawn agent team in tmux (contract-first protocol) |

### Planning & Design

| Command | Description |
|---|---|
| `/mx:create-command <name>` | Create new slash commands |
| `/mx:create-rules` | Generate CLAUDE.md from codebase analysis |

### Discovery

| Command | Description |
|---|---|
| `/mx:agents` | List available agents and their purposes |

### Release

| Command | Description |
|---|---|
| `/mx:version [patch\|minor\|major\|x.y.z]` | Bump version in both manifests, update CHANGELOG, commit, and tag |

### Anytime

| Command | Description |
|---|---|
| `/mx:help` | Quick reference card for all commands |

## Agents

Seven specialized agents are included for targeted code analysis. They run automatically via commands like `/mx:implement`, or can be invoked directly via the Task tool.

| Agent | Purpose |
|---|---|
| `mx-code-reviewer` | Review code against CLAUDE.md guidelines and detect bugs |
| `mx-code-simplifier` | Simplify code for clarity while preserving functionality |
| `mx-silent-failure-hunter` | Find silent failures and inadequate error handling |
| `mx-mr-test-analyzer` | Review test coverage quality and completeness |
| `mx-comment-analyzer` | Analyze comment accuracy and long-term maintainability |
| `mx-type-design-analyzer` | Analyze type design for encapsulation and invariants |
| `mx-performance-auditor` | Analyze code for performance bottlenecks and scalability risks |

## Which Path Should I Use?

```
New session               → /mx:prime
New feature (needs spec)  → /mx:prd → /mx:plan → /mx:implement
Bug fix or small feature  → /mx:rca (if needed) → /mx:plan → /mx:implement
After implementing        → /mx:e2e (verify it works in the browser)
Complex multi-component   → /mx:prd → /mx:build-with-agent-team
Ready to open a PR        → /mx:pr (or /mx:pr --draft)
Starting a ticket         → /mx:branch <ticket> <desc> → /mx:plan → /mx:implement
Quick code change         → Just code, then /mx:ship
Mysterious bug            → /mx:rca <error message or symptom>
Tech debt cleanup         → /mx:check-ignores
Dependency health check   → /mx:deps
Need a new command        → /mx:create-command <name> <purpose>
New project setup         → /mx:create-rules (generate CLAUDE.md)
```

## Customization

### Override scope mappings

Edit `references/scope-mappings.md` to change file pattern → commit scope mappings for your project.

### Add new commands

Run `/mx:create-command <name> <purpose>` to create new commands following the established patterns.

## Updating

```bash
# If installed via marketplace
/plugin update mx@joshtune-mx-workflow

# If cloned manually
cd ~/mx-workflow && git pull
```

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Commands not showing up in autocomplete after typing `/mx:` | Plugin not installed or not loaded by Claude Code | Re-run the install step (see [Installation](#installation)) and verify with `/mx:help`. For manual installs, confirm the path in `~/.claude/settings.json` is correct and the directory exists. |
| `/mx:ship` fails on push | Git remote not configured, or SSH/HTTPS credentials missing | Run `git remote -v` to verify a remote is set. Check that your SSH key or HTTPS token is valid. If no remote exists, add one with `git remote add origin <url>`. |
| `/mx:validate` reports "no lint/test command found" | Project is missing `package.json` scripts, `Makefile` targets, or equivalent | Add `lint`, `typecheck`, and `test` scripts to your `package.json`, or the corresponding targets to your `Makefile`. `/mx:validate` discovers these automatically. |
| Environment variables (e.g., `MX_TICKET_PREFIX`) not taking effect | Variable not exported in the shell profile, or not set in Claude Code settings | Add `export MX_TICKET_PREFIX=PROJ` to `~/.zshrc` or `~/.bashrc` and restart your terminal, or set it in `~/.claude/settings.json` under the `"env"` key (see [Configuration](#configuration)). |
| Agent review passes timing out during `/mx:implement` | Codebase is very large and agents are analyzing too many files | Limit the scope by specifying which files or directories to review in your implementation plan. Break large changes into smaller, focused commits. |
| `/mx:e2e` reports "browser not found" or fails to launch | Puppeteer or Playwright is not installed, or the bundled browser binary is missing | Run `npx puppeteer install` or `npx playwright install` to download browser binaries. Ensure your project lists one of these as a dependency. |

## License

MIT
