---
description: "Create PR with auto-generated summary and agent review findings"
argument-hint: "[--draft | --base <branch>]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Create Pull Request

Create a GitHub PR with an auto-generated summary, agent review findings, and a reviewer checklist.

**Arguments (optional):** $ARGUMENTS

## Instructions

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- `--draft` → create as draft PR
- `--base <branch>` → use as base branch (override auto-detection)
- Any remaining text → use as PR title override

### Step 2: Detect Base Branch

If `--base` was not provided, detect the base branch:

```bash
git remote show origin | grep 'HEAD branch' | sed 's/.*: //'
```

Fallback order: `main`, `master`, `develop`. Verify the branch exists:
```bash
git rev-parse --verify origin/<branch> 2>/dev/null
```

### Step 3: Gather Context

Run in parallel:
```bash
git branch --show-current
git log <base-branch>..HEAD --oneline
git log <base-branch>..HEAD --format="%s"
git diff <base-branch>..HEAD --stat
```

If the current branch IS the base branch, stop and tell the user: "You're on the base branch. Create or switch to a feature branch first."

If there are no commits ahead of the base branch, stop and tell the user: "No commits found ahead of <base>. Make some changes and commit first."

### Step 4: Generate PR Title

Priority order:
1. Title override from `$ARGUMENTS` (if provided, excluding flags)
2. If there is exactly one commit, use its message
3. Derive from branch name: strip prefixes like `feature/`, `fix/`, `chore/`, replace `-`/`_` with spaces, capitalize first letter

Keep the title under 70 characters.

### Step 5: Generate Change Summary

From the commit log, create 1-5 bullet points summarizing the changes. Group related commits. Focus on the "what" and "why", not individual commit messages verbatim.

### Step 6: Check for Agent Review Findings

Look for existing agent reports:
```bash
ls -la .agents/ 2>/dev/null
```

If `.agents/` exists, scan for recent reports:
- `.agents/reports/` — general reports
- `.agents/rca-reports/` — root cause analyses
- `.agents/prds/` — PRD documents

For each report found, read it and extract a brief summary (1-2 lines) of key findings. Include only reports that are relevant to the current changes (check if they reference files in the diff).

If no `.agents/` directory or no relevant reports, skip this section.

### Step 7: Check Test Status

Detect and run the project's test command (same detection as `/validate`):
1. Check `CLAUDE.md` for documented test commands
2. Detect from `package.json` scripts, `Makefile`, `Cargo.toml`, `go.mod`, `pyproject.toml`

If a test command is found, run it and capture pass/fail status. If no test command is detected, note "No automated tests detected."

### Step 8: Build PR Body

Construct the PR body using this template:

```
## Summary
<bullet points from Step 5>

## Agent Review Findings
<findings from Step 6, or "No agent reports found." if none>

## Test Status
<pass/fail result from Step 7, or "No automated tests detected.">

## Reviewer Checklist
- [ ] Code changes match the PR summary
- [ ] No unintended side effects
- [ ] Error handling is adequate
- [ ] Tests cover the changes (if applicable)

---
*Generated with [mx-workflow](https://github.com/joshtune/mx-workflow)*
```

### Step 9: Confirm with User

Show the user:
- **Base branch:** `<base>`
- **Title:** `<title>`
- **Draft:** yes/no
- **Body preview** (the full body)

Ask: "Create this PR?"

### Step 10: Ensure Branch is Pushed

```bash
git push -u origin $(git branch --show-current) 2>&1 || true
```

### Step 11: Create the PR

Build the `gh pr create` command:

```bash
gh pr create \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body from Step 8>
EOF
)" \
  --base <base-branch> \
  <--draft if requested>
```

### Step 12: Report

```
PR CREATED
==========
URL:    <PR URL from gh output>
Title:  <title>
Base:   <base-branch>
Draft:  yes/no
Status: SUCCESS
```

If `gh pr create` fails, show the error and suggest:
- Check `gh auth status` for authentication
- Verify the remote repository exists
- Try `gh pr create` manually with `--web` flag
