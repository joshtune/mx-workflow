---
description: "Analyze a directory and create a local context file with non-obvious behavioral notes"
argument-hint: "<path> [--learn] [--recursive]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Write", "Edit", "AskUserQuestion"]
---

# Context Prime

Analyze a directory and create a `.claude/context.local.md` file capturing non-obvious module knowledge — hidden coupling, framework quirks, gotchas, and constraints that aren't evident from code alone.

**Input**: $ARGUMENTS

## Instructions

### Step 0: Check for --learn Flag

If `$ARGUMENTS` contains `--learn`:

1. Parse the target directory from remaining arguments (same rules as Step 1 — default to project root if none given).
2. Check if `.claude/context.local.md` exists for that directory.
   - If it **does not exist**, run the full prime flow first (Steps 1–7), then continue below.
3. Prompt the user: *"What went wrong or surprised you in this directory during this session?"*
4. Take the response and merge it into the existing context file under the most appropriate section (`Gotchas`, `Do Not Touch`, or `Verify`).
   - Prefix each learned entry with the current month: `[YYYY-MM] ...`
   - **Never delete existing entries** — only add or refine.
   - If the file would exceed 40 lines after merging, prune the least-useful existing entries to stay within the cap.
5. Report what was added and which section it was merged into, then **stop** — do not run the remaining steps.

If `$ARGUMENTS` does **not** contain `--learn`, proceed normally.

### Step 0.5: Check for --recursive Flag

If `$ARGUMENTS` contains `--recursive`:

1. Parse the target directory from remaining arguments (same rules as Step 1 — default to project root if none given). Verify the directory exists. If not, report the error and stop.

#### Phase 1: Deep Discovery

Find **module boundaries** across the full tree by running these Glob calls (in parallel where possible):

- `**/index.{ts,tsx,js,jsx,svelte,vue,py,go,rs,cs,rb}`
- `**/package.json`
- `**/Cargo.toml`, `**/go.mod`, `**/pyproject.toml`

Extract the unique parent directory of each matched file = **candidate set**.

**Exclude** any candidate whose path contains any of these segments:
`node_modules`, `.git`, `dist`, `build`, `.next`, `.svelte-kit`, `.nuxt`, `coverage`, `__pycache__`, `.venv`, `vendor`, `target`
Also exclude hidden directories (starting with `.`) except `.claude`.

**Already primed** — Glob for `**/.claude/context.local.md`. Any directory that already has a context file is excluded from candidates and counted separately.

If zero candidates remain after exclusions, output `"No module boundaries detected. Nothing to prime."` and **stop**.

#### Phase 2: Batched Scoring

Run **two project-wide Greps** (not per-candidate):

1. **Inbound imports**: pattern `(import|require|from)\s+['"]` — for each match, determine which candidate directory (if any) is referenced by the import path. Count inbound imports per candidate.
2. **Gotcha signals**: pattern `(HACK|WORKAROUND|FIXME|XXX)` — partition matches by which candidate directory the match file falls under. Count signals per candidate.

