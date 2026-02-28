---
description: "Create conventional commit with auto-inferred scope/type/ticket"
argument-hint: "[description]"
allowed-tools: ["Bash"]
---

# Conventional Commit

Create a commit following conventional commit conventions with auto-inferred metadata.

**Description (optional):** $ARGUMENTS

## Instructions

### Step 1: Gather Context

Run in parallel:
```bash
git status
git diff --cached --stat
git diff --stat
git branch --show-current
```

### Step 2: Infer Metadata

**Ticket number** - Extract from branch name:
```bash
git branch --show-current | grep -oP '${MX_BRANCH_PATTERN}\K\d+' | head -1
```

**Scope** - Infer from changed files using `references/scope-mappings.md` from this plugin.

**Type** - Infer from context using the type inference table in `references/scope-mappings.md`.

### Step 3: Stage Changes

If there are unstaged changes and nothing is staged:
```bash
git add -A
```

If some files are already staged, ask the user if they want to add more.

### Step 4: Build Commit Message

Format:
```
<type>(<scope>)[${MX_TICKET_PREFIX} <ticket>] <description>

<optional body - what changed and why>

Co-Authored-By: ${MX_CO_AUTHOR:-Claude <noreply@anthropic.com>}
```

If `$ARGUMENTS` provides a description, use it. Otherwise, summarize from the diff.

### Step 5: Show and Confirm

Show the proposed commit message and ask: "Create this commit?"

### Step 6: Create Commit

```bash
git commit -m "$(cat <<'EOF'
<formatted message>
EOF
)"
```

### Step 7: Verify

```bash
git log -1 --oneline
```

Report the commit hash and message.
