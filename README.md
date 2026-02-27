# fv-workflow

Development workflow plugin for [Claude Code](https://claude.com/claude-code) covering the full dev lifecycle: planning, implementation, quality checks, conventional commits, E2E testing, and multi-agent team builds.

## Installation

### Option A: Marketplace install (recommended)

Register this repo as a plugin marketplace, then install:

```bash
# 1. Add the marketplace (one-time)
/plugin marketplace add https://gitlab.com/joshuatune/fv-workflow.git

# 2. Install the plugin
/plugin install fv@joshuatune-fv-workflow

# Choose scope when prompted:
#   user    → available in all projects (~/.claude/settings.json)
#   project → shared with team via .claude/settings.json
#   local   → gitignored, this machine only
```

### Option B: Clone + load per-session

```bash
# Clone the repo
git clone https://gitlab.com/joshuatune/fv-workflow.git ~/fv-workflow

# Load for current session
claude --plugin-dir ~/fv-workflow
```

This is temporary — the plugin is only available for that session.

### Option C: Clone + permanent manual config

```bash
# Clone the repo
git clone https://gitlab.com/joshuatune/fv-workflow.git ~/fv-workflow
```

Then add the path to your Claude Code settings. Edit `~/.claude/settings.json`:

```json
{
  "plugins": ["~/fv-workflow"]
}
```

### Verify installation

Once installed, type `/fv:` and you should see all commands in autocomplete.

Test with:
```
/fv:workflow
```

This should display the full command reference card.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) CLI installed
- `git` configured with SSH or HTTPS access to your repos

## Usage

Commands are invoked as `/fv:<command-name>`:

```
/fv:plan                # Create an implementation plan
/fv:implement           # Execute plan with validation
/fv:e2e                 # Browser-based E2E testing
/fv:commit              # Create a conventional commit
/fv:ship                # Fix + check + commit + push
/fv:workflow            # Show the full command reference
```

## Configuration

All settings use environment variables with sensible defaults. Override only what you need.

Set them in your shell profile (`~/.bashrc`, `~/.zshrc`) or in `~/.claude/settings.json` under `"env"`:

```json
{
  "env": {
    "FV_TICKET_PREFIX": "PROJ",
    "FV_BRANCH_PATTERN": "feature/[^/]+/"
  }
}
```

| Variable | Purpose | Default |
|---|---|---|
| `FV_TICKET_PREFIX` | Ticket reference prefix in commits (e.g., `PROJ`) | *(none — optional)* |
| `FV_BRANCH_PATTERN` | Regex to extract ticket # from branch (e.g., `feature/[^/]+/`) | *(none — optional)* |
| `FV_CO_AUTHOR` | Co-author line for AI commits | `Claude <noreply@anthropic.com>` |

See `.env.example` for detailed documentation on each variable.

## Commands

### Session Start

| Command | Description |
|---|---|
| `/fv:prime` | Warm up codebase context (reads key files, runs quality checks) |

### Implementation (most common path)

| Command | Description |
|---|---|
| `/fv:rca <error or symptom>` | Deep root cause analysis (5 Whys + git history) |
| `/fv:plan` | Create implementation plan with codebase analysis |
| `/fv:implement` | Execute plan with validation loops + agent review |
| `/fv:validate` | Run quality checks (lint, type-check, tests) |
| `/fv:e2e [url]` | Browser-based E2E testing (screenshots, DB validation, bug fixes) |
| `/fv:check-ignores` | Audit type/lint suppression comments |
| `/fv:commit` | Conventional commit (auto-infers scope/type/ticket) |
| `/fv:ship [desc]` | Fix + check + commit + push in one step |

### Multi-Agent Team Build (complex features)

| Command | Description |
|---|---|
| `/fv:prd [idea]` | Problem-first PRD generator |
| `/fv:build-with-agent-team` | Spawn agent team in tmux (contract-first protocol) |

### Planning & Design

| Command | Description |
|---|---|
| `/fv:create-command <name>` | Create new slash commands |
| `/fv:create-rules` | Generate CLAUDE.md from codebase analysis |

### Anytime

| Command | Description |
|---|---|
| `/fv:workflow` | Quick reference card for all commands |

## Agents

Six specialized agents are included for targeted code analysis. They run automatically via commands like `/fv:implement`, or can be invoked directly via the Task tool.

| Agent | Purpose |
|---|---|
| `fv-code-reviewer` | Review code against CLAUDE.md guidelines and detect bugs |
| `fv-code-simplifier` | Simplify code for clarity while preserving functionality |
| `fv-silent-failure-hunter` | Find silent failures and inadequate error handling |
| `fv-mr-test-analyzer` | Review test coverage quality and completeness |
| `fv-comment-analyzer` | Analyze comment accuracy and long-term maintainability |
| `fv-type-design-analyzer` | Analyze type design for encapsulation and invariants |

## Which Path Should I Use?

```
New session               → /fv:prime
New feature (needs spec)  → /fv:prd → /fv:plan → /fv:implement
Bug fix or small feature  → /fv:rca (if needed) → /fv:plan → /fv:implement
After implementing        → /fv:e2e (verify it works in the browser)
Complex multi-component   → /fv:prd → /fv:build-with-agent-team
Quick code change         → Just code, then /fv:ship
Mysterious bug            → /fv:rca <error message or symptom>
Tech debt cleanup         → /fv:check-ignores
Need a new command        → /fv:create-command <name> <purpose>
New project setup         → /fv:create-rules (generate CLAUDE.md)
```

## Customization

### Override scope mappings

Edit `references/scope-mappings.md` to change file pattern → commit scope mappings for your project.

### Add new commands

Run `/fv:create-command <name> <purpose>` to create new commands following the established patterns.

## Updating

```bash
# If installed via marketplace
/plugin update fv@joshuatune-fv-workflow

# If cloned manually
cd ~/fv-workflow && git pull
```

## License

MIT
