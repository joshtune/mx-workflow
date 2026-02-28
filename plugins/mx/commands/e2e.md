---
description: "End-to-end browser testing with screenshots, DB validation, and bug fixing"
argument-hint: "[url or 'auto']"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit", "Task"]
---

# End-to-End Application Testing

Run comprehensive browser-based E2E tests: research the app, launch it, test every user journey, validate database records, take screenshots, and fix issues found.

**Arguments:** $ARGUMENTS

## Pre-flight Checks

### 1. Platform Check

agent-browser requires **Linux, WSL, or macOS**:
```bash
uname -s
```
- `Linux` or `Darwin` → proceed
- Anything else → stop with: "agent-browser requires Linux, WSL, or macOS. Run this from WSL or a Linux/macOS environment."

### 2. Frontend Check

Verify the application has a browser-accessible frontend. Look for:
- A `package.json` with a dev/start script serving a UI
- Frontend framework files (pages/, app/, src/components/, index.html, etc.)
- Web server configuration

If no frontend is detected, stop with: "No browser-accessible frontend detected. E2E browser testing requires a UI. For API-only testing, use a different approach."

### 3. agent-browser Availability

```bash
which agent-browser || command -v agent-browser
```

If not found, attempt installation using the detected package manager:

- If `pnpm-lock.yaml` exists: `pnpm add -g agent-browser`
- If `yarn.lock` exists: `yarn global add agent-browser`
- If `bun.lockb` exists: `bun install -g agent-browser`
- Otherwise (npm): `npm install -g agent-browser`

Then verify: `agent-browser --version`

If installation fails or agent-browser is not available in the user's environment, stop with:
> "agent-browser is required for E2E testing but is not available in this environment. Install it globally or use a different testing approach. For details, see references/agent-browser.md in this plugin."

See `references/agent-browser.md` in this plugin for the full command reference.

## Phase 1: Parallel Research

Launch **three sub-agents simultaneously** using the Task tool:

### Sub-agent 1: Application Structure & User Journeys

> Research this codebase. Return a structured summary:
>
> 1. **How to start the application** — exact commands (install deps, run dev server), URL and port
> 2. **Authentication** — if the app has protected routes, how to create a test account or log in (check .env.example for credentials, seed data, or sign-up flow)
> 3. **Every user-facing route/page** — URL paths and what they render
> 4. **Every user journey** — complete flows (e.g., "sign up → create profile → view public page"). For each: steps, interactions, expected outcomes
> 5. **Key UI components** — forms, modals, dropdowns, drag-and-drop, toggles
>
> Be exhaustive. Testing only covers what you identify here.

### Sub-agent 2: Database Schema & Data Flows

> Research this codebase's database layer. Read `.env.example` (NOT `.env`) for connection details. Return:
>
> 1. **Database type and connection** — Postgres/MySQL/SQLite/etc. and the env var name for the connection string
> 2. **Full schema** — every table, columns, types, relationships
> 3. **Data flows per user action** — for each user-facing action, what records are created/updated/deleted and in which tables
> 4. **Validation queries** — exact queries to verify records after each action

### Sub-agent 3: Bug Hunting

> Analyze this codebase for potential bugs and issues:
>
> 1. **Logic errors** — incorrect conditionals, off-by-one, missing null checks, race conditions
> 2. **UI/UX issues** — missing error handling in forms, no loading states, broken responsive layouts, accessibility
> 3. **Data integrity risks** — missing validation, orphaned records, incorrect cascades
> 4. **Security concerns** — injection, XSS, missing auth checks
>
> Return a prioritized list with file paths and line numbers.

**Wait for all three to complete before proceeding.**

## Phase 2: Start the Application

Using Sub-agent 1's startup instructions:

1. Install dependencies if needed
2. Start the dev server in the background:
   ```bash
   # Use whatever start command was identified (npm run dev, pnpm dev, etc.)
   <start-command> &
   ```
