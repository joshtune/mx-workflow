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

## License

MIT
