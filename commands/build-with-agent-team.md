---
description: "Build using Claude Code Agent Teams with tmux split panes"
argument-hint: "<plan-path> [num-agents]"
allowed-tools: ["Bash", "Read"]
---

# Build with Agent Team

Coordinate a build using Claude Code Agent Teams — multiple Claude instances working in parallel, communicating with each other, and following a contract-first protocol.

**Plan path**: $ARGUMENTS

## Prerequisites

Agent Teams require Claude Code v2.1.32+ (`claude --version` to check).

1. **Experimental flag** enabled in `~/.claude/settings.json`:
   ```json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```
2. **For split-pane mode** (optional but recommended):
   - **tmux**: install via your system's package manager (`tmux -V` to check)
   - **iTerm2**: install the `it2` CLI and enable Python API in iTerm2 → Settings → General → Magic → Enable Python API
   - Split-pane mode is NOT supported in VS Code's integrated terminal, Windows Terminal, or Ghostty

If the experimental flag is not enabled, tell the user and stop.

## Display Modes

Agent Teams support two display modes. Choose based on environment:

| Mode | How it works | Requirements |
|------|-------------|--------------|
| **In-process** (default) | All teammates run inside your main terminal. Use **Shift+Down** to cycle through teammates. | Any terminal |
| **Split panes** | Each teammate gets its own pane — full visibility of all output at once. | tmux or iTerm2 |

The default is `"auto"` — uses split panes if already inside tmux, in-process otherwise.

To override, set `teammateMode` in `~/.claude.json`:
```json
{ "teammateMode": "in-process" }
```

Or pass per-session:
```bash
claude --teammate-mode in-process
```

**Recommendation**: Use split panes (`tmux`) for builds where you want to visually monitor all agents simultaneously.

## Keyboard Controls

| Shortcut | Action |
|----------|--------|
| **Shift+Down** | Cycle through teammates (wraps back to lead after last teammate) |
| **Enter** | View a teammate's session (in-process mode) |
| **Escape** | Interrupt a teammate's current turn |
| **Ctrl+T** | Toggle the shared task list |

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

**Sizing guidance**: Start with 3–5 teammates. Aim for 5–6 tasks per teammate. Beyond 5 teammates, coordination overhead increases and returns diminish. Three focused teammates often outperform five scattered ones.

**Token cost awareness**: Each teammate has its own context window and consumes tokens independently — costs scale linearly with team size. Only scale up when the work genuinely benefits from parallelism.

**QA teammate (always included):** In addition to the implementation agents above, a dedicated QA teammate is always spawned using the `mx-quality-keeper` agent persona. This agent does not count toward the implementation team size — if you determine 3 agents, the team will be 3 builders + 1 QA. The QA agent's sole job is to verify completed work and route failures back to owning agents.

For each implementation agent define:
1. **Name**: Short, descriptive (e.g., "frontend", "backend")
2. **Ownership**: What files/directories they own exclusively
3. **Does NOT touch**: What's off-limits (prevents conflicts)
4. **Key responsibilities**: What they're building
5. **Model** (optional): Specify a model per teammate if needed (e.g., "Use Sonnet for each teammate")
6. **Validation checklist**: What they must verify before reporting done
7. **QA verification tasks**: What the QA agent will check for this agent's deliverables

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

### Require Plan Approval for Risky Agents

For complex or risky components, require plan approval before implementation:

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

When a teammate finishes planning, it sends a plan approval request to the lead. The lead reviews and either approves or rejects with feedback. Rejected teammates stay in plan mode, revise, and resubmit.

**Influencing approval criteria**: Tell the lead what to check — e.g., "only approve plans that include test coverage" or "reject plans that modify the database schema."

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
- Send it to the lead via message BEFORE writing implementation code
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

### Spawn the QA Teammate

After all implementation agents are spawned and their contracts verified, spawn the QA agent:

