---
description: "Research whether a ticket, bug, or feature is feasible in this codebase before planning"
argument-hint: "[ticket id | description | --file <path>]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Task"]
---

# Feasibility Research

Answer "can this be done here, and what will get in the way?" before any plan is written. Delegates the code reading to `mx-feasibility-researcher` and keeps only its short verdict, so the main session stays lean.

**Task:** $ARGUMENTS

## Instructions

### Step 1: Resolve the Task

From `$ARGUMENTS`:
- `--file <path>` → read the ticket or PRD from that file
- A ticket ID (e.g. `EIT-25`) → fetch it with the project's tracker tooling if available (Linear via MCP, `gh issue view`); otherwise ask the user to paste the text
- Free text → use as the task description

Extract acceptance criteria if the ticket has them and number them `AC1…ACn`. If it has none, note "no acceptance criteria" — `/mx:verify` will need them later.

### Step 2: Choose a Slug

Use the ticket ID if there is one; otherwise the current branch name; otherwise a short kebab-case summary. All artifacts for this task share this slug.

### Step 3: Run the Researcher

Launch `mx-feasibility-researcher` via the Task tool. Pass the task text, the acceptance criteria, and the project directory. Do **not** read the codebase yourself — that is the point of delegating.

### Step 4: Save and Report

Save the researcher's report to `.agents/feasibility/{slug}.md` (create the directory if needed; overwrite an earlier report for the same slug).

Display:

```
FEASIBILITY
===========
Task:       <one line>
Verdict:    <FEASIBLE | FEASIBLE WITH RISKS | NOT FEASIBLE | NEEDS CLARIFICATION>
Confidence: <n>/10

Risks / blockers:
  - <risk> — <mitigation or "blocks: why">

Verification route:
  Unit: <…>   Browser: <…>   Coverage: <…>

Open questions:
  - <question>

Saved: .agents/feasibility/{slug}.md
```

### Step 5: Next Step

| Verdict | Suggest |
|---|---|
| FEASIBLE / FEASIBLE WITH RISKS | `/mx:plan` — it will reuse this report |
| NEEDS CLARIFICATION | Ask the open questions now, then re-run |
| NOT FEASIBLE | Stop. Show the blocker and ask how the user wants to proceed |

## Important

- Read-only with respect to the project — the only file written is the report under `.agents/feasibility/`
- Never downgrade a NOT FEASIBLE verdict to keep the pipeline moving
- If the researcher cannot cite `file:line` for a claim, it must say the claim is unverified
