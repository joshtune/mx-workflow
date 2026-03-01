---
description: "Build using Claude Code Agent Teams with tmux split panes"
argument-hint: "<plan-path> [num-agents]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit"]
---

# Build with Agent Team

Coordinate a build using Claude Code Agent Teams — multiple Claude instances working in parallel via tmux split panes, communicating with each other, and following a contract-first protocol.

**Plan path**: $ARGUMENTS

## Prerequisites

Agent Teams require:
1. **tmux** installed (`tmux -V` to check)
2. **Experimental flag** enabled in `~/.claude/settings.json`:
   ```json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

If not enabled, tell the user and stop.

## Step 1: Read the Plan

Read the plan document at the provided path. Understand:
- What are we building?
- What are the major components/layers?
- What technologies are involved?
- What are the dependencies between components?

## Step 2: Determine Team Structure

If team size is specified (second argument), use that number. Otherwise, analyze the plan:

| Team Size | When |
|-----------|------|
| 2 agents | Clear frontend/backend split |
| 3 agents | Full-stack (frontend, backend, database/infra) |
| 4 agents | Complex with additional concerns (testing, DevOps) |
| 5+ agents | Large systems with many independent modules |

For each agent define:
1. **Name**: Short, descriptive (e.g., "frontend", "backend")
2. **Ownership**: What files/directories they own exclusively
3. **Does NOT touch**: What's off-limits (prevents conflicts)
4. **Key responsibilities**: What they're building
5. **Validation checklist**: What they must verify before reporting done

## Step 3: Map the Contract Chain

Before spawning, identify the interface dependency chain:

```
Database → publishes function signatures → Backend
Backend → publishes API contract → Frontend
```

Upstream agents must publish their contract BEFORE downstream agents start building.

## Step 4: Contract-First Spawning

**CRITICAL**: Agents building in parallel WILL diverge on interfaces unless they agree on contracts FIRST.

### Spawn Order (staggered, not fully parallel)

1. **Spawn upstream agents first** (e.g., database, then backend)
2. Each upstream agent's FIRST task: define and send their contract
3. **Lead receives and verifies the contract** — check for:
   - Exact URLs (with trailing slashes)
   - Exact JSON request/response shapes
   - Status codes for success and error
   - SSE event formats (if applicable)
4. **Lead forwards verified contract to downstream agents**
5. **Only then spawn downstream agents** with the contract in their prompt

### Spawn Prompt Template

```
You are the [ROLE] agent for this build.

## Your Ownership
- You own: [directories/files]
- Do NOT touch: [other agents' files]

## What You're Building
[Relevant section from plan]

## Before You Build (REQUIRED)
- Your FIRST deliverable is your [API contract / schema / interface]
- Send it to the lead via SendMessage BEFORE writing implementation code
- Wait for lead to confirm before proceeding

## The Contract You Must Conform To
[Upstream agent's verified contract]

## Cross-Cutting Concerns You Own
[Integration behaviors this agent is responsible for]

## Project Conventions
- Run quality checks after changes (see CLAUDE.md)
- Commit format: `<type>(<scope>)[${MX_TICKET_PREFIX} <ticket>] <description>`
- Co-Authored-By: ${MX_CO_AUTHOR:-Claude <noreply@anthropic.com>}

## Before Reporting Done
Run these validations and fix any failures:
1. [specific validation command]
2. [specific validation command]
Do NOT report done until all validations pass.
```

## Step 5: Enter Delegate Mode

Enter **Delegate Mode** (Shift+Tab). You should NOT implement code yourself — only coordinate.

## Step 6: Facilitate Collaboration

### Phase 1: Contracts (Sequential, Lead-Orchestrated)
- Each agent publishes contract → lead verifies → forwards downstream
- Lead verification checklist:
  - Are URLs exact, including trailing slashes?
  - Are response shapes explicit (not "returns data")?
  - Are error responses specified?

### Phase 2: Implementation (Parallel)
- Agents build in parallel after contracts verified
- They must flag any contract deviations to the lead

### Phase 3: Pre-Completion Contract Diff
- "Backend: what exact curl commands test each endpoint?"
- "Frontend: what exact fetch URLs are you calling?"
- Lead compares and flags mismatches BEFORE integration

### Phase 4: Cross-Review
- Each agent reviews another's integration points

## Step 7: Lead Validation (End-to-End)

After ALL agents report done:

1. **Can the system start?** Start all services, no startup errors
2. **Does the happy path work?** Walk through primary user flow
3. **Do integrations connect?** Frontend → Backend → Database data flow
4. **Are edge cases handled?** Empty states, error states, loading states

If validation fails:
- Identify which agent's domain contains the bug
- Re-spawn that agent with the specific issue
- Re-run validation after fix

## Common Pitfalls to Prevent

1. **File conflicts**: Two agents editing same file → Assign clear ownership
2. **Lead over-implementing**: You start coding → Stay in Delegate Mode
3. **Fully parallel spawn**: All agents start at once → Interface divergence
4. **Implicit contracts**: "Returns sessions" → Ambiguous. Require exact JSON shapes
5. **Orphaned cross-cutting concerns**: Streaming, URL conventions, error shapes → Explicitly assign ownership

## Agent Teams vs Sub-Agents (Task tool)

| | Sub-Agents (Task tool) | Agent Teams (tmux) |
|---|---|---|
| Communication | Reports to main only | Agents message each other |
| Coordination | Main manages all | Shared task list, self-coordination |
| Visibility | Results summarized | Each visible in tmux pane |
| Best for | Quick isolated tasks | Complex multi-component builds |
| Cost | Lower | Higher (separate instances) |

**Use sub-agents** (Task tool) for: quick isolated tasks, parallel independent work
**Use agent teams** (`/build-with-agent-team`) for: full-stack features, new systems, complex integrations

## Definition of Done

1. All agents report done
2. Each agent validated their domain
3. Integration points tested
4. Cross-review feedback addressed
5. Lead ran end-to-end validation
6. Quality checks pass
