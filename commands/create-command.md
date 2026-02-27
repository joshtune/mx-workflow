---
description: "Create new slash commands following established patterns"
argument-hint: "<command-name> <purpose description>"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write"]
---

# Create a New Command

Create a new workflow slash command: `$ARGUMENTS`

You are Claude Code creating a command for Claude Code. The agent executing the generated command has your exact capabilities:
- Task tool with subagents (Explore, fv-code-reviewer, fv-code-simplifier, etc.)
- Read, Write, Edit, Glob, Grep tools
- Bash execution
- Extended thinking for complex analysis

## Phase 0: GATE - Should This Be a Command?

**STOP and ask**: Is a slash command the right solution?

| Signal | Recommendation |
|--------|----------------|
| One-time task | Just do it directly, no command needed |
| Simple preference | Add to `CLAUDE.md` instead |
| Vague/exploratory | Use Task tool with Explore agent directly |
| Repeatable multi-step workflow | YES - create a command |

If not a command → recommend the alternative and STOP.

## Phase 1: Study Existing Patterns

Read 2-3 existing commands in this plugin to understand the conventions:

```bash
ls <plugin-dir>/commands/*.md
```

Read a simple one (validate) and a complex one (ticket or implement) to see the range.

**Key patterns to follow:**
- YAML frontmatter with `description`, `argument-hint`, `allowed-tools`
- Markdown headers for steps (### Step N: Name)
- `$ARGUMENTS` for user input
- References to agents where appropriate (fv-code-reviewer, fv-silent-failure-hunter, etc.)

## Phase 2: Design the Command

Determine:
- **Type**: Simple (like validate, < 50 lines) or complex (like ticket, multi-step)
- **Tools needed**: Which `allowed-tools` does it require?
- **Agent integration**: Should it use any of the 6 agents?
- **Output**: What does the user see when it's done?

## Phase 3: Write the Command

Save to the appropriate commands directory.

**Naming**: Use kebab-case.

**Structure for simple commands:**
```markdown
---
description: "One-line description"
argument-hint: "[args]"
allowed-tools: ["Bash"]
---

# Title

**Input:** $ARGUMENTS

## Instructions

### Step 1: ...
### Step 2: ...
```

**Structure for complex commands:**
```markdown
---
description: "One-line description"
argument-hint: "[args]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Task"]
---

# Title

**Input:** $ARGUMENTS

## Instructions

### Step 1: Gather Context
### Step 2: Do the Work
### Step 3: Validate
### Step 4: Report

## Important
- Key rules and constraints
```

## Phase 4: Validate

Before saving, check:
- [ ] Frontmatter has `description`
- [ ] `argument-hint` present if command takes input
- [ ] `allowed-tools` lists only what's needed
- [ ] Instructions are specific, not vague
- [ ] No duplication of existing commands

## Phase 5: Update Workflow Card

After creating the command, ask: "Should I add this to `/workflow`?"

## Report

```markdown
## Command Created

**File**: `commands/{name}.md`
**Usage**: `/{name} {arguments}`
**Type**: Simple / Complex

Test it: Run `/{name}` to verify.
```
