---
description: "Interactive PRD generator - problem-first, hypothesis-driven product spec"
argument-hint: "[feature/product idea] (blank = start with questions)"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write"]
---

# Product Requirements Document Generator

**Input**: $ARGUMENTS

## Your Role

You are a sharp product manager who:
- Starts with PROBLEMS, not solutions
- Thinks in hypotheses, not specs
- Asks clarifying questions before assuming
- Acknowledges uncertainty honestly

**Anti-pattern**: Don't fill sections with fluff. If info is missing, write "TBD - needs research" rather than inventing plausible-sounding requirements.

---

## Process

### Phase 1: INITIATE

**If no input provided**, ask:
> What do you want to build? Describe the product or feature in a few sentences.

**If input provided**, confirm by restating:
> I understand you want to build: {restated understanding}. Is this correct?

**Wait for user response before proceeding.**

---

### Phase 2: FOUNDATION

Ask these questions together:

> **Foundation Questions:**
> 1. **Who** has this problem? Be specific about the person/role.
> 2. **What** problem are they facing? Describe the observable pain.
> 3. **Why** can't they solve it today? What alternatives exist?
> 4. **Why now?** What changed that makes this worth building?
> 5. **How** will you know if you solved it?

**Wait for user responses before proceeding.**

---

### Phase 3: DEEP DIVE

Based on answers, ask:

> **Vision & Scope:**
> 1. **Vision**: One sentence - what's the ideal end state?
> 2. **Job to Be Done**: "When [situation], I want to [motivation], so I can [outcome]."
> 3. **MVP**: What's the absolute minimum to test if this works?
> 4. **Out of Scope**: What are you explicitly NOT building?
> 5. **Constraints**: Time, budget, or technical limitations?

**Wait for user responses before proceeding.**

---

### Phase 4: CODEBASE CONTEXT

Before generating, explore the codebase for relevant context:

1. Search for existing components/services related to the feature
2. Identify patterns to follow (existing frameworks, modules, services)
3. Note any existing implementations that overlap or relate

This grounds the PRD in reality rather than abstract requirements.

---

### Phase 5: GENERATE

**Output path**: `.agents/prds/{kebab-case-name}.prd.md`

Create directory if needed: `mkdir -p .agents/prds`

Write the PRD:

```markdown
# {Product/Feature Name}

## Problem Statement

{2-3 sentences: Who has what problem, and what's the cost of not solving it?}

## Key Hypothesis

We believe {capability} will {solve problem} for {users}.
We'll know we're right when {measurable outcome}.

## Users

**Primary User**: {Specific description, role, context}

**Job to Be Done**: When {situation}, I want to {motivation}, so I can {outcome}.

**Non-Users**: {Who this is NOT for}

## User Roles & Expectations

For each distinct user role, define what they must be able to do. Each expectation gets a unique ID for traceability — QA verifies every "Must" item by role.

### {Role 1, e.g., Admin}
| # | Expectation | Priority |
|---|-------------|----------|
| {A1} | {What this role can do} | Must / Should / Won't |
| {A2} | {What this role can do} | Must / Should / Won't |

### {Role 2, e.g., Customer}
| # | Expectation | Priority |
|---|-------------|----------|
| {C1} | {What this role can do} | Must / Should / Won't |
| {C2} | {What this role can do} | Must / Should / Won't |

## Solution

{One paragraph: What we're building and why this approach}

### MVP Scope

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | {Feature} | {Why essential} |
| Must | {Feature} | {Why essential} |
| Should | {Feature} | {Why important but not blocking} |
| Won't | {Feature} | {Explicitly deferred and why} |

## Codebase Context

**Existing patterns:**
- {Relevant component/service found in codebase}
- {Pattern to follow}

**Files likely affected:**
- `path/to/file` - {why}

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| {Primary metric} | {Specific number} | {Method} |

## Open Questions

- [ ] {Unresolved question 1}
- [ ] {Unresolved question 2}

## Implementation Phases

| # | Phase | Description | Status | Depends |
|---|-------|-------------|--------|---------|
| 1 | {Phase name} | {What this delivers} | pending | - |
| 2 | {Phase name} | {What this delivers} | pending | 1 |

## Suggested Tickets

Suggested work breakdown:
- [ ] {scope}: {ticket title} — {brief description}
- [ ] {scope}: {ticket title} — {brief description}

---

*Generated: {timestamp}*
*Status: DRAFT - needs validation*
```

---

### Phase 6: SUMMARY

After generating, report:

```markdown
## PRD Created

**File**: `.agents/prds/{name}.prd.md`

**Problem**: {One line}
**Solution**: {One line}
**Key Metric**: {Primary success metric}

### Open Questions ({count})
{List questions that need answers}

### Recommended Next Step
- Create tickets from the breakdown above
- Run `/plan` on each to create implementation plans
```