Also, for each candidate, count its source files and note whether it was discovered via an index file, a config file (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`), or both.

**Scoring formula** per candidate:
```
score = min(source_files, 10)
      + (has_index × 3)
      + (has_config × 3)
      + min(inbound_imports × 2, 10)
      + min(gotcha_signals × 3, 9)
```

**Threshold**: score **≥ 5**. Discard candidates below this.

Sort remaining candidates by score descending. **Cap at 20 directories.** Any candidates beyond the cap are "deferred".

If zero candidates meet the threshold, show the plan (noting nothing qualifies) and **stop**.

#### Phase 3: Confirmation

Display the plan and wait for user confirmation:

```
RECURSIVE PRIME PLAN
=====================
Target: {path}

Will prime ({count}, by priority):
  1. src/auth     score:18  (12 files, 5 consumers, 2 gotchas) [index,config]
  2. src/api      score:14  (8 files, 3 consumers, 1 gotcha)   [index]
  ...

Skipping ({count}): below threshold of 5
Deferred ({count}): over cap of 20 — run again to continue
Already primed ({count})

Proceed?
```

If declined, stop.

#### Phase 4: Sequential Full-Quality Analysis

Run the **full prime flow** (Steps 1–7) for each qualifying directory, **one at a time**. No lighter analysis — each directory gets the complete treatment:
- Up to 8 key files read
- Full dependency tracing
- Full enforcement audit
- Full CLAUDE.md overlap check
- Full 40-line context file

Sequential processing lets cumulative understanding build — priming `src/auth` informs the analysis of `src/api` if they're related.

Output progress between directories:
```
[1/8] Priming src/auth...
[2/8] Priming src/api...
```

#### Phase 5: Combined Summary

After all directories are processed, output:

```
RECURSIVE PRIME COMPLETE
=========================
Target:         {path}
Primed:         {count} directories
Skipped:        {count} (below threshold)
Deferred:       {count} (over cap of 20)
Already primed: {count}

Context files:
  src/auth/.claude/context.local.md      (32 lines, 5 consumers)
  src/api/.claude/context.local.md       (28 lines, 3 consumers)
  ...

Top findings:
  - src/auth: session token storage has hidden coupling to middleware
  - src/api: rate limiter config is env-dependent, not in types
```

Then **stop** — do not run the single-directory flow.

#### Edge Cases

| Case | Handling |
|------|----------|
| No module boundaries found | `"No module boundaries detected. Nothing to prime."` Stop. |
| All below threshold | Show plan, note nothing qualifies. Stop. |
| All already primed | `"All {N} dirs already have context files."` Stop. |
| >20 qualify | Top 20 by score, defer rest with note to run again. |

If `$ARGUMENTS` does **not** contain `--recursive`, proceed normally.

### Step 1: Resolve Target Directory

Parse `$ARGUMENTS` for the target path. It should be a directory path relative to the project root.

- If no argument is provided, use the project root directory.
- Verify the directory exists. If not, report the error and stop.
- If a file path is given instead of a directory, use the file's parent directory.

### Step 2: Check for Existing Context

Check if `.claude/context.local.md` already exists in the target directory.

- If it exists, read it and note what's already captured. You'll update it rather than overwrite.
- If it doesn't exist, you'll create it fresh.

### Step 3: Analyze the Module

Read and analyze the target directory to discover non-obvious patterns. Focus on things that would bite someone who hasn't worked here before.

**Discovery steps:**

1. **Map the directory** — use Glob to list all files. Note the file count, extensions, and structure.

2. **Read entry points** — find and read index files, main entry points, config files, route definitions, and the most-imported files. Read up to 8 key files.

3. **Trace dependencies** — use Grep to find:
   - What imports FROM this directory (inbound consumers — who breaks if this changes?)
   - What this directory imports from outside itself (outbound dependencies)
   - Any dynamic imports, lazy loading, or bridge registrations
   - Shared state, singletons, or global side effects

4. **Identify framework patterns** — look for:
   - Routing guards, middleware, interceptors
   - State management setup (stores, contexts, providers)
   - Build/bundling configuration specific to this module
   - CSS/styling scoping (modules, global overrides, z-index layers)
   - API contracts, service layers, or backend integration patterns

5. **Check for gotchas** — look for:
   - Files that are imported by many other modules (high fan-in = high blast radius)
   - Circular or near-circular dependencies
   - Mixed technologies (e.g., legacy JS alongside modern TS)
   - Magic strings, environment-dependent behavior
   - Initialization ordering dependencies
   - Comments containing "HACK", "WORKAROUND", "XXX", "FIXME", "careful", "do not", "must be"

### Step 3.5: Enforcement Audit

Before writing gotchas as prose, scan the target directory and project root for automated enforcement that already catches issues:

- **Lint configs** — ESLint, Biome, Stylelint rules
- **TypeScript strict mode** — `tsconfig.json` strict flags and path aliases
- **Pre-commit hooks** — husky, lint-staged, `.pre-commit-config.yaml`
- **CI pipeline checks** — `.github/workflows`, `.gitlab-ci.yml`
- **Build-time checks** — compiler flags, `svelte-check`, type-check scripts in `package.json`

**Any gotcha that is already machine-enforced must be excluded** from the context file — the tooling already prevents it.

Track the count of filtered items for the report. If nothing was filtered, stay silent (don't add noise).

### Step 4: Write the Context File

Create or update `.claude/context.local.md` in the target directory.

**Rules:**
- Maximum 40 lines — be concise, every line must earn its place
- Only include non-obvious information — skip anything clear from imports, types, or file names
- Do NOT restate what the code does — capture what you'd warn a teammate about
- Use the template below but omit empty sections entirely
- Prefix time-sensitive entries with a date: `[2026-03] ...`

**Template:**

```markdown
# Context: <module-name>

## Stack
<!-- What framework/patterns this module uses. Only if non-obvious or mixed. -->

## Key Consumers
<!-- Who imports from here? What breaks if you change this? -->

## Gotchas
<!-- Things that will bite you if you don't know them. -->

## Do Not Touch
<!-- Fragile files or patterns with hidden consumers. -->

## Verify
<!-- Commands to run after modifying this module. Prefer specific over broad. -->
```

During analysis (Step 3), discover relevant test commands, lint scopes, and build targets specific to the target directory. Populate `## Verify` with 1–3 **concrete, actionable commands** (e.g., `dotnet test --filter "Calendar"`, not `run tests`).

If updating an existing file:
- Preserve still-valid entries
- Remove entries that contradict current code
- Add newly discovered information
- Ensure the file stays under 40 lines — prune least-useful entries if needed

### Step 5: Ensure Git Exclusion

Check that `.claude/*.local*` files are excluded from git. Look in both:
- `.gitignore` at the project root
- `.git/info/exclude`

If not excluded in either location, add `**/.claude/*.local*` to `.git/info/exclude`.

### Step 6: CLAUDE.md Overlap Check

After writing the context file, grep the **project root's `CLAUDE.md`** for content that overlaps with what was just captured in the local context file.

If overlap is found, include in the report:

```
CLAUDE.md overlap detected:
- Lines {range}: "{brief description}" — now covered in {context file path}
  Consider removing from root CLAUDE.md to reduce token load.
```

If no overlap is found, omit this section entirely.

### Step 7: Report

Output a summary:

```
CONTEXT PRIMED
==============
Directory:     {target path}
Files scanned: {count}
Consumers:     {count of modules that import from here}
Context file:  {path to .claude/context.local.md} ({created | updated})
Git excluded:  {yes | added to .git/info/exclude}
Filtered:      {count} items already enforced by tooling
────────────────────────────────
Key findings:
- {1-3 bullet summary of what was captured}
```

Only include the `Filtered:` line if the count is > 0.
