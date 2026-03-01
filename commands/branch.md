---
description: "Create a branch following team naming conventions"
argument-hint: "<ticket-id> <description>"
allowed-tools: [Bash, Read]
---

# Branch Creation

Create a branch following team naming conventions with auto-inferred type prefix.

**Arguments:** $ARGUMENTS

## Instructions

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- **Ticket ID** — the first argument (e.g., `EIT-29`, `PROJ-42`)
- **Description** — everything after the ticket ID (e.g., `add branch creation command`)

If no arguments are provided, ask the user for a ticket ID and description.

### Step 2: Read Branch Pattern

Check the environment variable `MX_BRANCH_PATTERN`:
```bash
echo "${MX_BRANCH_PATTERN:-{type}/{ticket}-{description}}"
```

If not set, use the default pattern: `{type}/{ticket}-{description}`

### Step 3: Infer Branch Type

Auto-infer the type prefix from the description keywords:

| Type | Keywords in description |
|---|---|
| `fix` | fix, bug, patch, hotfix, repair, resolve, crash, error, broken |
| `chore` | chore, refactor, cleanup, config, ci, docs, rename, move, update dependencies |
| `feature` | *(default for everything else)* |

### Step 4: Slugify Description

Convert the description to a branch-safe slug:
1. Convert to lowercase
2. Replace spaces and underscores with hyphens
3. Remove all characters except `a-z`, `0-9`, and `-`
4. Collapse multiple hyphens into one
5. Trim leading/trailing hyphens
6. Truncate to 50 characters max (trim at last full word if possible)

### Step 5: Build Branch Name

Replace placeholders in the pattern:
- `{type}` → inferred type (feature, fix, chore)
- `{ticket}` → ticket ID (lowercase, e.g., `eit-29`)
- `{description}` → slugified description

Example result: `feature/eit-29-add-branch-creation-command`

### Step 6: Show and Confirm

Show the proposed branch name and ask: "Create this branch?"

Include:
- Type: (inferred type and why)
- Ticket: (ticket ID)
- Description: (slugified)
- Branch: (full branch name)

### Step 7: Create Branch

```bash
git checkout -b <branch-name>
```

### Step 8: Confirm

```bash
git branch --show-current
```

Report the created branch name.
