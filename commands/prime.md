---
description: "Prime agent with codebase context — reads key files, runs checks"
allowed-tools: ["Read", "Glob", "Grep", "Bash"]
---

# Prime Codebase Context

Warm up by reading project configuration, key files, and running quality checks.

## Instructions

### Step 1: Read Project Rules

Read `CLAUDE.md` at the project root (if it exists). This is the most important file — it defines commands, patterns, and conventions.

### Step 2: Detect and Read Configuration Files

Use Glob to find which of these config files exist, then read them:

**Package/dependency managers:**
- `package.json`, `pnpm-workspace.yaml`, `lerna.json`
- `Cargo.toml`, `go.mod`, `go.sum`
- `*.sln`, `*.csproj` (just list .csproj files, read the .sln)
- `pyproject.toml`, `requirements.txt`
- `Gemfile`

**Language/build config:**
- `tsconfig.json`, `tsconfig.*.json`
- `vite.config.*`, `webpack.config.*`, `rollup.config.*`
- `Makefile`, `Justfile`, `Taskfile.yml`

**Linting/formatting:**
- `biome.json`, `.eslintrc*`, `eslint.config.*`
- `.prettierrc*`, `.editorconfig`
- `rustfmt.toml`, `.golangci.yml`

**CI/CD:**
- `.gitlab-ci.yml`, `.github/workflows/*.yml`

Only read files that actually exist. Skip silently if not found.

### Step 3: Discover Key Structural Files

Use Glob to find entry points and shared code. Look for patterns like:
- `src/index.*`, `src/main.*`, `src/app.*`
- `src/lib/**/*.ts`, `src/shared/**/*`, `src/core/**/*`
- `src/types/**/*`, `src/utils/**/*`

Read up to 5 key structural files that help understand the architecture. Prefer entry points, type definitions, and shared utilities.

### Step 4: Run Quality Checks

Detect and run the project's quality check command:

| Indicator | Command |
|-----------|---------|
| `package.json` has `code-quality` script | `pnpm code-quality` or `npm run code-quality` |
| `package.json` has `lint` script | `pnpm lint` or `npm run lint` |
| `package.json` has `check` script | `pnpm check` or `npm run check` |
| `Makefile` has `check` or `lint` target | `make check` or `make lint` |
| `Cargo.toml` exists | `cargo check && cargo clippy` |
| `go.mod` exists | `go vet ./...` |
| `.sln` exists | `dotnet build` |

Run the most appropriate check. If it fails, note the errors but don't fix them — just report.

### Step 5: Report

Output a summary:

```
PRIMED
======
Project rules:    {CLAUDE.md read / not found}
Config files:     {list of configs read}
Key files:        {list of structural files read}
Quality checks:   {PASS / FAIL (N errors)}
──────────────────────────────────
Ready to work.
```

If quality checks failed, list the first few errors with file:line so they can be addressed.
