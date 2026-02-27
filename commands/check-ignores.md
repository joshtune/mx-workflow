---
description: "Audit type/lint suppression comments across the codebase"
allowed-tools: ["Grep", "Glob", "Read", "Write", "Bash"]
---

# Audit Suppression Comments

Find and evaluate all type/lint suppression comments in the codebase.

## Instructions

### Step 1: Detect Project Stack

Use Glob to detect which file types exist in the project:

| Files Found | Stack | Patterns to Search |
|-------------|-------|--------------------|
| `*.ts`, `*.tsx`, `*.js`, `*.jsx` | TypeScript/JavaScript | `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `eslint-disable-next-line`, `eslint-disable-next-line` |
| `*.svelte` | Svelte | `svelte-ignore` |
| `biome.json` | Biome | `biome-ignore` |
| `*.rs` | Rust | `#[allow(`, `#![allow(` |
| `*.py` | Python | `# noqa`, `# type: ignore` |
| `*.cs` | C#/.NET | `#pragma warning disable`, `// ReSharper disable` |
| `*.go` | Go | `//nolint` |
| `*.rb` | Ruby | `# rubocop:disable` |
| `*.java` | Java | `@SuppressWarnings` |

Only search for patterns that match the detected stack. Skip irrelevant patterns.

### Step 2: Search for Suppressions

For each relevant pattern, use Grep to find all occurrences. Collect:
- File path and line number
- The suppression comment
- The code being suppressed (read surrounding context)

### Step 3: Analyze Each Suppression

For each suppression found, determine:

1. **What error is being suppressed?** — Read the surrounding code to understand
2. **Is the suppression necessary?** — Could the underlying type/lint issue be fixed instead?
3. **Risk level:**
   - **High**: Suppresses type safety (`@ts-ignore` on unsafe casts, `#[allow(unsafe_code)]`)
   - **Medium**: Suppresses valid warnings that could hide bugs
   - **Low**: Suppresses stylistic rules or known false positives

ultrathink about each suppression before making recommendations.

### Step 4: Generate Report

Create directory: `mkdir -p .agents/reports`

Save to: `.agents/reports/suppression-audit-{YYYY-MM-DD}.md`

```markdown
# Suppression Audit - {date}

## Summary
- **Stack detected**: {languages/frameworks found}
- **Total suppressions**: X
- **Recommended to remove**: Y (fixable)
- **Recommended to keep**: Z (necessary)
- **High risk**: N

## By Category

| Pattern | Count | Removable | Keep |
|---------|-------|-----------|------|
| @ts-ignore | N | N | N |
| eslint-disable | N | N | N |
| ... | ... | ... | ... |

## Findings

### {path}:{line}
**Suppression:** `{comment}`
**Suppresses:** {what error/warning}
**Risk:** High | Medium | Low
**Recommendation:** Remove | Keep | Refactor
**Reason:** {why}
**Fix:** {how to remove it, if removable}

[...repeat for each suppression...]

## Action Items

1. [High-priority removals]
2. [Medium-priority cleanups]
3. [Items to keep with justification]
```

### Step 5: Report to User

```
Suppression Audit Complete.

File: .agents/reports/suppression-audit-{date}.md

Total: X suppressions
  Remove: Y (fixable)
  Keep:   Z (necessary)
  Risk:   N high-risk items
```