```
You are the QA agent for this build. You follow the mx-quality-keeper persona.

## Your Role
- You verify ALL completed work before tasks can close
- You run quality checks (lint, types, tests) against every completed task
- You verify contract conformance — does implementation match agreed interfaces?
- You route failures back to owning agents with specific details
- You have authority to block task completion

## You Do NOT
- Write production code
- Implement features
- Modify any source files (read-only access to the codebase)

## Verification Protocol
When a teammate marks a task as complete:
1. Run quality checks on the changed files (lint, type-check, tests)
2. Check for new lint/type suppressions without justification
3. Verify contract conformance — compare implementation against the agreed contract
4. Verify spec conformance — does the implementation match the PRD/plan requirements? Check that the feature actually exists, is wired up, and behaves as specified. Report PASS/FAIL/MISS for each requirement.
5. PASS → confirm task completion to the lead
6. FAIL → message the owning agent with a QA FAILURE block (task, check, file:line, required fix)

## Rejection Loop
- Maximum 3 attempts per failure
- Attempt 1: Route failure details to owning agent
- Attempt 2: Route with additional context on why the previous fix didn't resolve it
- Attempt 3: Final attempt warning
- After 3 failures: Escalate to the lead with full history

## After All Tasks Complete
Run integration checks:
1. Can the system start? (no startup errors)
2. Do cross-boundary calls connect? (frontend URLs match backend endpoints)
3. Produce a final QA REPORT for the lead

## Project Quality Commands
Detect from CLAUDE.md or project config (same detection as /mx:validate).
```

### Context & Permissions

- **Context**: Teammates load CLAUDE.md, MCP servers, and skills automatically — but they do NOT inherit the lead's conversation history. Include all task-specific context in the spawn prompt.
- **Permissions**: Teammates start with the lead's permission settings. You can change individual teammate modes after spawning, but not at spawn time.

## Step 5: Enter Delegate Mode

You are the **lead**. You should NOT implement code yourself — only coordinate.

Use **Shift+Down** to cycle through teammates and message them directly. In split-pane mode, click into a pane to interact with that teammate's session.

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

### Phase 2.5: Continuous QA (during implementation)

The QA agent runs continuously during Phase 2, verifying tasks as agents complete them:

| Event | QA Action |
|-------|-----------|
| Agent marks task complete | QA runs quality checks on changed files + contract conformance |
| QA finds failure | QA messages owning agent with `QA FAILURE` details, task reverts to in-progress |
| Agent re-submits after fix | QA re-verifies (attempt N of 3) |
| 3 attempts exhausted | QA escalates to lead with `QA ESCALATION` and full history |
| All tasks pass QA | QA sends final summary to lead, Phase 3 begins |

The QA agent does NOT block implementation — agents continue working on other tasks while QA verifies completed ones. QA only blocks the specific task that failed verification.

### Communication Patterns

| Pattern | When to use |
|---------|------------|
| **message** | Send to one specific teammate (e.g., "tell the backend agent to add a new endpoint") |
| **broadcast** | Send to ALL teammates simultaneously. Use sparingly — costs scale with team size |

### Task Management

The shared task list coordinates work across the team:

- **Task states**: pending → in progress → completed
- **Dependencies**: Tasks can depend on other tasks. A pending task with unresolved dependencies cannot be claimed until those dependencies are completed. When a dependency completes, blocked tasks unblock automatically.
- **Assignment**: The lead can assign tasks explicitly, or teammates can **self-claim** the next unassigned, unblocked task on their own after finishing.
- **Race prevention**: Task claiming uses file locking — no two teammates can claim the same task.

**If the lead starts implementing instead of delegating**: Tell it "Wait for your teammates to complete their tasks before proceeding."

### Phase 3: Pre-Completion Contract Diff
- "Backend: what exact curl commands test each endpoint?"
- "Frontend: what exact fetch URLs are you calling?"
- Lead compares and flags mismatches BEFORE integration

### Phase 4: Cross-Review
- Each agent reviews another's integration points

## Step 7: Quality Gates with Hooks

Use hooks to enforce rules automatically when teammates finish work:

| Hook | Fires when | Use for |
|------|-----------|---------|
| **`TeammateIdle`** | A teammate is about to go idle | Exit code 2 → sends feedback and keeps the teammate working |
| **`TaskCreated`** | A task is being created | Exit code 2 → prevents creation with feedback |
| **`TaskCompleted`** | A task is being marked complete | Exit code 2 → prevents completion with feedback (e.g., "run tests first") |

Configure hooks in your project's hooks config to enforce quality standards.

### QA Hook Configuration

