---
description: "Show project status and available tools"
allowed-tools: ["Read", "Glob", "Bash"]
---

# Project Status

Detect and display available tools, configured settings, and project readiness for automated workflows.

## Instructions

### Step 1: Detect Configuration Files

Use Glob to check for:
- `CLAUDE.md` (project rules)
- `.env.example` (configuration template)
- `.env` (actual config - for reference only, never read)

### Step 2: Detect Package Manager & Quality Tools

Determine package manager from lock files:
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `bun.lockb` → bun
- `package-lock.json` → npm

Then check for available quality check commands by reading:
- `package.json` (scripts section)
- `Makefile` (targets)
- `Cargo.toml` (if Rust)
- `pyproject.toml` (if Python)
- `go.mod` (if Go)

Identify which commands are available:
- Lint/format (e.g., `pnpm lint`, `pnpm format`, `make lint`)
- Type-check (e.g., `npm run type-check`, `tsc --noEmit`)
- Test (e.g., `pnpm test`, `cargo test`, `pytest`)
- Combined quality check (e.g., `pnpm code-quality`, `make check`)

### Step 3: Detect Required Tools

Check if the following are available in the environment:
- `git` - version
- `node`/`npm`/`pnpm`/`yarn`/`bun` - versions (if applicable)
- `python` - version (if applicable)
- `cargo` - version (if applicable)
- `go` - version (if applicable)
- `docker` - version (if applicable)
- `agent-browser` - version (for E2E testing)

Only check what's relevant to the detected project type. Use `--version` or `version` flags.

### Step 4: Detect Settings

Check for mx-workflow configuration:
- `MX_TICKET_PREFIX` environment variable (via `echo` or `printenv`)
- `MX_BRANCH_PATTERN` environment variable
- `MX_CO_AUTHOR` environment variable
- Check `.claude/settings.json` for user/project/local plugin scope

### Step 5: Report

Output a comprehensive status report:

```
PROJECT STATUS
==============

PROJECT CONFIGURATION
  CLAUDE.md:             ✓ Found / ✗ Not found
  .env.example:          ✓ Found / ✗ Not found
  .env:                  ✓ Found / ✗ Not found
  Git repo:              ✓ Yes / ✗ No

PACKAGE MANAGER
  Type:                  <pnpm | npm | yarn | bun | none>
  Lock file:             <filename or none>

QUALITY TOOLS AVAILABLE
  Lint/Format:           ✓ <command> / ✗ Not configured
  Type-Check:            ✓ <command> / ✗ Not configured
  Test:                  ✓ <command> / ✗ Not configured
  Combined Check:        ✓ <command> / ✗ Not configured

REQUIRED TOOLS
  git:                   ✓ <version> / ✗ Not installed
  Node.js (if needed):   ✓ <version> / ✗ Not installed
  Python (if needed):    ✓ <version> / ✗ Not installed
  Docker (if needed):    ✓ <version> / ✗ Not installed
  agent-browser (E2E):   ✓ <version> / ✗ Not installed

MX-WORKFLOW CONFIGURATION
  MX_TICKET_PREFIX:      <value or "not set">
  MX_BRANCH_PATTERN:     <value or "not set">
  MX_CO_AUTHOR:          <value or "using default">
  Plugin scope:          <user | project | local>

READINESS
  /mx:plan:              ✓ Ready / ⚠ Partially ready / ✗ Cannot run
  /mx:implement:         ✓ Ready / ⚠ Partially ready / ✗ Cannot run
  /mx:e2e:               ✓ Ready / ⚠ Partially ready / ✗ Cannot run

NEXT STEPS
-----------
<Suggest the most relevant command to run based on the detected state>
```

### Step 6: Recommendations

Based on the detected state, suggest next steps:

- If no quality tools: "Run `/mx:plan` to identify patterns. Quality checks can be configured later."
- If git not initialized: "Initialize git with `git init` before using `/mx:commit` or `/mx:ship`."
- If agent-browser not installed but has frontend: "Install agent-browser globally to enable `/mx:e2e` testing."
- If CLAUDE.md not found: "Run `/mx:create-rules` to generate project guidelines."
- If tickets configured: "You can now use `/mx:plan` to create implementation plans with automatic ticket detection."
- If no issues: "All systems ready. Start with `/mx:plan` or `/mx:prime` to warm up codebase context."
