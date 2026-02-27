---
description: "Create implementation plan with codebase analysis"
argument-hint: "[description or ticket reference]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Task"]
---

# Codebase-Aware Implementation Plan

Create a detailed implementation plan based on the current ticket understanding or a description.

**Context:** $ARGUMENTS

## Instructions

### Step 1: Gather Context

If not already done via `/ticket`:
- Read the ticket or description
- Explore relevant codebase areas
- Identify existing patterns to follow

If `/ticket` was already run, build on that understanding.

### Step 2: Analyze Existing Patterns

For each file that needs changing:
1. Read the file and understand its structure
2. Find similar implementations in the codebase for reference
3. Note conventions: naming, error handling, test patterns, imports

### Step 3: External Research (if applicable)

If the task involves libraries, APIs, or patterns you're uncertain about:

1. **Check project docs** — Look for `docs/`, `ai_docs/`, `.agents/reference/`, or similar directories
2. **Check library versions** — Read `package.json`, `requirements.txt`, `Cargo.toml`, etc. for pinned versions
3. **Research if needed** — Use web search for:
   - Official documentation for specific library versions in use
   - Known breaking changes or migration guides
   - Best practice patterns for the framework/library combination
4. **Document what you find** — Include relevant links and version-specific notes in the plan

Skip this step for straightforward changes where the codebase already has clear patterns to follow.

### Step 4: Create the Plan

Output a structured plan:

```markdown
## Implementation Plan

### Summary
<1-2 sentences describing what we're building>

### Mandatory Reading

> Files the implementation agent MUST read before writing any code.

| File | Lines | Why |
|------|-------|-----|
| `path/to/file.ext` | 10-50 | Contains pattern to mirror |
| `path/to/file.ext` | all | Type definitions needed |

### External References (if any)

- [Library Docs - Specific Section](https://example.com/docs#section)
  Why: Required for implementing X correctly

### Changes

#### 1. <file-path>
**What:** <description of change>
**Pattern:** Follow `<reference-file>` for <specific pattern>
**Details:**
- <specific change 1>
- <specific change 2>

#### 2. <file-path>
**What:** <description>
...

### New Files (if any)
- `path/to/new-file.ext` - <purpose>

### Tests
- [ ] <test scenario 1> - in `<test-file>`
- [ ] <test scenario 2>

### Order of Operations
1. <first change - why first>
2. <second change - why second>
3. <tests>
4. <final validation>

### Validation

After each change, run quality checks (detected by `/prime` or from CLAUDE.md).

### Risks / Notes
- <anything to watch out for>

### Confidence: X/10
<Brief justification — what could cause implementation to need a second pass?>
```

### Step 5: Confirm with User

Ask: "Does this plan look right? Should I adjust anything before implementing?"

## Important

- Do NOT write code during this command - plan only
- Be specific about file paths and line numbers where possible
- Reference existing patterns by file path
- The plan should be detailed enough that `/implement` can execute it
- Consider the order of operations (what depends on what)
- Always include validation steps
- The confidence score is honest — if you're uncertain about something, say so