Use `TaskCompleted` to enforce QA verification before tasks can close. Add to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Task completion requires QA verification. Message the QA agent to verify this task before marking complete.' && exit 2"
          }
        ]
      }
    ]
  }
}
```

This blocks any teammate from marking a task complete without QA verification. Exit code 2 prevents the completion and sends the feedback message.

For the QA agent specifically, use `TeammateIdle` to ensure it reports status before going idle:

```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "matcher": "qa",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Before going idle, report: (1) tasks verified, (2) tasks pending verification, (3) any outstanding failures or escalations.' && exit 2"
          }
        ]
      }
    ]
  }
}
```

## Step 8: Lead Validation (End-to-End)

After ALL agents report done AND the QA agent confirms all tasks have passed verification:

1. **QA summary clean?** Review the QA agent's final report — any unresolved failures or escalations?
2. **Can the system start?** Start all services, no startup errors
3. **Does the happy path work?** Walk through primary user flow
4. **Do integrations connect?** Frontend → Backend → Database data flow
5. **Are edge cases handled?** Empty states, error states, loading states

If validation fails:
- Identify which agent's domain contains the bug
- Re-spawn that agent with the specific issue
- Re-run validation after fix

## Step 9: Shutdown & Cleanup

### Graceful Shutdown

1. Ask each teammate to shut down: `"Ask the [role] teammate to shut down"`
2. The teammate can approve (exits gracefully) or reject with an explanation
3. Teammates finish their current request/tool call before stopping — this can take time

### Team Cleanup

After ALL teammates have shut down, ask the lead to clean up:

```
Clean up the team
```

**CRITICAL**:
- Always use the **lead** to clean up — never a teammate (their team context may not resolve correctly, leaving resources in an inconsistent state)
- Cleanup will fail if any teammates are still running — shut them all down first
- The lead can only manage **one team at a time** — clean up before starting a new team

### Storage Locations

- **Team config**: `~/.claude/teams/{team-name}/config.json` (contains `members` array with names, agent IDs, agent types)
- **Task list**: `~/.claude/tasks/{team-name}/`

## Common Pitfalls to Prevent

1. **File conflicts**: Two agents editing same file → Assign clear ownership
2. **Lead over-implementing**: You start coding → Stay in Delegate Mode
3. **Fully parallel spawn**: All agents start at once → Interface divergence
4. **Implicit contracts**: "Returns sessions" → Ambiguous. Require exact JSON shapes
5. **Orphaned cross-cutting concerns**: Streaming, URL conventions, error shapes → Explicitly assign ownership
6. **Lead not waiting**: Lead starts implementing instead of waiting → Tell it to wait for teammates
7. **Task status lag**: Teammates sometimes fail to mark tasks as completed, blocking dependent tasks → Check if work is done and update manually or nudge the teammate

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Teammates not appearing** | In in-process mode, press Shift+Down — they may be running but not visible. Check that the task warrants a team. For split panes, verify `which tmux` or that iTerm2's `it2` CLI is installed. |
| **Too many permission prompts** | Pre-approve common operations in your permission settings before spawning teammates. |
| **Teammates stopping on errors** | Check their output via Shift+Down or click their pane. Give additional instructions directly, or spawn a replacement. |
| **Lead shuts down early** | Tell the lead to keep going and wait for teammates to finish. |
| **Orphaned tmux sessions** | Run `tmux ls` then `tmux kill-session -t <session-name>` to clean up. |
| **`/resume` or `/rewind` after crash** | These do NOT restore in-process teammates. Tell the lead to spawn new teammates. |

## Limitations

- **No session resumption**: `/resume` and `/rewind` do not restore in-process teammates
- **One team per session**: Clean up the current team before starting a new one
- **No nested teams**: Teammates cannot spawn their own teams — only the lead can
- **Lead is fixed**: Cannot promote a teammate to lead or transfer leadership
- **Permissions set at spawn**: All teammates inherit lead's mode; change individually after spawning
- **Split panes**: Not supported in VS Code terminal, Windows Terminal, or Ghostty

## Agent Teams vs Sub-Agents (Task tool)

| | Sub-Agents (Task tool) | Agent Teams |
|---|---|---|
| Context | Own context window; results return to caller | Own context window; fully independent |
| Communication | Reports to main only | Teammates message each other directly |
| Coordination | Main manages all | Shared task list, self-coordination |
| Visibility | Results summarized | Each visible in own pane or via Shift+Down |
| Best for | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| Cost | Lower (results summarized back) | Higher (separate Claude instances) |

**Use sub-agents** (Task tool) for: quick isolated tasks, parallel independent work
**Use agent teams** (`/mx:build-with-agent-team`) for: full-stack features, new systems, complex integrations

## Definition of Done

1. All implementation agents report done
2. QA agent verified every task (no unresolved failures or escalations)
3. Each agent validated their domain
4. Integration points tested
5. Cross-review feedback addressed
6. Lead ran end-to-end validation
7. Quality checks pass
8. Team cleaned up (no orphaned sessions or resources)
