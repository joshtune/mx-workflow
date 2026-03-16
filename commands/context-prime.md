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

1. Parse the target directory from remaining arguments (same rules as Step 1 — default to project root if none given).
2. **Discover candidate directories** — use Glob to find all immediate child directories of the target. Exclude:
   - `node_modules`, `.git`, `.svn`, `dist`, `build`, `.next`, `.svelte-kit`, `.nuxt`, `coverage`, `__pycache__`, `.venv`, `vendor`
   - Any directory that already has a `.claude/context.local.md` (already primed — skip unless stale)
   - Hidden directories (starting with `.`) except `.claude`
3. **Triage each candidate** — for each directory, do a quick scan:
   - Count source files (code files, not assets/images/fonts)
   - Count inbound imports (Grep for the directory name in `import`/`require` statements outside itself)
   - Check for gotcha signals: `HACK`, `WORKAROUND`, `FIXME`, `XXX` comments
   - Assign a **complexity score**: `source files + (inbound imports × 2) + (gotcha signals × 3)`
4. **Filter** — only prime directories with a complexity score **≥ 5**. This skips trivial directories (e.g., a `utils/` with 2 files and no consumers).
5. **Show the plan and confirm** — display the list of directories that will be primed vs skipped:
   ```
   RECURSIVE PRIME PLAN
   =====================
   Will prime ({count}):
     {dir}  — {score} ({files} files, {imports} consumers, {signals} gotchas)
     ...

   Skipping ({count}):
     {dir}  — score {score} (below threshold of 5)
     ...

   Proceed?
   ```
   Wait for user confirmation. If declined, stop.
6. **Run the full prime flow** (Steps 1–7) for each qualifying directory, one at a time. Between directories, output a short progress line: `[{n}/{total}] Priming {dir}...`
7. After all directories are processed, output a combined summary:
   ```
   RECURSIVE PRIME COMPLETE
   ========================
   Target:        {root target path}
   Primed:        {count} directories
   Skipped:       {count} directories (below complexity threshold)
   Context files: {list of created/updated paths}
   ```
   Then **stop** — do not run the single-directory flow.

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