3. Wait for the server to be ready (poll the URL or use `agent-browser wait`)
4. Open the app: `agent-browser open <url>`
5. Initial screenshot: `agent-browser screenshot e2e-screenshots/00-initial-load.png`
6. Read the screenshot to confirm the app loaded correctly

## Phase 3: Test Every User Journey

For each journey identified in Phase 1:

### 3a. Browser Testing

For each step in the journey:

1. **Snapshot** to get current refs: `agent-browser snapshot -i`
2. **Interact** using refs: `agent-browser click @eN`, `agent-browser fill @eN "text"`, etc.
3. **Wait** for the page to settle: `agent-browser wait --load networkidle`
4. **Screenshot** with descriptive path:
   ```bash
   agent-browser screenshot e2e-screenshots/<journey-name>/01-<step-description>.png
   agent-browser screenshot e2e-screenshots/<journey-name>/02-<step-description>.png
   ```
   Use zero-padded sequential numbers (01, 02, 03, etc.)
5. **Analyze the screenshot** — use the Read tool to view it. Check for visual correctness, layout issues, missing content, error states
6. **Check for JS errors** periodically: `agent-browser console` and `agent-browser errors`

**Important:** Refs become invalid after navigation or DOM changes. Always re-snapshot after page navigation, form submissions, or dynamic content updates.

### 3b. Database Validation

After any action that should modify data (form submits, deletions, updates):

1. Query the database to verify records:
   - **Postgres:** `psql "$DATABASE_URL" -c "SELECT ..."`
   - **SQLite:** `sqlite3 <db-file> "SELECT ..."`
   - **Other:** Write a small ad hoc script in the project's language, run it, then delete it
2. Verify:
   - Records created/updated/deleted as expected
   - Values match what was entered in the UI
   - Relationships between records are correct
   - No orphaned or duplicate records

### 3c. Issue Handling

When an issue is found (UI bug, database mismatch, JS error):

1. **Document it** — what was expected vs what happened, screenshot path, DB query results
2. **Fix the code** — make the correction directly
3. **Re-run the failing step** to verify the fix
4. **Take a new screenshot** confirming the fix

### 3d. Responsive Testing

After all journeys, revisit key pages at multiple viewports:

```bash
# Mobile
agent-browser set viewport 375 812
agent-browser screenshot e2e-screenshots/responsive/mobile-<page>.png

# Tablet
agent-browser set viewport 768 1024
agent-browser screenshot e2e-screenshots/responsive/tablet-<page>.png

# Desktop
agent-browser set viewport 1440 900
agent-browser screenshot e2e-screenshots/responsive/desktop-<page>.png
```

Analyze each screenshot for layout issues, overflow, broken alignment, and touch target sizes on mobile.

## Phase 4: Cleanup

1. Stop the dev server background process
2. Close the browser: `agent-browser close`

## Phase 5: Report

```
E2E TESTING COMPLETE
====================
Journeys tested:      <count>
Screenshots captured: <count>
Issues found:         <count> (<fixed> fixed, <remaining> remaining)

ISSUES FIXED
- <description> — <file:line>

REMAINING ISSUES
- <description> — <severity: high/medium/low> — <file:line>

BUG HUNT FINDINGS (from code analysis)
- <description> — <severity> — <file:line>

Screenshots: e2e-screenshots/
```

After the summary, ask:

> "Would you like me to export the full report to `e2e-test-report.md`? It includes per-journey breakdowns, all screenshot references, database validation results, and detailed findings."

If yes, write the detailed report.

## Important

- This command requires a running frontend — it cannot test APIs or CLIs
- This command requires `agent-browser` to be installed and available globally
- Screenshots go in `e2e-screenshots/` at the project root (created automatically)
- Database queries use env vars from `.env.example` patterns (never read `.env` directly)
- Fix bugs as you find them — don't just report and move on
- If the dev server fails to start, report the error and stop
- If `agent-browser` is not available, this command will fail early with installation guidance
